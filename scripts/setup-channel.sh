#!/bin/bash

echo "========= Setting up Channel and Chaincode from within CLI Container ========="

export CHANNEL_NAME=cropchainchannel
export CC_NAME=cropchain
export CC_VERSION=1.0
export CC_SEQUENCE=1
export CC_SRC_PATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode"
export CC_RUNTIME_LANGUAGE=golang

# 1. Create Channel
echo "-----> Creating channel ${CHANNEL_NAME}..."
peer channel create -o orderer.example.com:7050 -c $CHANNEL_NAME -f ./fabric-network/channel-artifacts/${CHANNEL_NAME}.tx --outputBlock ./fabric-network/channel-artifacts/${CHANNEL_NAME}.block
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to create channel."
  exit 1
fi

# 2. Join Peer to Channel
echo "-----> Joining peer to channel..."
peer channel join -b ./fabric-network/channel-artifacts/${CHANNEL_NAME}.block
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to join peer to channel."
  exit 1
fi

# 3. Deploy Chaincode
echo "-----> Packaging chaincode..."
peer lifecycle chaincode package ${CC_NAME}.tar.gz --path ${CC_SRC_PATH} --lang ${CC_RUNTIME_LANGUAGE} --label ${CC_NAME}_${CC_VERSION}
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to package chaincode."
  exit 1
fi

echo "-----> Installing chaincode on peer0.org1..."
peer lifecycle chaincode install ${CC_NAME}.tar.gz
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to install chaincode."
  exit 1
fi

echo "-----> Querying installed chaincode to get Package ID..."
peer lifecycle chaincode queryinstalled >&log.txt
export CC_PACKAGE_ID=$(sed -n '/Package ID:/{s/Package ID: //;s/, Label:.*$//;p;}' log.txt)
if [ -z "$CC_PACKAGE_ID" ]; then
    echo "ERROR: Failed to get chaincode package ID."
    exit 1
fi
echo "Chaincode Package ID: ${CC_PACKAGE_ID}"

echo "-----> Approving chaincode for Org1..."
peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --sequence $CC_SEQUENCE --package-id $CC_PACKAGE_ID --waitForEvent
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to approve chaincode."
  exit 1
fi

echo "-----> Committing chaincode..."
peer lifecycle chaincode commit -o orderer.example.com:7050 --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --sequence $CC_SEQUENCE
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to commit chaincode."
  exit 1
fi

echo "========= Channel and Chaincode Setup Complete - SUCCESS! ========="

