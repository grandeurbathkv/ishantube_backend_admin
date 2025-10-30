# 🚀 Quick Deployment Guide

## Step 1: Build Docker Image
```powershell
gcloud builds submit --tag gcr.io/sturdy-bastion-476603/ishantube-backend-admin
```

## Step 2: Deploy to Cloud Run
```powershell
gcloud run deploy ishantube-backend-admin --image gcr.io/sturdy-bastion-476603/ishantube-backend-admin --platform managed --region europe-west1 --allow-unauthenticated --port 8080 --memory 1Gi --set-env-vars "NODE_ENV=production,GCS_BUCKET_NAME=ishantube-images-2025,GCS_PROJECT_ID=sturdy-bastion-476603,MONGO_URI=mongodb+srv://tbswebtechnology:Khushbu%40123@cluster0.5aecd.mongodb.net/instantdb,JWT_SECRET=jkhjhgfgfghhj"
```

## Step 3: Grant GCS Permissions (First time only)
```powershell
# Get project number
$PROJECT_NUMBER = gcloud projects describe sturdy-bastion-476603 --format="value(projectNumber)"

# Grant storage permissions
gsutil iam ch serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com:objectAdmin gs://ishantube-images-2025
```

## ✅ What's Fixed:
- ✅ Production mode automatically skips .env file
- ✅ No GOOGLE_APPLICATION_CREDENTIALS needed in Cloud Run
- ✅ Uses default Cloud Run service account authentication
- ✅ Key file only used in local development

## 🧪 Test After Deployment:
```powershell
# Get your service URL
gcloud run services describe ishantube-backend-admin --region europe-west1 --format="value(status.url)"

# Test the API
curl YOUR_URL/api
```
