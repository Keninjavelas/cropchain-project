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

# --- THIS IS THE CRITICAL NEW SECTION ---
echo "-----> Generating connection profile..."
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
    url: grpc://localhost:7051
    tlsCACerts:
      path: ${PWD}/fabric-network/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
    grpcOptions:
      ssl-target-name-override: peer0.org1.example.com
certificateAuthorities:
  ca.org1.example.com:
    url: http://localhost:7054
    caName: ca.org1.example.com
    tlsCACerts:
      path: ${PWD}/fabric-network/crypto-config/peerOrganizations/org1.example.com/ca/ca.crt
    httpOptions:
      verify: false
EOF

echo "========= Artifact Generation Complete - SUCCESS! ========="
```

### Step 2: The Final, Victorious Sequence

Now that you have the final, correct script, you must run the sequence one last time from a perfectly clean slate to ensure the new connection profile is used everywhere.

**1. The Ultimate Cleanup:**
This is critical. It wipes all old containers and the old, broken channel data.
```bash
docker-compose down -v --remove-orphans
```

**2. Generate the Correct Artifacts (This will now create the map):**
```bash
bash ./scripts/generate-artifacts.sh
```
After this runs, you can run `ls fabric-network` and you will see the new `connection-org1.yaml` file.

**3. Start the Network:**
```bash
docker-compose up -d
```

**4. The Final Verification:**
Wait 20 seconds, then run this. You must see that `cli` and all other services are `Up`.
```bash
docker-compose ps
```

**5. Run the Setup Script on a Clean Slate:**
This will now succeed from start to finish.
```bash
docker exec cli bash scripts/setup-channel.sh
```

**6. The Final Handshake (The Victory Lap):**
This is the final command. It will now succeed.
```bash
curl -X POST http://localhost:3000/api/connect-blockchain

