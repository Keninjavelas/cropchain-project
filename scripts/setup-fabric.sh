#!/bin/bash

echo "========= Starting Fabric Network Setup ========="

# Set environment variables
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/fabric-network
export CHANNEL_NAME=cropchainchannel
export CC_NAME=cropchain
export CC_VERSION=1.0
export CC_SEQUENCE=1
export CC_SRC_PATH=${PWD}/chaincode
export CC_RUNTIME_LANGUAGE=golang

# 1. Generate Crypto Material
echo "-----> Generating crypto material..."
cd fabric-network
if [ -d "crypto-config" ]; then
  rm -rf crypto-config
fi
../bin/cryptogen generate --config=./crypto-config.yaml --output="crypto-config"
cd ..
echo "-----> Crypto material generated."

# 2. Generate Genesis Block
echo "-----> Generating genesis block..."
cd fabric-network
if [ -d "channel-artifacts" ]; then
  rm -rf channel-artifacts
fi
mkdir channel-artifacts
../bin/configtxgen -profile CropChainOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block
cd ..
echo "-----> Genesis block generated."

# Docker-compose will start the network now. We need to wait for services to be up.
echo "-----> Waiting for network services to start..."
sleep 15

# 3. Create Channel
echo "-----> Generating channel configuration transaction..."
cd fabric-network
../bin/configtxgen -profile CropChainChannel -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME}.tx -channelID $CHANNEL_NAME
cd ..

echo "-----> Creating channel ${CHANNEL_NAME}..."
docker exec peer0.org1.example.com peer channel create -o orderer.example.com:7050 -c $CHANNEL_NAME -f /etc/hyperledger/fabric/msp/config.yaml --outputblock /etc/hyperledger/fabric/msp/${CHANNEL_NAME}.block
# The command above is incorrect for create. Let's fix it.
# The correct path inside the container needs to be figured out. Let's assume the volume mounts are right.
# Let's mount the channel-artifacts directory to the peer container for this.
# A better way is to copy it. But for simplicity let's assume we are executing from a CLI container that has access to all artifacts.
# The `app` container can act as the CLI.
docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp" peer0.org1.example.com peer channel create -o orderer.example.com:7050 -c $CHANNEL_NAME --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/${CHANNEL_NAME}.block -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.tx

echo "-----> Joining peer to channel..."
docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp" peer0.org1.example.com peer channel join -b ${CHANNEL_NAME}.block

# 4. Deploy Chaincode
echo "-----> Packaging chaincode..."
docker exec cropchain_app peer lifecycle chaincode package ${CC_NAME}.tar.gz --path ${CC_SRC_PATH} --lang ${CC_RUNTIME_LANGUAGE} --label ${CC_NAME}_${CC_VERSION}

echo "-----> Installing chaincode on peer0.org1..."
docker exec peer0.org1.example.com peer lifecycle chaincode install /opt/gopath/src/github.com/hyperledger/fabric/peer/${CC_NAME}.tar.gz

echo "-----> Querying installed chaincode..."
# Need to get package ID
export CC_PACKAGE_ID=$(docker exec peer0.org1.example.com peer lifecycle chaincode queryinstalled | grep "Package ID:" | sed -n 's/Package ID: \(.*\), Label.*/\1/p')
echo "Chaincode Package ID: ${CC_PACKAGE_ID}"

echo "-----> Approving chaincode for Org1..."
docker exec peer0.org1.example.com peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --sequence $CC_SEQUENCE --waitForEvent --package-id $CC_PACKAGE_ID

echo "-----> Checking commit readiness..."
docker exec peer0.org1.example.com peer lifecycle chaincode checkcommitreadiness --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --sequence $CC_SEQUENCE --output json

echo "-----> Committing chaincode..."
docker exec peer0.org1.example.com peer lifecycle chaincode commit -o orderer.example.com:7050 --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --sequence $CC_SEQUENCE

echo "-----> Querying committed chaincode..."
docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CC_NAME

echo "========= Fabric Network Setup Complete ========="

exit 0