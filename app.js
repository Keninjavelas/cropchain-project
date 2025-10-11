'use strict';

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const yaml = require('js-yaml');
const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let fabricContract;
let ipfsClient;

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

// All other API endpoints remain the same...
app.post('/api/products/create', async (req, res) => {
    if (!fabricContract) return res.status(503).json({ error: 'Blockchain not initialized.' });
    try {
        await fabricContract.submitTransaction('CreateProduct', req.body.id, req.body.product, req.body.origin, req.body.owner, req.body.status);
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.toString() });
    }
});
app.get('/api/products/queryAll', async (req, res) => {
    if (!fabricContract) return res.status(503).json({ error: 'Blockchain not initialized.' });
    try {
        const result = await fabricContract.evaluateTransaction('QueryAllProducts');
        res.json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).json({ success: false, error: error.toString() });
    }
});
app.get('/api/products/:id', async (req, res) => {
    if (!fabricContract) return res.status(503).json({ error: 'Blockchain not initialized.' });
    try {
        const result = await fabricContract.evaluateTransaction('QueryProduct', req.params.id);
        res.json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).json({ success: false, error: error.toString() });
    }
});
app.post('/api/products/updateStatus', async (req, res) => {
    if (!fabricContract) return res.status(503).json({ error: 'Blockchain not initialized.' });
    try {
        await fabricContract.submitTransaction('UpdateProductStatus', req.body.id, req.body.newStatus);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.toString() });
    }
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
});

