# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Create uploads directories if they don't exist
RUN mkdir -p uploads/architects \
    uploads/channel-partners \
    uploads/excel \
    uploads/incentives \
    uploads/products \
    uploads/users

# Expose the port your app runs on
EXPOSE 8080

# Set environment variable for port (Google Cloud Run uses PORT=8080 by default)
ENV PORT=8080

# Start the application
CMD ["npm", "start"]
