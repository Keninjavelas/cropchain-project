## CropChain: Hybrid Blockchain for Agricultural Traceability 🌾

**CropChain** is a comprehensive, full-stack application that tackles **agricultural product traceability** using a **hybrid blockchain architecture**. It provides an unchangeable and verifiable audit trail for produce, from farm to consumer.

### Key Features & Technology Stack

CropChain combines several cutting-edge technologies to create a robust and scalable solution:

| Feature | Technology | Role |
| :--- | :--- | :--- |
| **Immutable Audit Trail** | **Hyperledger Fabric (v2.2)** | Provides a private, permissioned blockchain for secure, unchangeable transaction records (on-chain data). |
| **Scalable Data Storage** | **MySQL** | Used for efficient, high-volume storage of off-chain data. |
| **Decentralized File Storage** | **InterPlanetary File System (IPFS)** | Ensures tamper-proof and decentralized storage for files like certificates and quality reports. |
| **Backend API** | **Node.js/Express.js** | Manages server-side logic and exposes the RESTful API endpoints. |
| **Frontend UI** | **React** | Provides a dynamic, modern user interface for interacting with the system. |
| **Containerization** | **Docker/Docker Compose** | Simplifies deployment and ensures a consistent environment for all services. |
| **Development Environment** | **GitHub Codespaces** | Pre-configured environment for seamless, zero-setup development and deployment. |

-----

### Getting Started in GitHub Codespaces 🚀

This project is fully configured to run immediately within a **GitHub Codespaces** environment.

#### 1\. Open in Codespaces

Simply open this repository in a new GitHub Codespace. The setup relies on files in `.devcontainer/` and the main `Dockerfile` to automatically configure the necessary environment, including dependencies and tools.

#### 2\. Automatic Service Startup & Network Setup

Upon creating the Codespace, the `postCreateCommand` executes, performing several critical steps:

1.  **Starts Services:** `docker-compose up -d` brings up all core components:
      * Hyperledger Fabric Network (Peers, Orderer, CA)
      * MySQL Database
      * IPFS Daemon
      * The main Node.js Application container (running via `nodemon`).
2.  **Sets Up Fabric:** The `scripts/setup-fabric.sh` script runs automatically to handle the one-time network configuration:
      * Enrolls the organization's admin user.
      * Creates the **`cropchainchannel`**.
      * Packages, installs, and approves the Fabric Smart Contract (chaincode) written in Go.

#### 3\. Install Dependencies & Build UI

While the backend services are running, you must install dependencies and build the static frontend assets. Open a terminal in Codespaces and run these commands:

```bash
# Install backend (Node.js/Express) dependencies
npm install

# Navigate to UI directory
cd ui

# Install frontend (React) dependencies
npm install

# Build the production-ready React application
npm run build

# Return to the root directory
cd ..
```

#### 4\. Access the Application

The Node.js application is running on port **3000**. Codespaces will automatically detect this and provide a prompt to **Open in Browser**.

  * The **CropChain UI** will load, allowing you to begin interacting with the traceability system.
  * You can monitor the application logs using: `docker-compose logs -f app`
  * *(Optional: If the app isn't running, start it manually with `npm start`)*

-----

### Project Structure Overview

```
.
├── .devcontainer/       # Codespaces configuration (devcontainer.json)
├── .env                 # Environment variables
├── app.js               # Main Node.js/Express server
├── chaincode/           # Hyperledger Fabric Smart Contract (Go)
├── db/                  # MySQL initialization script (init.sql)
├── docker-compose.yml   # Defines all services (Fabric, MySQL, IPFS, App)
├── Dockerfile           # Dockerfile for the main application container
├── fabric-network/      # Fabric network configuration files
├── scripts/             # Fabric network setup script (setup-fabric.sh)
├── ui/                  # React frontend source code
├── package.json         # Backend dependencies
└── README.md            # This file
```

-----

### REST API Endpoints

The backend server exposes the following endpoints for product management and traceability:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/products` | Create a new agricultural product record. |
| `POST` | `/api/products/:id/ship` | Mark an existing product as shipped. |
| `POST` | `/api/products/:id/receive` | Mark an existing product as received. |
| `GET` | `/api/products/:id/history` | Retrieve the complete on-chain history for a product. |
| `GET` | `/api/products/:id/qrcode` | Generate a QR code image for a product's history URL. |
| `POST` | `/api/upload` | Upload a file (e.g., quality certificate) to **IPFS**. |
