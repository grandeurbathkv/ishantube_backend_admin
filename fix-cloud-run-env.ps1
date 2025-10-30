# Update Cloud Run Service - Remove GOOGLE_APPLICATION_CREDENTIALS
# Run this script to fix the environment variable issue

Write-Host "🔧 Updating Cloud Run service configuration..." -ForegroundColor Cyan

$PROJECT_ID = "sturdy-bastion-476603"
$SERVICE_NAME = "ishantube-backend-admin"
$REGION = "europe-west1"

# Update service to remove GOOGLE_APPLICATION_CREDENTIALS
Write-Host "Removing GOOGLE_APPLICATION_CREDENTIALS environment variable..." -ForegroundColor Yellow

gcloud run services update $SERVICE_NAME `
  --region $REGION `
  --clear-env-vars "GOOGLE_APPLICATION_CREDENTIALS"

Write-Host "`n✅ Environment variable removed!" -ForegroundColor Green
Write-Host "Now the service will use default Cloud Run authentication." -ForegroundColor Cyan
