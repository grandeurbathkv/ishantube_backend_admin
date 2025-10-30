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

# Remove sensitive files (environment variables should come from Cloud Run)
# Key files should NOT be in the container for security
RUN rm -f .env gcs-key.json google-cloud-key.json 2>/dev/null || true

# Create uploads directories if they don't exist
RUN mkdir -p uploads/architects \
    uploads/channel-partners \
    uploads/excel \
    uploads/incentives \
    uploads/products \
    uploads/users

# Expose the port your app runs on
EXPOSE 8080

# Set environment variables for Cloud Run
ENV PORT=8080
ENV NODE_ENV=production
# Don't set GOOGLE_APPLICATION_CREDENTIALS - let Cloud Run use default auth

# Start the application
CMD ["npm", "start"]
