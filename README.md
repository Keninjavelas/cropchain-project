# CropChain: Blockchain-Powered Agricultural Traceability

[![Hyperledger Fabric](https://img.shields.io/badge/Hyperledger%20Fabric-2.2.0-blue)](https://www.hyperledger.org/use/fabric)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)](https://www.docker.com/)

CropChain is a full-stack blockchain application demonstrating an agricultural product traceability solution using a hybrid approach. It leverages **Hyperledger Fabric** for an immutable audit trail, **MySQL** for scalable off-chain data storage, and **IPFS** for decentralized file storage.

## 🌟 Features

- ✅ **Immutable Product Tracking** - Track agricultural products on the blockchain
- 📊 **Complete History** - View full product lifecycle and ownership changes
- 📦 **Supply Chain Management** - Ship and receive products between parties
- 🔐 **Decentralized Storage** - Upload certificates and documents to IPFS
- 📱 **QR Code Generation** - Generate QR codes for product traceability
- 🎨 **Modern UI** - React-based responsive user interface with Tailwind CSS
- 🔗 **Hybrid Architecture** - Combines blockchain immutability with database scalability

## 🏗️ Architecture

```text
┌─────────────────┐
│   React UI      │
│  (Port 3000)    │
└────────┬────────┘
         │
┌────────▼────────────────────────────────────┐
│         Node.js/Express Backend             │
│  • REST API                                 │
│  • Fabric Gateway SDK                       │
│  • MySQL Connection Pool                    │
│  • IPFS Client                              │
└───┬─────────┬────────────┬──────────────────┘
    │         │            │
    │    ┌────▼─────┐  ┌───▼──────┐
    │    │  MySQL   │  │   IPFS   │
    │    │  (3306)  │  │  (5001)  │
    │    └──────────┘  └──────────┘
    │
┌───▼─────────────────────────────────────────┐
│      Hyperledger Fabric Network             │
│  • Orderer (7050)                           │
│  • Peer (7051)                              │
│  • CA (7054)                                │
│  • Chaincode (Go)                           │
└─────────────────────────────────────────────┘
```

## 🚀 Core Technologies

| Component | Technology | Version |
|-----------|-----------|---------|
| **Blockchain** | Hyperledger Fabric | 2.2.0 |
| **Backend** | Node.js + Express.js | 18.x |
| **Frontend** | React + Tailwind CSS | 18.2.0 |
| **Database** | MySQL | 8.0 |
| **File Storage** | IPFS | Latest |
| **Containerization** | Docker + Docker Compose | Latest |
| **Smart Contract** | Go (Golang) | 1.x |

## 📁 Project Structure

```text
cropchain-project/
├── app.js                      # Main Express application
├── package.json                # Backend dependencies
├── Dockerfile                  # Application container
├── docker-compose.yml          # Multi-container orchestration
├── start-network.ps1           # Windows startup script
├── start-network.sh            # Linux/Mac startup script
├── TROUBLESHOOTING.md          # Detailed troubleshooting guide
│
├── chaincode/                  # Hyperledger Fabric Smart Contract
│   ├── cropchain.go           # Go chaincode implementation
│   └── go.mod                 # Go module dependencies
│
├── fabric-network/            # Fabric network configuration
│   ├── configtx.yaml         # Channel configuration
│   ├── crypto-config.yaml    # Crypto material configuration
│   ├── connection-org1.yaml  # Fabric SDK connection profile
│   ├── crypto-config/        # Generated certificates and keys
│   └── channel-artifacts/    # Channel configuration files
│
├── scripts/                   # Setup and deployment scripts
│   ├── setup-fabric.sh       # Network initialization
│   ├── setup-channel.sh      # Channel setup
│   ├── deploy-chaincode.sh   # Chaincode deployment
│   └── generate-artifacts.sh # Crypto material generation
│
├── ui/                        # React frontend
│   ├── src/
│   │   ├── App.jsx           # Main React component
│   │   ├── main.jsx          # React entry point
│   │   └── index.css         # Tailwind CSS styles
│   ├── vite.config.js        # Vite build configuration
│   ├── tailwind.config.js    # Tailwind configuration
│   └── package.json          # Frontend dependencies
│
├── db/
│   └── init.sql              # MySQL database initialization
│
├── bin/                       # Fabric binaries
│   ├── cryptogen             # Certificate generator
│   ├── configtxgen           # Configuration generator
│   └── peer                  # Peer CLI tool
│
└── wallet/                    # Fabric identity wallet (generated)
```

## 🔧 Prerequisites

- **Docker Desktop** (Windows/Mac) or Docker Engine (Linux)
- **Git Bash** or WSL (for Windows users)
- **8GB RAM** minimum
- **20GB free disk space**

## 🚀 Quick Start (Windows)

### Step 1: Start the Blockchain Network

```powershell
.\start-network.ps1
```

This script will:

1. Stop and clean existing containers
2. Start orderer, peer, and CA services
3. Create the channel `cropchainchannel`
4. Join the peer to the channel

### Step 2: Deploy the Chaincode

```bash
# Use Git Bash or WSL
bash scripts/deploy-chaincode.sh
```

Or manually:

```powershell
# Package chaincode
docker exec cli peer lifecycle chaincode package cropchain.tar.gz --path /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode --lang golang --label cropchain_1

# Install chaincode
docker exec cli peer lifecycle chaincode install cropchain.tar.gz

# Approve chaincode (replace PACKAGE_ID with actual value from install output)
docker exec cli peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --channelID cropchainchannel --name cropchain --version 1.0 --package-id PACKAGE_ID --sequence 1

# Commit chaincode
docker exec cli peer lifecycle chaincode commit -o orderer.example.com:7050 --channelID cropchainchannel --name cropchain --version 1.0 --sequence 1 --peerAddresses peer0.org1.example.com:7051
```

### Step 3: Start Application Services

```powershell
docker-compose up -d app mysql ipfs
```

### Step 4: Access the Application

Open your browser and navigate to: **<http://localhost:3000>**

## 🎯 Usage

### 1. Connect to Blockchain

Click the **"Connect to Blockchain"** button in the header to initialize the Fabric connection.

### 2. Create a Product

Navigate to the **"Create Product"** tab:

- Enter Product ID (e.g., `RICE001`)
- Select Product Type (Rice, Wheat, Coffee, etc.)
- Enter Farmer Name
- Add Description
- Optionally upload a certificate to IPFS

### 3. Manage Products

Use the **"Manage Products"** tab to:

- **Ship** products to a new owner
- **Receive** products and update ownership

### 4. View History

Access the **"View History"** tab to:

- Query product history by ID
- See complete ownership and status changes
- View timestamps and transaction IDs

### 5. Browse All Products

The **"All Products"** tab displays:

- All products on the blockchain
- Search and filter capabilities
- Current product status

## 🔌 API Endpoints

### Blockchain Connection

```http
POST /api/connect-blockchain
```

Initialize connection to the Fabric network.

### Product Management

```http
POST /api/products
Content-Type: application/json

{
  "id": "RICE001",
  "type": "Rice",
  "farmerName": "John Farmer",
  "description": "Premium Basmati Rice",
  "ipfsHash": "QmXxx...",
  "fileName": "certificate.pdf"
}
```

### Ship Product

```http
POST /api/products/:id/ship
Content-Type: application/json

{
  "newOwner": "Distributor A"
}
```

### Receive Product

```http
POST /api/products/:id/receive
Content-Type: application/json

{
  "newOwner": "Retailer B"
}
```

### Get Product History

```http
GET /api/products/:id/history
```

### Generate QR Code

```http
GET /api/products/:id/qrcode
```

### Query All Products

```http
GET /api/products/queryAll
```

### Upload to IPFS

```http
POST /api/upload
Content-Type: multipart/form-data

document: [file]
```

## 🛠️ Common Commands

### View Container Status

```powershell
docker ps
```

### Check Application Logs

```powershell
docker logs cropchain_app --tail 50 -f
```

### Check Peer Logs

```powershell
docker logs peer0.org1.example.com --tail 50 -f
```

### Query Chaincode Directly

```powershell
docker exec cli peer chaincode query -C cropchainchannel -n cropchain -c '{"Args":["QueryAllProducts"]}'
```

### Invoke Chaincode Directly

```powershell
docker exec cli peer chaincode invoke -o orderer.example.com:7050 -C cropchainchannel -n cropchain -c '{"function":"CreateProduct","Args":["TEST001","Rice","TestFarmer","hash1","hash2"]}'
```

### Stop All Services

```powershell
docker-compose down
```

### Clean Restart (Remove All Data)

```powershell
docker-compose down -v
docker system prune -f
.\start-network.ps1
bash scripts/deploy-chaincode.sh
docker-compose up -d app mysql ipfs
```

## 🐛 Troubleshooting

For detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Common Issues

**Containers not starting:**

```powershell
docker-compose down -v
.\start-network.ps1
```

**Blockchain connection fails:**

- Ensure all containers are running: `docker ps`
- Check logs: `docker logs cropchain_app`
- Click "Connect to Blockchain" in the UI

**Chaincode errors:**

- Verify chaincode is committed: `docker exec cli peer lifecycle chaincode querycommitted --channelID cropchainchannel`
- Check chaincode container: `docker ps | grep dev-peer`

## 📝 Key Fixes Applied

1. ✅ Fixed CA container configuration
2. ✅ Updated connection profile for container networking
3. ✅ Changed to cryptogen-based admin identity
4. ✅ Disabled discovery service for compatibility
5. ✅ Fixed markdown linting issues
6. ✅ Added comprehensive spell checker dictionary
7. ✅ Simplified JavaScript code patterns

## 🎓 Learning Resources

- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)
- [Fabric SDK for Node.js](https://hyperledger.github.io/fabric-sdk-node/)
- [Docker Documentation](https://docs.docker.com/)
- [IPFS Documentation](https://docs.ipfs.io/)

## 📄 License

This project is created for educational purposes.

## 👥 Contributing

This is an educational project. Feel free to fork and experiment!

## 🙏 Acknowledgments

- Hyperledger Fabric Community
- Docker Community
- IPFS Community

---

Built with ❤️ for Agricultural Supply Chain Traceability
