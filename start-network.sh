#!/bin/bash
set -e

echo "=========================================="
echo "CropChain Network Startup Script"
echo "=========================================="

# Stop and clean up existing containers
echo "[1/5] Stopping existing containers..."
docker-compose down -v

# Start the blockchain infrastructure
echo "[2/5] Starting blockchain infrastructure (orderer, peer, CA)..."
docker-compose up -d orderer.example.com peer0.org1.example.com ca.org1.example.com

# Wait for services to be ready
echo "[3/5] Waiting for blockchain services to initialize (30 seconds)..."
sleep 30

# Check if containers are running
echo "Checking container status..."
docker ps --filter "name=orderer.example.com" --filter "name=peer0.org1.example.com" --filter "name=ca.org1.example.com"

# Start CLI container
echo "[4/5] Starting CLI container..."
docker-compose up -d cli

echo "Waiting for CLI to be ready (10 seconds)..."
sleep 10

# Create channel and join peer
echo "[5/5] Setting up channel..."
docker exec cli peer channel create -o orderer.example.com:7050 -c cropchainchannel -f /opt/gopath/src/github.com/hyperledger/fabric/peer/fabric-network/channel-artifacts/cropchainchannel.tx --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/fabric-network/channel-artifacts/cropchainchannel.block || echo "Channel may already exist, continuing..."

echo "Joining peer to channel..."
docker exec cli peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/fabric-network/channel-artifacts/cropchainchannel.block || echo "Peer may already be joined, continuing..."

echo ""
echo "=========================================="
echo "Blockchain network is ready!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Deploy chaincode: bash scripts/deploy-chaincode.sh"
echo "2. Start application: docker-compose up -d app mysql ipfs"
echo ""
