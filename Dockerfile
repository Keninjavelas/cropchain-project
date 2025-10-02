FROM node:18-bullseye

# Install prerequisites for Hyperledger Fabric
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Go for chaincode development
RUN curl -L https://golang.org/dl/go1.19.linux-amd64.tar.gz | tar -C /usr/local -xz
ENV PATH=$PATH:/usr/local/go/bin

# Install Fabric binaries and docker images
ENV FABRIC_VERSION=2.2.0
RUN curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- -f ${FABRIC_VERSION} -d ${FABRIC_VERSION} -b ${FABRIC_VERSION}

# Set working directory
WORKDIR /workspace

# Copy project files
COPY . .

# Grant execute permissions to the setup script
RUN chmod +x /workspace/scripts/setup-fabric.sh

# Expose the application port
EXPOSE 3000

# The command to start the service will be handled by docker-compose.yml