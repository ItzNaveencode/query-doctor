FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application source code
COPY src ./src

# Expose the API port
EXPOSE 3000

# Start the Node.js Express server
CMD ["node", "src/index.js"]
