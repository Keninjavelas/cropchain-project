#!/bin/bash

echo "========= Generating Crypto Material and Genesis Block ========="

# Make sure we are in the project root directory for consistent paths
cd "$(dirname "$0")/.."

# STEP 1: Fix all file permissions to prevent any "Permission denied" errors.
echo "-----> Taking ownership of all project files..."
sudo chown -R $(whoami) .

# Set environment variable for the config files
export FABRIC_CFG_PATH=${PWD}/fabric-network

# Clean up any old materials from previous runs
rm -rf fabric-network/crypto-config
rm -rf fabric-network/channel-artifacts/*
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

echo "========= Artifact Generation Complete - SUCCESS! ========="

