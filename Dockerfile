# Use the official Node.js 18 image as a base
FROM node:18-bullseye

# Install the critical missing dependency for Fabric binaries
RUN apt-get update && apt-get install -y libtool libltdl-dev && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /workspace

# The base image already has a 'node' user. We will use it.
# This line is not strictly necessary but makes ownership clear.
RUN chown -R node:node /workspace

# Switch to the non-root user
USER node