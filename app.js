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
app.use(express.static(path.join(__dirname, 'ui/dist'))); // Serve React App


// --- Connections ---
let db, ipfs;
let fabricContract = null; // Start with no contract connection

// Database Connection Pool
const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql',
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'cropchain',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// IPFS Client
const ipfsClient = create({
    host: process.env.IPFS_HOST || 'ipfs',
    port: process.env.IPFS_PORT || 5001,
    protocol: 'http'
});


// --- Hyperledger Fabric Helper Functions ---

// This function will now be called on-demand via an API endpoint
async function initializeFabric() {
    if (fabricContract) {
        console.log('Fabric connection already initialized.');
        return fabricContract;
    }

    console.log('Attempting to initialize Hyperledger Fabric connection...');
    try {
        const ccpPath = path.resolve(__dirname, 'fabric-network', 'connection-org1.yaml');
        const ccpFile = fs.readFileSync(ccpPath, 'utf8');
        const ccp = yaml.load(ccpFile);

        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });
        const network = await gateway.getNetwork('cropchainchannel');
        const contract = network.getContract('cropchain');
        
        console.log('Fabric connection initialized successfully.');
        fabricContract = contract; // Store the contract for later use
        return contract;

    } catch (error) {
        console.error(`Failed to initialize Fabric connection: ${error}`);
        throw error; // Propagate the error to be handled by the API caller
    }
}


// --- API Routes ---

// New endpoint to manually trigger the blockchain connection
app.post('/api/connect-blockchain', async (req, res) => {
    try {
        await initializeFabric();
        res.json({ success: true, message: 'Successfully connected to the blockchain network.' });
    } catch (error) {
        res.status(500).json({ success: false, message: `Failed to connect to blockchain: ${error.message}` });
    }
});


// Middleware to check if the blockchain is connected before proceeding
const requireBlockchain = (req, res, next) => {
    if (!fabricContract) {
        return res.status(503).json({
            success: false,
            message: 'Blockchain network is not initialized. Please connect first.'
        });
    }
    next();
};


// Upload file to IPFS (does not require blockchain)
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


// Create a new product (requires blockchain)
app.post('/api/products', requireBlockchain, async (req, res) => {
    const { id, type, farmerName, description, ipfsHash, fileName } = req.body;
    if (!id || !type || !farmerName) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    try {
        const marketResponse = await axios.get(process.env.MARKET_API_URL || 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const marketDataString = JSON.stringify(marketResponse.data);
        const marketPriceHash = crypto.createHash('sha256').update(marketDataString).digest('hex');

        await fabricContract.submitTransaction('CreateProduct', id, type, farmerName, marketPriceHash, ipfsHash || '');
        
        await db.execute(
            'INSERT INTO products (id, type, farmer_name, description) VALUES (?, ?, ?, ?)',
            [id, type, farmerName, description || '']
        );
        if (ipfsHash && fileName) {
            await db.execute(
                'INSERT INTO documents (product_id, ipfs_hash, file_name) VALUES (?, ?, ?)',
                [id, ipfsHash, fileName]
            );
        }

        res.status(201).json({ success: true, message: `Product ${id} created successfully.` });

    } catch (error) {
        console.error(`Failed to create product: ${error}`);
        res.status(500).json({ success: false, message: `Failed to create product: ${error.message}` });
    }
});

// Ship a product (requires blockchain)
app.post('/api/products/:id/ship', requireBlockchain, async (req, res) => {
    const { id } = req.params;
    const { newOwner } = req.body;
    if (!newOwner) {
        return res.status(400).json({ success: false, message: 'New owner is required.' });
    }
    try {
        await fabricContract.submitTransaction('ShipProduct', id, newOwner);
        res.json({ success: true, message: `Product ${id} shipped to ${newOwner}.` });
    } catch (error) {
        console.error(`Failed to ship product: ${error}`);
        res.status(500).json({ success: false, message: `Failed to ship product: ${error.message}` });
    }
});

// Receive a product (requires blockchain)
app.post('/api/products/:id/receive', requireBlockchain, async (req, res) => {
    const { id } = req.params;
    const { newOwner } = req.body;
    if (!newOwner) {
        return res.status(400).json({ success: false, message: 'New owner is required.' });
    }
    try {
        await fabricContract.submitTransaction('ReceiveProduct', id, newOwner);
        res.json({ success: true, message: `Product ${id} received by ${newOwner}.` });
    } catch (error) {
        console.error(`Failed to receive product: ${error}`);
        res.status(500).json({ success: false, message: `Failed to receive product: ${error.message}` });
    }
});

// Get product history from the ledger (requires blockchain)
app.get('/api/products/:id/history', requireBlockchain, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await fabricContract.evaluateTransaction('GetProductHistory', id);
        res.json({ success: true, history: JSON.parse(result.toString()) });
    } catch (error) {
        console.error(`Failed to get product history: ${error}`);
        res.status(500).json({ success: false, message: `Failed to get product history: ${error.message}` });
    }
});


// Generate QR Code for product history (does not require blockchain)
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
        // Connect to off-chain services on startup
        db = await dbPool;
        ipfs = ipfsClient;

        app.listen(PORT, HOST, () => {
            console.log(`Server running on http://${HOST}:${PORT}`);
            console.log('Application is running in a stable, lightweight mode.');
            console.log('Blockchain features are currently disabled.');
            console.log('Run "curl -X POST http://localhost:3000/api/connect-blockchain" to enable them after setting up the network.');
        });

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();

