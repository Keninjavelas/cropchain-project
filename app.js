'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const mysql = require('mysql2/promise');
const { create } = require('ipfs-http-client');
const fileUpload = require('express-fileupload');
const qr = require('qrcode');

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const yaml = require('js-yaml');

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'ui/dist')));


// --- Connections ---
let db, ipfs, fabric;

const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql',
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'cropchain',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const ipfsClient = create({
    host: process.env.IPFS_HOST || 'ipfs',
    port: process.env.IPFS_PORT || 5001,
    protocol: 'http'
});


// --- Hyperledger Fabric Helper Functions (with Retry Logic) ---
async function initializeFabric() {
    const maxRetries = 5;
    const retryDelay = 10000; // 10 seconds

    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`Initializing Fabric connection (Attempt ${i + 1}/${maxRetries})...`);

            const ccpPath = path.resolve(__dirname, 'fabric-network', 'connection-org1.yaml');
            const ccpFile = fs.readFileSync(ccpPath, 'utf8');
            const ccp = yaml.load(ccpFile);

            const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
            const ca = new FabricCAServices(caInfo.url, { trustedRoots: caInfo.tlsCACerts.pem, verify: false }, caInfo.caName);

            const walletPath = path.join(process.cwd(), 'wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);

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

            const appUserIdentity = await wallet.get('appUser');
            if (!appUserIdentity) {
                console.log('Registering and enrolling application user "appUser"...');
                const adminGateway = new Gateway();
                await adminGateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } });
                const adminService = adminGateway.getClient().getCertificateAuthority();
                const secret = await adminService.register({ affiliation: 'org1.department1', enrollmentID: 'appUser', role: 'client' }, await wallet.get('admin'));
                const enrollment = await ca.enroll({ enrollmentID: 'appUser', enrollmentSecret: secret });
                const x509Identity = {
                    credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
                    mspId: 'Org1MSP', type: 'X.509',
                };
                await wallet.put('appUser', x509Identity);
                adminGateway.disconnect();
            }

            const gateway = new Gateway();
            await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });
            const network = await gateway.getNetwork('cropchainchannel');
            const contract = network.getContract('cropchain');
            
            console.log('Fabric connection initialized successfully.');
            return { gateway, network, contract };

        } catch (error) {
            console.error(`Failed to initialize Fabric on attempt ${i + 1}: ${error}`);
            if (i === maxRetries - 1) {
                throw new Error("Could not initialize Fabric connection after multiple retries.");
            }
            console.log(`Waiting ${retryDelay / 1000} seconds before retrying...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
}


// --- API Routes (Full functionality) ---
app.post('/api/upload', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }
    const file = req.files.document;
    try {
        const added = await ipfs.add(file.data);
        res.json({ success: true, ipfsHash: added.path, fileName: file.name });
    } catch (error) {
        console.error('IPFS upload error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload file to IPFS.' });
    }
});


app.post('/api/products', async (req, res) => {
    const { id, type, farmerName, description, ipfsHash, fileName } = req.body;
    if (!id || !type || !farmerName) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    try {
        const marketResponse = await axios.get(process.env.MARKET_API_URL || 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const marketPriceHash = crypto.createHash('sha256').update(JSON.stringify(marketResponse.data)).digest('hex');
        await fabric.contract.submitTransaction('CreateProduct', id, type, farmerName, marketPriceHash, ipfsHash || '');
        await db.execute('INSERT INTO products (id, type, farmer_name, description) VALUES (?, ?, ?, ?)', [id, type, farmerName, description || '']);
        if (ipfsHash && fileName) {
            await db.execute('INSERT INTO documents (product_id, ipfs_hash, file_name) VALUES (?, ?, ?)', [id, ipfsHash, fileName]);
        }
        res.status(201).json({ success: true, message: `Product ${id} created successfully.` });
    } catch (error) {
        console.error(`Failed to create product: ${error}`);
        res.status(500).json({ success: false, message: `Failed to create product: ${error.message}` });
    }
});

app.post('/api/products/:id/ship', async (req, res) => {
    try {
        await fabric.contract.submitTransaction('ShipProduct', req.params.id, req.body.newOwner);
        res.json({ success: true, message: `Product ${req.params.id} shipped to ${req.body.newOwner}.` });
    } catch (error) {
        console.error(`Failed to ship product: ${error}`);
        res.status(500).json({ success: false, message: `Failed to ship product: ${error.message}` });
    }
});

app.post('/api/products/:id/receive', async (req, res) => {
    try {
        await fabric.contract.submitTransaction('ReceiveProduct', req.params.id, req.body.newOwner);
        res.json({ success: true, message: `Product ${req.params.id} received by ${req.body.newOwner}.` });
    } catch (error) {
        console.error(`Failed to receive product: ${error}`);
        res.status(500).json({ success: false, message: `Failed to receive product: ${error.message}` });
    }
});

app.get('/api/products/:id/history', async (req, res) => {
    try {
        const result = await fabric.contract.evaluateTransaction('GetProductHistory', req.params.id);
        res.json({ success: true, history: JSON.parse(result.toString()) });
    } catch (error) {
        console.error(`Failed to get product history: ${error}`);
        res.status(500).json({ success: false, message: `Failed to get product history: ${error.message}` });
    }
});

app.get('/api/products/:id/qrcode', async (req, res) => {
    const { id } = req.params;
    const url = `${req.protocol}://${req.get('host')}/history/${id}`;
    try {
        const qrCodeImage = await qr.toDataURL(url);
        res.send(`<img src="${qrCodeImage}"/>`);
    } catch (err) {
        console.error('Failed to generate QR code:', err);
        res.status(500).send('Could not generate QR code.');
    }
});

// --- Server Initialization ---
async function startServer() {
    try {
        db = await dbPool;
        ipfs = ipfsClient;
        fabric = await initializeFabric(); // This will now wait and retry

        app.listen(PORT, HOST, () => {
            console.log(`Server running on http://${HOST}:${PORT}`);
        });

        process.on('SIGINT', async () => {
            console.log('Shutting down...');
            if (fabric && fabric.gateway) {
                await fabric.gateway.disconnect();
            }
            await db.end();
            process.exit(0);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();

