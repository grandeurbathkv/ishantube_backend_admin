@echo off
echo ========================================
echo Google Cloud Run Deployment
echo ========================================
echo.

set PROJECT_ID=sturdy-bastion-476603
set SERVICE_NAME=ishantube-backend-admin
set REGION=europe-west1
set IMAGE_NAME=gcr.io/%PROJECT_ID%/%SERVICE_NAME%

echo Setting project...
call gcloud config set project %PROJECT_ID%

echo.
echo Building Docker image...
call gcloud builds submit --tag %IMAGE_NAME%

if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    exit /b 1
)

echo.
echo Deploying to Cloud Run...
call gcloud run deploy %SERVICE_NAME% ^
  --image %IMAGE_NAME% ^
  --platform managed ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --port 8080 ^
  --memory 1Gi ^
  --timeout 300 ^
  --set-env-vars "NODE_ENV=production,GCS_BUCKET_NAME=ishantube-images-2025,GCS_PROJECT_ID=%PROJECT_ID%" ^
  --clear-env-vars "GOOGLE_APPLICATION_CREDENTIALS"

if %ERRORLEVEL% NEQ 0 (
    echo Deployment failed!
    exit /b 1
)

echo.
echo ========================================
echo Granting GCS permissions...
echo ========================================

REM Get project number
for /f "delims=" %%i in ('gcloud projects describe %PROJECT_ID% --format="value(projectNumber)"') do set PROJECT_NUMBER=%%i

set SERVICE_ACCOUNT=%PROJECT_NUMBER%-compute@developer.gserviceaccount.com

echo Using service account: %SERVICE_ACCOUNT%

call gsutil iam ch serviceAccount:%SERVICE_ACCOUNT%:objectAdmin gs://ishantube-images-2025

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Your API URL:
call gcloud run services describe %SERVICE_NAME% --region %REGION% --format "value(status.url)"
echo.
echo IMPORTANT: Set environment variables via Cloud Console:
echo - MONGO_URI
echo - JWT_SECRET
echo.
pause
