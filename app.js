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
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/products/create', async (req, res) => {
    if (!fabricContract) return res.status(503).json({ error: 'Blockchain not initialized.' });
    try {
        const { id, origin, product, status, owner } = req.body;
        await fabricContract.submitTransaction('CreateProduct', id, product, origin, owner, status);
        res.status(201).json({ success: true, message: `Product ${id} created.` });
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
        res.json({ success: true, message: `Status updated for ${req.body.id}.` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.toString() });
    }
});


async function initializeFabric() {
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // This is the key: The connection profile is now generated dynamically
    // based on the CA's self-generated certificate.
    const caCertPath = path.resolve(__dirname, 'fabric-network', 'ca-cert.pem');
    
    // Retry mechanism to wait for the CA to be ready and for the cert to be copied
    let retries = 5;
    while (retries > 0) {
        if (fs.existsSync(caCertPath)) break;
        console.log('CA certificate not found, waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        retries--;
    }
    if (!fs.existsSync(caCertPath)) {
        throw new Error('CA certificate file not found after multiple retries. Ensure the `docker cp` command was successful.');
    }
    
    const caCert = fs.readFileSync(caCertPath, 'utf8');
    
    // Dynamically build the connection profile
    const ccp = {
        client: { 
            organization: 'Org1',
            connection: {
                timeout: {
                    peer: { endorser: '300' }
                }
            }
        },
        organizations: { 
            Org1: { 
                mspid: 'Org1MSP', 
                peers: ['peer0.org1.example.com'],
                certificateAuthorities: ['ca-org1']
            } 
        },
        peers: { 
            'peer0.org1.example.com': { 
                url: 'grpc://peer0.org1.example.com:7051',
                // TLS is disabled for the peer, so no tlsCACerts needed here
            } 
        },
        certificateAuthorities: { 
            'ca-org1': { 
                url: 'http://ca_org1:7054', 
                caName: 'ca-org1', 
                tlsCACerts: { pem: caCert },
                httpOptions: { verify: false }
            } 
        }
    };
    
    let appUser = await wallet.get('appUser');
    if (!appUser) {
        await enrollAppUser(wallet, ccp);
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: false } });
    const network = await gateway.getNetwork('cropchainchannel');
    fabricContract = network.getContract('cropchain');
    console.log('Fabric connection initialized successfully.');
}

async function enrollAppUser(wallet, ccp) {
    const caInfo = ccp.certificateAuthorities['ca-org1'];
    const ca = new FabricCAServices(caInfo.url, { trustedRoots: caInfo.tlsCACerts.pem, verify: false }, caInfo.caName);

    let admin = await wallet.get('admin');
    if (!admin) {
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        const x509Identity = {
            credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
            mspId: 'Org1MSP', type: 'X.509',
        };
        await wallet.put('admin', x509Identity);
        admin = await wallet.get('admin');
    }

    const provider = wallet.getProviderRegistry().getProvider(admin.type);
    const adminUser = await provider.getUserContext(admin, 'admin');

    const secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: 'appUser', role: 'client' }, adminUser);
    const enrollment = await ca.enroll({ enrollmentID: 'appUser', enrollmentSecret: secret });
    const x509Identity = {
        credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
        mspId: 'Org1MSP', type: 'X.509',
    };
    await wallet.put('appUser', x509Identity);
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

