$PROJECT_ID = "sturdy-bastion-476603"

Write-Host "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Get Project Number
Write-Host "Getting project number..."
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"

if (-not $PROJECT_NUMBER) {
    Write-Host "Could not get project number. Please ensure you are logged in with 'gcloud auth login'" -ForegroundColor Red
    exit 1
}

$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

Write-Host "Granting roles to Service Account: $SERVICE_ACCOUNT..."

# Grant Cloud Run Admin
Write-Host "Granting roles/run.admin..."
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SERVICE_ACCOUNT" `
    --role="roles/run.admin"

# Grant Service Account User
Write-Host "Granting roles/iam.serviceAccountUser..."
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SERVICE_ACCOUNT" `
    --role="roles/iam.serviceAccountUser"

Write-Host "Permissions updated successfully!" -ForegroundColor Green
