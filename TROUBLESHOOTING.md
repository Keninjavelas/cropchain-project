# CropChain Network Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: CA Container Failing to Start

**Symptoms:**

- `ca.org1.example.com` container exits immediately
- Error: "Failed to find private key for certificate"

**Solution:**

The CA was configured to use specific certificate paths that didn't match the cryptogen-generated structure. This has been fixed in the docker-compose.yml.

### Issue 2: Containers Not Running

**Symptoms:**

- Docker containers show "Exited" status
- Application cannot connect to blockchain

**Solution:**

Run the startup script in the correct order:

```powershell
# PowerShell
.\start-network.ps1
```

Or if using Git Bash/WSL:

```bash
bash start-network.sh
```

### Issue 3: Application Connection Issues

**Symptoms:**

- App connects but cannot submit transactions
- "Blockchain not initialized" errors

**Root Cause:**

- Connection profile was using container names instead of localhost
- Discovery mode was set incorrectly for host-to-container communication

**Solution:**

Fixed in `connection-org1.yaml` and `app.js` (already applied)

## Startup Sequence

### Step 1: Start the Blockchain Network

```powershell
.\start-network.ps1
```

This will:

1. Stop and clean existing containers
2. Start orderer, peer, and CA
3. Create and join the channel

### Step 2: Deploy the Chaincode

```bash
# Use Git Bash or WSL for this step
bash scripts/deploy-chaincode.sh
```

### Step 3: Start Application Services

```powershell
docker-compose up -d app mysql ipfs
```

### Step 4: Verify Everything is Running

```powershell
docker ps
```

You should see all containers in "Up" status:

- orderer.example.com
- peer0.org1.example.com
- ca.org1.example.com
- cli
- cropchain_app
- cropchain_mysql
- cropchain_ipfs

### Step 5: Test the Application

Open your browser to: <http://localhost:3000>

Click "Connect to Blockchain" to initialize the connection.

## Checking Logs

If issues persist, check the logs:

```powershell
# CA logs
docker logs ca.org1.example.com

# Orderer logs
docker logs orderer.example.com

# Peer logs
docker logs peer0.org1.example.com

# Application logs
docker logs cropchain_app
```

## Common Commands

### Restart Everything

```powershell
docker-compose down -v
.\start-network.ps1
bash scripts/deploy-chaincode.sh  # Git Bash/WSL
docker-compose up -d app mysql ipfs
```

### Stop Everything

```powershell
docker-compose down
```

### Clean Restart (removes all data)

```powershell
docker-compose down -v
docker system prune -f
.\start-network.ps1
bash scripts/deploy-chaincode.sh
docker-compose up -d app mysql ipfs
```

## Network Architecture

```text
Host Machine (Windows)
  ↓
  localhost:7050 → orderer.example.com
  localhost:7051 → peer0.org1.example.com
  localhost:7054 → ca.org1.example.com
  localhost:3000 → cropchain_app
  localhost:5001 → IPFS
```

The application runs on the host and connects to Docker containers via localhost ports.

## Key Configuration Changes Made

1. **docker-compose.yml**: Fixed CA configuration to avoid certificate/key mismatch
2. **connection-org1.yaml**: Changed peer and CA URLs from container names to localhost
3. **app.js**: Changed discovery mode to `asLocalhost: true` for proper service discovery

## If Connection Still Fails

1. Ensure Docker Desktop is running
2. Check if ports are available:

   ```powershell
   netstat -ano | findstr "7050 7051 7054 3000"
   ```

3. Verify network exists:

   ```powershell
   docker network ls | findstr cropchain
   ```

4. Regenerate crypto material if needed:

   ```bash
   cd fabric-network
   ../bin/cryptogen generate --config=./crypto-config.yaml --output="crypto-config"
   ```
