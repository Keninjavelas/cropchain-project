Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CropChain Network Startup Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Stop and clean up existing containers
Write-Host "`n[1/5] Stopping existing containers..." -ForegroundColor Yellow
docker-compose down -v

# Start the blockchain infrastructure
Write-Host "`n[2/5] Starting blockchain infrastructure (orderer, peer, CA)..." -ForegroundColor Yellow
docker-compose up -d orderer.example.com peer0.org1.example.com ca.org1.example.com

# Wait for services to be ready
Write-Host "`n[3/5] Waiting for blockchain services to initialize (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check if containers are running
Write-Host "`nChecking container status..." -ForegroundColor Green
docker ps --filter "name=orderer.example.com" --filter "name=peer0.org1.example.com" --filter "name=ca.org1.example.com"

# Start CLI container
Write-Host "`n[4/5] Starting CLI container..." -ForegroundColor Yellow
docker-compose up -d cli

Write-Host "Waiting for CLI to be ready (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Create channel and join peer
Write-Host "`n[5/5] Setting up channel..." -ForegroundColor Yellow
docker exec cli peer channel create -o orderer.example.com:7050 -c cropchainchannel -f /opt/gopath/src/github.com/hyperledger/fabric/peer/fabric-network/channel-artifacts/cropchainchannel.tx --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/fabric-network/channel-artifacts/cropchainchannel.block
if ($LASTEXITCODE -ne 0) {
    Write-Host "Channel may already exist, continuing..." -ForegroundColor Yellow
}

Write-Host "Joining peer to channel..." -ForegroundColor Yellow
docker exec cli peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/fabric-network/channel-artifacts/cropchainchannel.block
if ($LASTEXITCODE -ne 0) {
    Write-Host "Peer may already be joined, continuing..." -ForegroundColor Yellow
}

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "Blockchain network is ready!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Deploy chaincode: bash scripts/deploy-chaincode.sh (in Git Bash/WSL)" -ForegroundColor White
Write-Host "2. Start application: docker-compose up -d app mysql ipfs" -ForegroundColor White
Write-Host ""
