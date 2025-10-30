# Google Cloud Run Deployment Script
# This script deploys your application to Google Cloud Run with proper GCS permissions

Write-Host "🚀 Starting Google Cloud Run Deployment..." -ForegroundColor Cyan

# Configuration
$PROJECT_ID = "sturdy-bastion-476603"
$SERVICE_NAME = "ishantube-backend-admin"
$REGION = "europe-west1"  # Using your current region
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Set the project
Write-Host "📌 Setting project to: $PROJECT_ID" -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# Enable required APIs
Write-Host "🔧 Enabling required Google Cloud APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable storage.googleapis.com

# Build and submit the Docker image
Write-Host "🏗️ Building Docker image..." -ForegroundColor Green
gcloud builds submit --tag $IMAGE_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green

# Deploy to Cloud Run
Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Green
gcloud run deploy $SERVICE_NAME `
  --image $IMAGE_NAME `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --port 8080 `
  --memory 1Gi `
  --cpu 1 `
  --timeout 300 `
  --max-instances 10 `
  --set-env-vars "NODE_ENV=production,GCS_BUCKET_NAME=ishantube-images-2025,GCS_PROJECT_ID=$PROJECT_ID"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

# Get the service account email
Write-Host "🔍 Getting Cloud Run service account..." -ForegroundColor Yellow
$SERVICE_ACCOUNT = gcloud run services describe $SERVICE_NAME --region $REGION --format "value(spec.template.spec.serviceAccountName)"

if ([string]::IsNullOrEmpty($SERVICE_ACCOUNT)) {
    # If no custom service account, Cloud Run uses default compute service account
    $PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
    $SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
    Write-Host "📝 Using default service account: $SERVICE_ACCOUNT" -ForegroundColor Yellow
} else {
    Write-Host "📝 Using service account: $SERVICE_ACCOUNT" -ForegroundColor Yellow
}

# Grant Storage Admin permissions to the service account
Write-Host "🔐 Granting GCS permissions to service account..." -ForegroundColor Yellow
gsutil iam ch "serviceAccount:${SERVICE_ACCOUNT}:objectAdmin" gs://ishantube-images-2025

Write-Host "`n✅ Deployment Complete!" -ForegroundColor Green
Write-Host "📍 Your API is available at: " -NoNewline
gcloud run services describe $SERVICE_NAME --region $REGION --format "value(status.url)"

Write-Host "`n⚠️  Don't forget to set your environment variables:" -ForegroundColor Yellow
Write-Host "   - MONGO_URI" -ForegroundColor White
Write-Host "   - JWT_SECRET" -ForegroundColor White
Write-Host "`n   You can set them with:" -ForegroundColor Cyan
Write-Host "   gcloud run services update $SERVICE_NAME --region $REGION --set-env-vars MONGO_URI=your_value,JWT_SECRET=your_value" -ForegroundColor Gray
