# Use Node.js 20 LTS as base image
FROM node:20-slim

# Install qpdf for PDF decryption and other dependencies
RUN apt-get update && apt-get install -y \
    qpdf \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Create temp directory for PDF processing
RUN mkdir -p /app/temp && chmod 755 /app/temp

# Expose port
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Start the server
CMD ["node", "server.js"]
