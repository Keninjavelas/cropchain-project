#!/bin/bash

echo "========= Generating Crypto Material and Genesis Block (Final Version) ========="

# Make sure we are in the project root for consistent paths
cd "$(dirname "$0")/.."

# Set the environment variable for the config files
export FABRIC_CFG_PATH=${PWD}/fabric-network

# Clean up any old materials
rm -rf fabric-network/crypto-config
rm -rf fabric-network/channel-artifacts/*
mkdir -p fabric-network/channel-artifacts

# Generate Crypto Material using the direct path
echo "-----> Generating crypto material..."
./bin/cryptogen generate --config=./fabric-network/crypto-config.yaml --output="fabric-network/crypto-config"
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to generate crypto material."
  exit 1
fi

# Generate Genesis Block using the direct path
echo "-----> Generating genesis block..."
./bin/configtxgen -profile CropChainOrdererGenesis -channelID system-channel -outputBlock ./fabric-network/channel-artifacts/genesis.block
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to generate genesis block."
  exit 1
fi

# Generate Channel Transaction using the direct path
echo "-----> Generating channel configuration transaction..."
./bin/configtxgen -profile CropChainChannel -outputCreateChannelTx ./fabric-network/channel-artifacts/cropchainchannel.tx -channelID cropchainchannel
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to generate channel configuration transaction."
  exit 1
fi

echo "========= Artifact Generation Complete - SUCCESS! ========="

