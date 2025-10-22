# CropChain: Hybrid Blockchain for Agricultural Traceability 🌾

**CropChain** is a comprehensive, full-stack application that demonstrates **agricultural product traceability** using a **hybrid blockchain architecture**. It provides an unchangeable, verifiable audit trail for produce, ensuring transparency from farm to consumer.

-----

## Core Technology Stack

CropChain leverages best-in-class technologies to deliver a robust and scalable solution:

| Feature | Technology | Role |
| :--- | :--- | :--- |
| **Immutable Audit Trail** | **Hyperledger Fabric (v2.2)** | A private, permissioned blockchain for secure, unchangeable transaction records (on-chain data). |
| **Scalable Data Storage** | **MySQL** | Efficient, high-volume relational database for storing off-chain data. |
| **Decentralized Files** | **InterPlanetary File System (IPFS)** | Ensures tamper-proof and decentralized storage for documents like certificates and reports. |
| **Backend API** | **Node.js/Express.js** | Manages server-side logic, blockchain interactions, and exposes the RESTful API. |
| **Frontend UI** | **React** | Provides a dynamic user interface for interacting with the system (served statically by the backend). |
| **Containerization** | **Docker/Docker Compose** | Simplifies deployment and ensures a consistent environment for all services. |

-----

## Getting Started Locally 🖥️

This project uses **Docker** and **Docker Compose** to manage the Fabric network, MySQL database, and IPFS daemon. You must have these tools and **Node.js** installed locally to run the application.

### Prerequisites

  * **Docker**
  * **Docker Compose**
  * **Node.js** (LTS version recommended)
  * **npm**

### 1\. Start Core Services

Open your terminal in the root directory and run the following command. This initiates all necessary containers: the Fabric network, MySQL, IPFS, and the main Node.js application container.

```bash
docker-compose up -d
```

### 2\. Setup Fabric Network

The private blockchain network requires a one-time setup. Execute the included script to configure the network and deploy the smart contract.

```bash
./scripts/setup-fabric.sh
```

This script will:

  * Enroll an admin user.
  * Create the **`cropchainchannel`**.
  * Package, install, and approve the smart contract (chaincode).

### 3\. Install Dependencies & Build UI

Next, you need to prepare the backend dependencies and compile the frontend assets.

```bash
# Install backend dependencies
npm install

# Navigate to UI directory, install frontend dependencies, and build
cd ui
npm install
npm run build

# Return to the root directory
cd ..
```

### 4\. Access the Application

The Node.js application container is running and exposed on port **3000**. The UI is now ready to serve.

  * You can confirm the application is running by checking the logs:
    ```bash
    docker-compose logs -f app
    ```
  * Access the application by opening your browser to: **http://localhost:3000**

-----

## Project Structure

```
.
├── .env                 # Environment variables for service configuration
├── app.js               # Main Node.js/Express server and application entry point
├── chaincode/           # Hyperledger Fabric Smart Contract (Go language)
├── db/                  # MySQL initialization script (init.sql)
├── docker-compose.yml   # Defines and links all services (Fabric, MySQL, IPFS, App)
├── Dockerfile           # Defines the Docker image for the main Node.js application
├── fabric-network/      # Configuration files for the Fabric network setup
├── package.json         # Backend dependencies
├── README.md            # This file
├── scripts/
│   └── setup-fabric.sh  # Script to initialize the Fabric network and deploy chaincode
└── ui/                  # React frontend source code
```

-----

## API Endpoints

The `app.js` server exposes a set of REST API endpoints to interact with the system:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/products` | **Create:** Records a new product, initiating its traceability history. |
| `POST` | `/api/products/:id/ship` | **Ship:** Marks a product's movement at the shipping point. |
| `POST` | `/api/products/:id/receive` | **Receive:** Marks a product's movement at the receiving point. |
| `GET` | `/api/products/:id/history` | **Query:** Retrieves the full, immutable on-chain transaction history for a product. |
| `GET` | `/api/products/:id/qrcode` | **Utility:** Generates a QR code image linking to the product's history URL. |
| `POST` | `/api/upload` | **File Storage:** Uploads a file (e.g., quality certificate) to **IPFS** and returns its hash. |


## Current Display

<img width="1907" height="909" alt="Screen" src="https://github.com/user-attachments/assets/53f071f1-86cd-4efe-a593-726db2f2d76f" />
