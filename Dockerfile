# Use the official Node.js 18 image as a base
FROM node:18-bullseye

# Install the critical missing dependency for Fabric binaries
RUN apt-get update && apt-get install -y libtool libltdl-dev && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /workspace

# Copy application dependency files
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of the application code
COPY . .