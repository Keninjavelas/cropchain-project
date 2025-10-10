'use strict';

// Standard library imports
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const yaml = require('js-yaml');

// Fabric-specific imports
const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

// --- Main Application Setup ---
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the static UI from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- Global Variables ---
let fabricContract;
let ipfsClient;

// --- API Endpoints ---

// Endpoint to manually initialize the blockchain connection
app.post('/api/connect-blockchain', async (req, res) => {
    try {
        if (fabricContract) {
            return res.json({ success: true, message: 'Already connected to the blockchain.' });
        }
        await initializeFabric();
        res.json({ success: true, message: 'Successfully connected to the blockchain network.' });
    } catch (error) {
        console.error(`Failed to connect to blockchain: ${error}`);
        res.status(500).json({ success: false, error: `Failed to connect to blockchain: ${error.message}` });
    }
});

// Create a new product
app.post('/api/products/create', async (req, res) => {
    if (!fabricContract) return res.status(503).json({ error: 'Blockchain network is not initialized.' });
    const { id, origin, product, status, owner } = req.body;
    try {
        await fabricContract.submitTransaction('CreateProduct', id, product, origin, owner, status);
        res.status(201).json({ success: true, message: `Product ${id} created successfully.` });
    } catch (error) {
        console.error(`Failed to create product: ${error}`);
        res.status(500).json({ success: false, error: error.toString() });
    }
});

// Query all products
app.get('/api/products/queryAll', async (req, res) => {
    if (!fabricContract) return res.status(503).json({ error: 'Blockchain network is not initialized.' });
    try {
        const result = await fabricContract.evaluateTransaction('QueryAllProducts');
        const products = JSON.parse(result.toString());
        res.json(products);
    } catch (error) {
        console.error(`Failed to query all products: ${error}`);
        res.status(500).json({ success: false, error: error.toString() });
    }
});

// Query a single product by ID
app.get('/api/products/:id', async (req, res) => {
    if (!fabricContract) return res.status(503).json({ error: 'Blockchain network is not initialized.' });
    try {
        const result = await fabricContract.evaluateTransaction('QueryProduct', req.params.id);
        const product = JSON.parse(result.toString());
        res.json(product);
    } catch (error) {
        console.error(`Failed to query product ${req.params.id}: ${error}`);
        res.status(500).json({ success: false, error: error.toString() });
    }
});

// Update a product's status
app.post('/api/products/updateStatus', async (req, res) => {
    if (!fabricContract) return res.status(503).json({ error: 'Blockchain network is not initialized.' });
    const { id, newStatus } = req.body;
    try {
        await fabricContract.submitTransaction('UpdateProductStatus', id, newStatus);
        res.json({ success: true, message: `Product ${id} status updated to ${newStatus}.` });
    } catch (error) {
        console.error(`Failed to update product status: ${error}`);
        res.status(500).json({ success: false, error: error.toString() });
    }
});


// --- Helper Functions ---

async function initializeFabric() {
    console.log('Attempting to initialize Fabric connection...');
    const ccpPath = path.resolve(__dirname, 'fabric-network', 'connection-org1.yaml');
    if (!fs.existsSync(ccpPath)) {
        throw new Error(`Connection profile not found at ${ccpPath}. Please ensure it is generated or placed correctly.`);
    }
    const ccp = yaml.load(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identity = await wallet.get('appUser');
    if (!identity) {
        console.log('An identity for the user "appUser" does not exist in the wallet. Enrolling now...');
        await enrollAppUser(ccp, wallet);
    }

    const gateway = new Gateway();
    try {
        await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: false } });
        const network = await gateway.getNetwork('cropchainchannel');
        fabricContract = network.getContract('cropchain');
        console.log('Fabric connection initialized successfully.');
    } catch (error) {
        console.error(`Failed to connect to gateway: ${error}`);
        gateway.disconnect();
        throw error;
    }
}

async function enrollAppUser(ccp, wallet) {
    try {
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        
        // --- THIS IS THE CRITICAL FIX ---
        // For a non-TLS connection, we do not need to provide TLS certificate options.
        const ca = new FabricCAServices(caInfo.url, undefined, caInfo.caName);

        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('Enrolling admin user...');
            const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
            const x509Identity = {
                credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
                mspId: 'Org1MSP',
                type: 'X.09',
            };
            await wallet.put('admin', x509Identity);
            console.log('Successfully enrolled admin user.');
        }

        const adminGateway = new Gateway();
        await adminGateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: false } });
        const adminService = adminGateway.getClient().getCertificateAuthority();
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        const secret = await adminService.register({ affiliation: 'org1.department1', enrollmentID: 'appUser', role: 'client' }, adminUser);
        const enrollment = await ca.enroll({ enrollmentID: 'appUser', enrollmentSecret: secret });
        const x509Identity = {
            credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
            mspId: 'Org1MSP',
            type: 'X.09',
        };
        await wallet.put('appUser', x509Identity);
        console.log('Successfully registered and enrolled "appUser".');
        adminGateway.disconnect();

    } catch (error) {
        console.error(`Failed to enroll app user: ${error}`);
        throw error;
    }
}


// --- Server Initialization ---

const PORT = 3000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Application is running in a stable, lightweight mode.');
    console.log('Blockchain features are currently disabled.');
    
    try {
        const { create } = await import('ipfs-http-client');
        ipfsClient = create({ host: 'ipfs', port: 5001, protocol: 'http' });
        console.log('IPFS client connected.');
    } catch (error) {
        console.error('Could not connect to IPFS client:', error);
    }
});