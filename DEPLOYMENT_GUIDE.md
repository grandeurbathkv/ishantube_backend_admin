# Google Cloud Deployment Guide

This guide will help you deploy the IshanTube Backend Admin application to Google Cloud Platform.

## Prerequisites

1. **Google Cloud Account**: Create an account at https://cloud.google.com
2. **Google Cloud CLI**: Install from https://cloud.google.com/sdk/docs/install
3. **Docker**: Install from https://docs.docker.com/get-docker/
4. **Project Setup**: Your GCS bucket and credentials are already configured

## Deployment Options

### Option 1: Deploy to Cloud Run (Recommended)

Cloud Run is a fully managed platform that automatically scales your application.

#### Step 1: Setup Google Cloud CLI

```powershell
# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project sturdy-bastion-476603

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

#### Step 2: Build and Deploy

```powershell
# Build the Docker image
gcloud builds submit --tag gcr.io/sturdy-bastion-476603/ishantube-backend-admin

# Deploy to Cloud Run
gcloud run deploy ishantube-backend-admin `
  --image gcr.io/sturdy-bastion-476603/ishantube-backend-admin `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --set-env-vars "MONGO_URI=YOUR_MONGO_URI,JWT_SECRET=YOUR_JWT_SECRET,GCS_BUCKET_NAME=ishantube-images-2025,GCS_PROJECT_ID=sturdy-bastion-476603"
```

#### Step 3: Set Environment Variables

You can set environment variables in the Cloud Run console or via CLI:

```powershell
gcloud run services update ishantube-backend-admin `
  --region us-central1 `
  --set-env-vars "MONGO_URI=YOUR_MONGO_URI" `
  --set-env-vars "JWT_SECRET=YOUR_JWT_SECRET" `
  --set-env-vars "GCS_BUCKET_NAME=ishantube-images-2025" `
  --set-env-vars "GCS_PROJECT_ID=sturdy-bastion-476603"
```

**Important**: For the GCS credentials, you should:
1. Go to Cloud Run Console > Your Service > Edit & Deploy New Revision
2. Go to "Container" tab > "Variables & Secrets"
3. Mount your `gcs-key.json` as a secret, OR
4. Use Workload Identity (recommended) so you don't need to upload the key file

#### Step 4: Setup GCS Credentials (Recommended Method)

Use Google Cloud's built-in authentication instead of a key file:

1. Create a service account for Cloud Run:
```powershell
gcloud iam service-accounts create ishantube-backend-sa `
  --display-name "IshanTube Backend Service Account"
```

2. Grant Storage permissions:
```powershell
gcloud projects add-iam-policy-binding sturdy-bastion-476603 `
  --member="serviceAccount:ishantube-backend-sa@sturdy-bastion-476603.iam.gserviceaccount.com" `
  --role="roles/storage.objectAdmin"
```

3. Update Cloud Run service to use this service account:
```powershell
gcloud run services update ishantube-backend-admin `
  --region us-central1 `
  --service-account ishantube-backend-sa@sturdy-bastion-476603.iam.gserviceaccount.com
```

4. Update your `src/middleware/gcs.upload.middleware.js` to use default credentials (it should detect them automatically).

### Option 2: Deploy to App Engine

```powershell
# Create app.yaml file first (see below)
gcloud app deploy
```

Create `app.yaml`:
```yaml
runtime: nodejs20
env: standard
instance_class: F2

env_variables:
  MONGO_URI: "YOUR_MONGO_URI"
  JWT_SECRET: "YOUR_JWT_SECRET"
  GCS_BUCKET_NAME: "ishantube-images-2025"
  GCS_PROJECT_ID: "sturdy-bastion-476603"

automatic_scaling:
  min_instances: 0
  max_instances: 10
```

### Option 3: Deploy to Compute Engine (VM)

1. Create a VM instance
2. SSH into the VM
3. Install Docker
4. Pull and run your Docker image

## Testing Your Deployment

After deployment, you'll get a URL like:
```
https://ishantube-backend-admin-xxxxxxxxxx-uc.a.run.app
```

Test your API:
```powershell
# Test health endpoint
curl https://YOUR-CLOUD-RUN-URL.run.app/api

# Test with API docs
# Visit: https://YOUR-CLOUD-RUN-URL.run.app/api-docs
```

## Local Docker Testing

Before deploying, test your Docker image locally:

```powershell
# Build the image
docker build -t ishantube-backend-admin .

# Run the container
docker run -p 8080:8080 `
  -e MONGO_URI="YOUR_MONGO_URI" `
  -e JWT_SECRET="YOUR_JWT_SECRET" `
  -e GCS_BUCKET_NAME="ishantube-images-2025" `
  -e GCS_PROJECT_ID="sturdy-bastion-476603" `
  -v "${PWD}/gcs-key.json:/app/gcs-key.json" `
  ishantube-backend-admin

# Test it
curl http://localhost:8080/api
```

## Troubleshooting

### View Logs
```powershell
# Cloud Run logs
gcloud run services logs read ishantube-backend-admin `
  --region us-central1 `
  --limit 50

# Follow logs in real-time
gcloud run services logs tail ishantube-backend-admin `
  --region us-central1
```

### Common Issues

1. **Port Issues**: Cloud Run uses PORT=8080 by default. Make sure your app listens on `process.env.PORT`.

2. **Memory Issues**: If your app crashes, increase memory:
```powershell
gcloud run services update ishantube-backend-admin `
  --region us-central1 `
  --memory 1Gi
```

3. **Timeout Issues**: Increase timeout (max 60 minutes for Cloud Run):
```powershell
gcloud run services update ishantube-backend-admin `
  --region us-central1 `
  --timeout 300
```

4. **GCS Authentication**: Ensure your service account has proper permissions to access the GCS bucket.

## Cost Optimization

- Cloud Run only charges when your app is processing requests
- Set min instances to 0 for development
- Use `--memory 512Mi` for basic workloads (can go up to 4Gi)
- Monitor usage in Google Cloud Console

## Continuous Deployment

Use the included `cloudbuild.yaml` for automatic deployments:

1. Connect your GitHub/GitLab repository to Cloud Build
2. Set up a trigger on push to main branch
3. Cloud Build will automatically build and deploy

## Security Best Practices

1. ✅ Never commit `.env` or `gcs-key.json` to Git
2. ✅ Use Secret Manager for sensitive data
3. ✅ Use service accounts with minimal required permissions
4. ✅ Enable VPC connector if connecting to private resources
5. ✅ Set up Cloud Armor for DDoS protection
6. ✅ Use HTTPS only (Cloud Run provides this by default)

## Next Steps

1. Set up custom domain
2. Configure Cloud CDN for static assets
3. Set up monitoring and alerts
4. Configure backup strategy for MongoDB
5. Set up staging and production environments

## Support

For issues, check:
- Cloud Run documentation: https://cloud.google.com/run/docs
- GCS documentation: https://cloud.google.com/storage/docs
- Your application logs in Cloud Console
