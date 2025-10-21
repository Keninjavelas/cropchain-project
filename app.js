'use strict';

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const yaml = require('js-yaml');
const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fileUpload = require('express-fileupload');
const QRCode = require('qrcode');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

let fabricContract;
let ipfsClient;
let dbPool;

app.post('/api/connect-blockchain', async (req, res) => {
    try {
        if (fabricContract) {
            return res.json({ success: true, message: 'Already connected.' });
        }
        await initializeFabric();
        res.json({ success: true, message: 'Successfully connected to the blockchain network.' });
    } catch (error) {
        console.error(`Connect error: ${error}`);
        res.status(500).json({ success: false, error: `Failed to connect to blockchain: ${error.message}` });
    }
});

// Create product (aligned with UI)
app.post('/api/products', async (req, res) => {
    if (!fabricContract) return res.status(503).json({ message: 'Blockchain not initialized.' });
    try {
        const { id, type, farmerName, description, ipfsHash, fileName } = req.body;
        const marketPriceHash = description ? crypto.createHash('sha256').update(description).digest('hex') : '';
        const certHash = ipfsHash || '';

        await fabricContract.submitTransaction('CreateProduct', id, type, farmerName, marketPriceHash, certHash);

        // Persist minimal off-chain metadata
        if (dbPool) {
            await dbPool.execute(
                'INSERT IGNORE INTO products (id, type, farmer_name, description) VALUES (?, ?, ?, ?)',
                [id, type, farmerName, description || '']
            );
            if (certHash) {
                await dbPool.execute(
                    'INSERT INTO documents (product_id, ipfs_hash, file_name) VALUES (?, ?, ?)',
                    [id, certHash, fileName || '']
                );
            }
        }

        res.status(201).json({ success: true, message: 'Product created.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Ship product
app.post('/api/products/:id/ship', async (req, res) => {
    if (!fabricContract) return res.status(503).json({ message: 'Blockchain not initialized.' });
    try {
        const { id } = req.params;
        const { newOwner } = req.body;
        await fabricContract.submitTransaction('ShipProduct', id, newOwner);
        res.json({ success: true, message: 'Product shipped.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Receive product
app.post('/api/products/:id/receive', async (req, res) => {
    if (!fabricContract) return res.status(503).json({ message: 'Blockchain not initialized.' });
    try {
        const { id } = req.params;
        const { newOwner } = req.body;
        await fabricContract.submitTransaction('ReceiveProduct', id, newOwner);
        res.json({ success: true, message: 'Product received.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Product history
app.get('/api/products/:id/history', async (req, res) => {
    if (!fabricContract) return res.status(503).json({ message: 'Blockchain not initialized.' });
    try {
        const { id } = req.params;
        const result = await fabricContract.evaluateTransaction('GetProductHistory', id);
        const history = JSON.parse(result.toString()).map(item => ({
            // Normalize keys for the UI
            record: item.record,
            txId: item.txId || item.TxId,
            timestamp: item.timestamp || (item.Timestamp ? item.Timestamp : null)
        }));
        res.json({ history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// QR code for the product history link
app.get('/api/products/:id/qrcode', async (req, res) => {
    try {
        const url = `/api/products/${req.params.id}/history`;
        const pngBuffer = await QRCode.toBuffer(url, { type: 'png', width: 300 });
        res.setHeader('Content-Type', 'image/png');
        res.send(pngBuffer);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Query all products
app.get('/api/products/queryAll', async (req, res) => {
    if (!fabricContract) return res.status(503).json({ message: 'Blockchain not initialized.' });
    try {
        const result = await fabricContract.evaluateTransaction('QueryAllProducts');
        const products = JSON.parse(result.toString());
        res.json(products);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Upload file to IPFS
app.post('/api/upload', async (req, res) => {
    try {
        if (!ipfsClient) return res.status(503).json({ message: 'IPFS not initialized.' });
        if (!req.files || !req.files.document) return res.status(400).json({ message: 'No file provided.' });
        const file = req.files.document;

        const added = await ipfsClient.add(file.data);
        res.json({ ipfsHash: added.path || added.cid?.toString() });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'ui/dist')));

// Serve the React app for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'ui/dist/index.html'));
});

async function initializeFabric() {
    const ccpPath = path.resolve(__dirname, 'fabric-network', 'connection-org1.yaml');
    const ccp = yaml.load(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const appUserIdentity = await wallet.get('appUser');
    if (!appUserIdentity) {
        console.log('An identity for "appUser" does not exist. Enrolling now...');
        await enrollAppUser(ccp, wallet);
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: false } });
    const network = await gateway.getNetwork('cropchainchannel');
    fabricContract = network.getContract('cropchain');
    console.log('Fabric connection initialized successfully.');
}

async function enrollAppUser(ccp, wallet) {
    try {
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        // This is the key: we read the correct certificate path from the connection profile.
        const caTLSCACerts = fs.readFileSync(caInfo.tlsCACerts.path, 'utf8');
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('Enrolling admin user...');
            const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
            const x509Identity = {
                credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
                mspId: 'Org1MSP', type: 'X.509',
            };
            await wallet.put('admin', x509Identity);
        }

        const adminUser = await wallet.get('admin');
        const provider = wallet.getProviderRegistry().getProvider(adminUser.type);
        const adminUserContext = await provider.getUserContext(adminUser, 'admin');
        
        const secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: 'appUser', role: 'client' }, adminUserContext);
        const enrollment = await ca.enroll({ enrollmentID: 'appUser', enrollmentSecret: secret });
        const x509Identity = {
            credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
            mspId: 'Org1MSP', type: 'X.509',
        };
        await wallet.put('appUser', x509Identity);
        console.log('Successfully enrolled and saved "appUser" to wallet.');
    } catch (error) {
        console.error(`Failed to enroll app user: ${error}`);
        throw error;
    }
}

const PORT = 3000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}.`);
    try {
        const { create } = await import('ipfs-http-client');
        ipfsClient = create({ host: 'ipfs', port: 5001, protocol: 'http' });
        console.log('IPFS client connected.');
    } catch (error) {
        console.error('Could not connect to IPFS client:', error);
    }

    try {
        dbPool = await mysql.createPool({
            host: 'mysql',
            user: 'user',
            password: 'password',
            database: 'cropchain',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
        console.log('MySQL pool created.');
    } catch (error) {
        console.error('Could not connect to MySQL:', error);
    }
});

