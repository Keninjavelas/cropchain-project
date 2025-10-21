#!/bin/bash
set -euo pipefail

# Configuration
CC_NAME="cropchain"
CC_LABEL="cropchain_1"
CC_LANG="golang"
CC_PATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode"
CC_SRC_DIR="${CC_PATH}"
CC_PACKAGE="${CC_PATH}/${CC_NAME}.tar.gz"
CC_SEQUENCE=1
CHANNEL_NAME="cropchainchannel"
ORDERER_ADDR="orderer.example.com:7050"

echo "[1/6] Packaging chaincode"
docker exec cli bash -lc "rm -f ${CC_PACKAGE} && peer lifecycle chaincode package ${CC_PACKAGE} --path ${CC_SRC_DIR} --lang ${CC_LANG} --label ${CC_LABEL}"

echo "[2/6] Installing chaincode on peer0.org1.example.com"
docker exec cli bash -lc "peer lifecycle chaincode install ${CC_PACKAGE}"

echo "[3/6] Query installed to get package ID"
PKG_ID=$(docker exec cli bash -lc "peer lifecycle chaincode queryinstalled | grep ${CC_LABEL} | sed -n 's/Package ID: \(.*\), Label:.*/\1/p'")
if [ -z "${PKG_ID}" ]; then
  echo "Failed to extract package ID" >&2
  exit 1
fi
echo "Package ID: ${PKG_ID}"

echo "[4/6] Approving chaincode definition for Org1"
docker exec cli bash -lc "peer lifecycle chaincode approveformyorg -o ${ORDERER_ADDR} --channelID ${CHANNEL_NAME} --name ${CC_NAME} --version 1.0 --package-id ${PKG_ID} --sequence ${CC_SEQUENCE} --init-required=false"

echo "[5/6] Checking commit readiness"
docker exec cli bash -lc "peer lifecycle chaincode checkcommitreadiness --channelID ${CHANNEL_NAME} --name ${CC_NAME} --version 1.0 --sequence ${CC_SEQUENCE} --init-required=false --output json"

echo "[6/6] Committing chaincode definition"
docker exec cli bash -lc "peer lifecycle chaincode commit -o ${ORDERER_ADDR} --channelID ${CHANNEL_NAME} --name ${CC_NAME} --version 1.0 --sequence ${CC_SEQUENCE} --init-required=false --peerAddresses peer0.org1.example.com:7051"

echo "Querying committed chaincode"
docker exec cli bash -lc "peer lifecycle chaincode querycommitted --channelID ${CHANNEL_NAME} --name ${CC_NAME}"

echo "Done."


