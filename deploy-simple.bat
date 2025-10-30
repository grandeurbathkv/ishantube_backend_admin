@echo off
REM Simple deployment without password requirement
REM Run this from project directory

echo ========================================
echo Deploying to Google Cloud Run
echo ========================================
echo.

cd /d D:\demoI\ishantube_backend_admin

echo Step 1: Building Docker image...
echo.
gcloud builds submit --tag gcr.io/sturdy-bastion-476603/ishantube-backend-admin

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed!
    echo Please check the error message above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 2: Deploying to Cloud Run...
echo ========================================
echo.

gcloud run deploy ishantube-backend-admin ^
  --image gcr.io/sturdy-bastion-476603/ishantube-backend-admin ^
  --platform managed ^
  --region europe-west1 ^
  --allow-unauthenticated ^
  --port 8080 ^
  --memory 1Gi ^
  --timeout 300 ^
  --set-env-vars NODE_ENV=production,GCS_BUCKET_NAME=ishantube-images-2025,GCS_PROJECT_ID=sturdy-bastion-476603,MONGO_URI=mongodb+srv://tbswebtechnology:Khushbu%%40123@cluster0.5aecd.mongodb.net/instantdb,JWT_SECRET=jkhjhgfgfghhj

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Deployment failed!
    echo Please check the error message above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Now check the logs with this URL:
echo https://console.cloud.google.com/run/detail/europe-west1/ishantube-backend-admin/logs?project=sturdy-bastion-476603
echo.
echo Or run this command to see logs:
echo gcloud run services logs read ishantube-backend-admin --region europe-west1 --limit 50
echo.
pause
