'use strict';

// All the require statements are the same...
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
let db, ipfs, fabric = null; // Fabric is null by default

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


// --- Hyperledger Fabric Helper Functions ---
// This function will NOT be called automatically on startup.
async function initializeFabric() {
    // The retry logic is still here, but it won't be called immediately
    const maxRetries = 5;
    const retryDelay = 10000;
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`Initializing Fabric connection (Attempt ${i + 1}/${maxRetries})...`);
            const ccpPath = path.resolve(__dirname, 'fabric-network', 'connection-org1.yaml');
            if (!fs.existsSync(ccpPath)) {
                throw new Error(`Connection profile not found at ${ccpPath}. Make sure the Fabric network is set up.`);
            }
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
                const x509Identity = { credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() }, mspId: 'Org1MSP', type: 'X.509' };
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
                const x509Identity = { credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() }, mspId: 'Org1MSP', type: 'X.509' };
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
            if (i === maxRetries - 1) { throw new Error("Could not initialize Fabric connection after multiple retries."); }
            console.log(`Waiting ${retryDelay / 1000} seconds before retrying...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
}


// --- API Routes ---

// NEW: An endpoint to manually trigger the Fabric setup script
app.post('/api/setup-blockchain', async (req, res) => {
    console.log('Received request to set up the blockchain network...');
    const { exec } = require('child_process');
    exec('bash /workspace/scripts/setup-fabric.sh', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ success: false, message: 'Failed to execute setup script.', error: stderr });
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        res.json({ success: true, message: 'Blockchain setup script executed. Check logs for details.', output: stdout });
    });
});

// NEW: An endpoint to manually initialize the fabric connection in the app
app.post('/api/connect-blockchain', async (req, res) => {
    if (fabric) {
        return res.status(200).json({ success: true, message: 'Fabric connection is already active.' });
    }
    try {
        fabric = await initializeFabric();
        res.json({ success: true, message: 'Successfully connected to the blockchain network.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to connect to the blockchain network.', error: error.message });
    }
});


// This function checks if Fabric is ready before processing a request.
const ensureFabricIsReady = (req, res, next) => {
    if (!fabric) {
        return res.status(503).json({ success: false, message: 'Blockchain network is not initialized. Please run the setup script and initialize the connection.' });
    }
    next();
};

app.post('/api/upload', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) { return res.status(400).send('No files were uploaded.'); }
    const file = req.files.document;
    try {
        const added = await ipfs.add(file.data);
        res.json({ success: true, ipfsHash: added.path, fileName: file.name });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to upload file to IPFS.' });
    }
});

// All blockchain routes are now protected
app.post('/api/products', ensureFabricIsReady, async (req, res) => {
    const { id, type, farmerName, description, ipfsHash, fileName } = req.body;
    if (!id || !type || !farmerName) { return res.status(400).json({ success: false, message: 'Missing required fields.' }); }
    try {
        const marketResponse = await axios.get(process.env.MARKET_API_URL || 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const marketPriceHash = crypto.createHash('sha256').update(JSON.stringify(marketResponse.data)).digest('hex');
        await fabric.contract.submitTransaction('CreateProduct', id, type, farmerName, marketPriceHash, ipfsHash || '');
        await db.execute('INSERT INTO products (id, type, farmer_name, description) VALUES (?, ?, ?, ?)', [id, type, farmerName, description || '']);
        if (ipfsHash && fileName) { await db.execute('INSERT INTO documents (product_id, ipfs_hash, file_name) VALUES (?, ?, ?)', [id, ipfsHash, fileName]); }
        res.status(201).json({ success: true, message: `Product ${id} created successfully.` });
    } catch (error) {
        res.status(500).json({ success: false, message: `Failed to create product: ${error.message}` });
    }
});

app.post('/api/products/:id/ship', ensureFabricIsReady, async (req, res) => {
    try {
        await fabric.contract.submitTransaction('ShipProduct', req.params.id, req.body.newOwner);
        res.json({ success: true, message: `Product ${req.params.id} shipped to ${req.body.newOwner}.` });
    } catch (error) {
        res.status(500).json({ success: false, message: `Failed to ship product: ${error.message}` });
    }
});

app.post('/api/products/:id/receive', ensureFabricIsReady, async (req, res) => {
    try {
        await fabric.contract.submitTransaction('ReceiveProduct', req.params.id, req.body.newOwner);
        res.json({ success: true, message: `Product ${req.params.id} received by ${req.body.newOwner}.` });
    } catch (error) {
        res.status(500).json({ success: false, message: `Failed to receive product: ${error.message}` });
    }
});

app.get('/api/products/:id/history', ensureFabricIsReady, async (req, res) => {
    try {
        const result = await fabric.contract.evaluateTransaction('GetProductHistory', req.params.id);
        res.json({ success: true, history: JSON.parse(result.toString()) });
    } catch (error) {
        res.status(500).json({ success: false, message: `Failed to get product history: ${error.message}` });
    }
});

app.get('/api/products/:id/qrcode', (req, res) => {
    const { id } = req.params;
    const url = `${req.protocol}://${req.get('host')}/history/${id}`;
    qr.toDataURL(url, (err, qrCodeImage) => {
        if (err) { return res.status(500).send('Could not generate QR code.'); }
        res.send(`<img src="${qrCodeImage}"/>`);
    });
});


// --- Server Initialization ---
async function startServer() {
    try {
        db = await dbPool;
        ipfs = ipfsClient;

        // ** CRITICAL CHANGE **: We DO NOT call initializeFabric() here anymore.
        // We will do it manually after the server starts.

        app.listen(PORT, HOST, () => {
            console.log(`Server running on http://${HOST}:${PORT}`);
            console.log('Application is running in a stable, lightweight mode.');
            console.log('Blockchain features are currently disabled.');
            console.log('To enable them, run the Fabric setup script and then initialize the connection via the API.');
        });

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();

