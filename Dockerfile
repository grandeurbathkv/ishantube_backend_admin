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

# ✅ Step 5: Copy your GCS key file into container
COPY gcs-key.json /app/gcs-key.json

# Remove .env file if it exists (environment variables should come from Cloud Run)
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

# Set environment variable for port (Google Cloud Run uses PORT=8080 by default)
ENV PORT=8080
# Unset GOOGLE_APPLICATION_CREDENTIALS to use default Cloud Run authentication
ENV GOOGLE_APPLICATION_CREDENTIALS=""

# Start the application
CMD ["npm", "start"]
