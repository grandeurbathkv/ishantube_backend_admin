# Quick Fix Script for Current Deployment
# Run this to fix GCS permissions for your existing Cloud Run service

Write-Host "🔧 Fixing GCS permissions for Cloud Run service..." -ForegroundColor Cyan

$PROJECT_ID = "sturdy-bastion-476603"
$SERVICE_NAME = "ishantube-backend-admin"
$REGION = "europe-west1"
$BUCKET_NAME = "ishantube-images-2025"

# Set project
gcloud config set project $PROJECT_ID

# Get the service account
Write-Host "🔍 Getting service account..." -ForegroundColor Yellow
$SERVICE_ACCOUNT = gcloud run services describe $SERVICE_NAME --region $REGION --format "value(spec.template.spec.serviceAccountName)"

if ([string]::IsNullOrEmpty($SERVICE_ACCOUNT)) {
    # Use default compute service account
    $PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
    $SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
    Write-Host "📝 Using default service account: $SERVICE_ACCOUNT" -ForegroundColor Yellow
} else {
    Write-Host "📝 Using service account: $SERVICE_ACCOUNT" -ForegroundColor Yellow
}

# Grant GCS permissions
Write-Host "🔐 Granting Storage Object Admin role..." -ForegroundColor Yellow
gsutil iam ch "serviceAccount:${SERVICE_ACCOUNT}:objectAdmin" "gs://$BUCKET_NAME"

# Update the service to trigger a new deployment with updated code
Write-Host "🔄 Redeploying with updated configuration..." -ForegroundColor Yellow
gcloud run services update $SERVICE_NAME `
  --region $REGION `
  --set-env-vars "GCS_BUCKET_NAME=$BUCKET_NAME,GCS_PROJECT_ID=$PROJECT_ID" `
  --clear-env-vars "GOOGLE_APPLICATION_CREDENTIALS"

Write-Host "`n✅ Permissions updated!" -ForegroundColor Green
Write-Host "Now redeploy your service with the updated middleware code." -ForegroundColor Cyan
Write-Host "`nRun: .\deploy-to-cloud-run.ps1" -ForegroundColor Yellow
