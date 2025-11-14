FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run buildold

# Expose port (if needed for HTTP transport)
EXPOSE 3000

# Start the application
CMD ["node", "dist/solution.js"]