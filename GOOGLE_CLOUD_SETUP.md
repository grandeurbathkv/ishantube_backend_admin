# Google Cloud Storage Setup Instructions

## Step 1: Create Service Account in Google Cloud Console

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select Your Project** (or create new one if needed)
3. **Go to IAM & Admin > Service Accounts**:
   - Click on left sidebar menu
   - Click "IAM & Admin"
   - Click "Service Accounts"

## Step 2: Create New Service Account

1. Click **"+ CREATE SERVICE ACCOUNT"** button at top
2. **Service account details**:
   - Service account name: `ishantube-storage-admin`
   - Service account ID: (auto-generated)
   - Description: `Service account for ishantube image uploads`
   - Click **CONTINUE**

3. **Grant this service account access to project**:
   - Select role: **Storage Admin** (or Storage Object Admin)
   - Click **CONTINUE**
   - Click **DONE**

## Step 3: Create and Download JSON Key

1. Find your newly created service account in the list
2. Click on the **three dots** (⋮) on the right side
3. Click **"Manage keys"**
4. Click **"ADD KEY"** > **"Create new key"**
5. Select **JSON** format
6. Click **CREATE**
7. **JSON key file will be downloaded automatically**

## Step 4: Setup in Your Project

1. **Rename the downloaded JSON file** to: `google-cloud-key.json`
2. **Move this file** to your project root: `d:\demoI\ishantube_backend_admin\`
3. **Update `.env` file** with your project details:
   ```
   GCS_BUCKET_NAME=ishantube-images-2025
   GCS_PROJECT_ID=your-actual-project-id
   GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json
   ```
4. **Find your Project ID**:
   - Open the JSON key file
   - Look for `"project_id": "your-project-id"`
   - Copy this value to your `.env` file

## Step 5: Verify Bucket Access

Your bucket `ishantube-images-2025` should be accessible with the service account.

## Step 6: Add to .gitignore

Make sure `google-cloud-key.json` is in your `.gitignore` file:
```
google-cloud-key.json
.env
```

## Step 7: Test the Setup

Run your backend server:
```bash
npm run dev
```

Try uploading an image through any API endpoint that accepts images.

## Important Security Notes

⚠️ **NEVER commit `google-cloud-key.json` to version control**
⚠️ **NEVER share this key file publicly**
⚠️ **Keep your `.env` file secure**

## Folder Structure in Google Cloud Storage

The middleware will automatically organize uploads into folders:
- `architects/` - Architect images
- `channel-partners/` - Channel partner images
- `users/` - User images
- `incentives/` - Incentive images
- `products/` - Product images
- `excel/` - Excel file uploads

## Public URL Format

All uploaded files will be accessible via:
```
https://storage.googleapis.com/ishantube-images-2025/folder-name/filename
```

Example:
```
https://storage.googleapis.com/ishantube-images-2025/products/product-1234567890-123456789.jpg
```
