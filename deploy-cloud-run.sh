#!/bin/bash

# Cloud Run Deployment Script for ishantube-backend-admin
# This script deploys the backend to Google Cloud Run with all required environment variables

echo "🚀 Starting deployment to Cloud Run..."

# Set the project
gcloud config set project ishantube-backend-admin

# Deploy to Cloud Run with environment variables
# Note: GOOGLE_APPLICATION_CREDENTIALS is not needed - Cloud Run uses default service account
gcloud run deploy ishantube-backend-admin \
  --source . \
  --region asia-south2 \
  --allow-unauthenticated \
  --set-env-vars="MONGO_URI=mongodb+srv://bathgrandeur:Software_kv@cluster0.ives8vx.mongodb.net/instantdb" \
  --set-env-vars="JWT_SECRET=jkhjhgfgfghhj" \
  --set-env-vars="GCS_BUCKET_NAME=ishantube-images-2025" \
  --set-env-vars="GCS_PROJECT_ID=sturdy-bastion-476603-r2" \
  --set-env-vars="NODE_ENV=production" \
  --timeout=300 \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=10

echo "✅ Deployment complete!"
echo "📝 Check logs at: https://console.cloud.google.com/run?project=ishantube-backend-admin"
