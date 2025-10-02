CropChain: A Hybrid Blockchain Application for Agricultural Traceability
CropChain is a full-stack application demonstrating a traceability solution for agricultural products using a hybrid approach. It leverages Hyperledger Fabric for an immutable audit trail, MySQL for scalable off-chain data storage, and IPFS for decentralized file storage.

This project is configured to run seamlessly within a GitHub Codespaces environment.

Core Technologies
Blockchain: Hyperledger Fabric (v2.2)

Backend: Node.js, Express.js

Frontend: React (served statically by the backend)

Database: MySQL

File Storage: InterPlanetary File System (IPFS)

Containerization: Docker, Docker Compose

Environment: GitHub Codespaces

Project Structure
.
├── .devcontainer/
│   └── devcontainer.json   # Codespaces configuration
├── .env                    # Environment variables
├── app.js                  # Main Node.js/Express application
├── chaincode/              # Hyperledger Fabric Smart Contract (Go)
├── db/
│   └── init.sql            # MySQL initialization script
├── docker-compose.yml      # Main Docker Compose file
├── Dockerfile              # Dockerfile for the main app container
├── fabric-network/         # Fabric network configuration files
├── package.json            # Backend dependencies
├── README.md               # This file
└── scripts/
    └── setup-fabric.sh     # Fabric network setup script
└── ui/                     # React frontend source code

How to Run in GitHub Codespaces
Open in Codespaces: Open this repository in a new GitHub Codespace. The environment will be automatically configured based on .devcontainer/devcontainer.json and the Dockerfile.

Start Services: The postCreateCommand in devcontainer.json will automatically run docker-compose up -d. This will start all the necessary services:

Hyperledger Fabric Network (Orderer, Peers, Certificate Authority)

MySQL Database

IPFS Daemon

The Node.js application container

Setup Fabric Network: The Docker Compose setup will automatically execute the scripts/setup-fabric.sh script. This script performs the following critical one-time setup tasks:

Waits for the Fabric CA to be ready.

Enrolls an admin user for the organization.

Creates a channel named cropchainchannel.

Packages, installs, and approves the smart contract on the channel.

Install Dependencies & Build UI: Open a terminal within Codespaces and run the following commands:

# Install backend dependencies
npm install

# Navigate to the UI directory
cd ui

# Install frontend dependencies
npm install

# Build the React application for production
npm run build

# Go back to the root directory
cd ..

Start the Application: The application should already be running via the docker-compose setup using nodemon for auto-reloading. You can check the logs:

docker-compose logs -f app

If it's not running, start it manually:

npm start

Access the Application: Codespaces will automatically detect the running application on port 3000 and prompt you to open it in a browser. The CropChain UI will be available, allowing you to interact with the system.

API Endpoints
The app.js server exposes the following REST API endpoints:

POST /api/products: Create a new product.

POST /api/products/:id/ship: Mark a product as shipped.

POST /api/products/:id/receive: Mark a product as received.

GET /api/products/:id/history: Retrieve the full on-chain history for a product.

GET /api/products/:id/qrcode: Get a QR code image for a product's history URL.

POST /api/upload: Upload a file (e.g., certificate) to IPFS.