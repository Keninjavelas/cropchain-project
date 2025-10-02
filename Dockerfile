FROM node:18-bullseye

# Install prerequisites as root
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Go for chaincode development
RUN curl -L https://golang.org/dl/go1.19.linux-amd64.tar.gz | tar -C /usr/local -xz
ENV PATH=$PATH:/usr/local/go/bin

# Set working directory
WORKDIR /workspace

# Copy project files (still as root to ensure they are there)
COPY . .

# --- PERMISSION FIX ---
# Create a non-root user 'node' and its home directory.
# Then, grant this new user ownership of the workspace directory.
RUN useradd --create-home --shell /bin/bash node && \
    chown -R node:node /workspace

# Switch to the non-root user for all subsequent operations
USER node

# Expose the application port
EXPOSE 3000

# The command to start the service is handled by docker-compose.yml
