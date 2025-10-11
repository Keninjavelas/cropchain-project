#!/bin/bash

echo "========= Generating Crypto Material and Genesis Block ========="

# Navigate to the project root to ensure consistent paths
cd "$(dirname "$0")/.."

# Clean up old artifacts for a fresh start
sudo rm -rf fabric-network/crypto-config
sudo rm -rf fabric-network/channel-artifacts/*
sudo rm -rf wallet
mkdir -p fabric-network/channel-artifacts

# Generate the crypto material for peers and orderers
echo "-----> Generating crypto material..."
./bin/cryptogen generate --config=./fabric-network/crypto-config.yaml --output="fabric-network/crypto-config"
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to generate crypto material."
  exit 1
fi

# Set the path for the configuration tool
export FABRIC_CFG_PATH=${PWD}/fabric-network

# Generate the genesis block for the ordering service
echo "-----> Generating genesis block..."
./bin/configtxgen -profile CropChainOrdererGenesis -channelID system-channel -outputBlock ./fabric-network/channel-artifacts/genesis.block
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to generate genesis block."
  exit 1
fi

# Generate the channel transaction file
echo "-----> Generating channel configuration transaction..."
./bin/configtxgen -profile CropChainChannel -outputCreateChannelTx ./fabric-network/channel-artifacts/cropchainchannel.tx -channelID cropchainchannel
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to generate channel configuration transaction."
  exit 1
fi

echo "========= Artifact Generation Complete - SUCCESS! ========="

