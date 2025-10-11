#!/bin/bash

echo "========= Generating Crypto Material and Genesis Block (Final, Corrected Version) ========="

# Make sure we are in the project root for consistent paths
cd "$(dirname "$0")/.."

# STEP 1: Aggressively clean up all old, stale data.
echo "-----> Cleaning up old artifacts, stale CA database, and wallet..."
sudo rm -rf fabric-network/crypto-config
sudo rm -rf fabric-network/channel-artifacts/*
sudo rm -rf wallet
mkdir -p fabric-network/channel-artifacts

# Set the environment variable for the config files
export FABRIC_CFG_PATH=${PWD}/fabric-network

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

# STEP 5: Generate the connection profile with the correct filenames
echo "-----> Generating connection profile with correct filenames..."
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
    url: grpc://peer0.org1.example.com:7051
    # TLS is disabled, no certs needed here for the peer.
certificateAuthorities:
  ca.org1.example.com:
    url: http://ca.org1.example.com:7054
    caName: ca.org1.example.com
    tlsCACerts:
      # This is the corrected filename that cryptogen actually creates.
      path: ${PWD}/fabric-network/crypto-config/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem
    httpOptions:
      verify: false
EOF

echo "========= Artifact Generation Complete - SUCCESS! ========="

