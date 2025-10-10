#!/bin/bash

echo "========= Generating Crypto Material and Genesis Block (Final, Corrected Version) ========="

# Make sure we are in the project root for consistent paths
cd "$(dirname "$0")/.."

# STEP 1: Fix all file permissions to prevent any "Permission denied" errors.
echo "-----> Taking ownership of all project files..."
sudo chown -R $(whoami) .

# Set the environment variable for the config files
export FABRIC_CFG_PATH=${PWD}/fabric-network

# Clean up any old materials using sudo to ensure it works
sudo rm -rf fabric-network/crypto-config
sudo rm -rf fabric-network/channel-artifacts/*
mkdir -p fabric-network/channel-artifacts

# STEP 2: Generate Crypto Material using the direct path to the binary
echo "-----> Generating crypto material..."
./bin/cryptogen generate --config=./fabric-network/crypto-config.yaml --output="fabric-network/crypto-config"
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to generate crypto material."
  exit 1
fi

# STEP 3: Generate Genesis Block using the direct path to the binary
echo "-----> Generating genesis block..."
./bin/configtxgen -profile CropChainOrdererGenesis -channelID system-channel -outputBlock ./fabric-network/channel-artifacts/genesis.block
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to generate genesis block."
  exit 1
fi

# STEP 4: Generate Channel Transaction using the direct path to the binary
echo "-----> Generating channel configuration transaction..."
./bin/configtxgen -profile CropChainChannel -outputCreateChannelTx ./fabric-network/channel-artifacts/cropchainchannel.tx -channelID cropchainchannel
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to generate channel configuration transaction."
  exit 1
fi

# --- THIS IS THE CRITICAL FIX ---
echo "-----> Generating connection profile for a NON-TLS network..."
# Define the template for our connection profile
cat <<EOF > fabric-network/connection-org1.yaml
---
name: cropchain-network-org1
version: 1.0.0
client:
  organization: Org1
  connection:
    timeout:
      peer:
        endorser: '300'
organizations:
  Org1:
    mspid: Org1MSP
    peers:
      - peer0.org1.example.com
    certificateAuthorities:
      - ca.org1.example.com
peers:
  peer0.org1.example.com:
    # Use the service name for the Docker network
    url: grpc://peer0.org1.example.com:7051
    # NO TLS certs are needed for an insecure connection
certificateAuthorities:
  ca.org1.example.com:
    # Use the service name for the Docker network
    url: http://ca.org1.example.com:7054
    caName: ca.org1.example.com
    httpOptions:
      verify: false
EOF

echo "========= Artifact Generation Complete - SUCCESS! ========="

