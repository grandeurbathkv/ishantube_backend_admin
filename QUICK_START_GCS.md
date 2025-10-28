# 🎯 Quick Start Guide - Google Cloud Storage Setup

## 📋 Prerequisites
- Google Cloud account
- Access to `ishantube-images-2025` bucket

## 🚀 Setup Steps (5 minutes)

### Step 1: Get Service Account Key from Google Cloud
1. Open Google Cloud Console: https://console.cloud.google.com/
2. Go to **IAM & Admin** → **Service Accounts**
3. Create new service account (or use existing)
4. Grant **Storage Admin** role
5. Click on service account → **Keys** → **Add Key** → **Create New Key** → **JSON**
6. Download the JSON key file

### Step 2: Setup in Project
```bash
# 1. Copy the downloaded JSON file to project root
# Rename it to: google-cloud-key.json

# 2. Open .env file and update these values:
GCS_BUCKET_NAME=ishantube-images-2025
GCS_PROJECT_ID=your-actual-project-id    # Get from JSON file
GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json
```

### Step 3: Test Connection
```bash
npm run test:gcs
```

Expected output:
```
✅ ✅ ✅ CONNECTION TEST SUCCESSFUL! ✅ ✅ ✅
🚀 Your Google Cloud Storage is ready to use!
```

### Step 4: Start Server
```bash
npm run dev
```

## 🎉 That's It!

Your backend is now configured to use Google Cloud Storage for all image uploads!

## 📸 Test Upload

Use Postman or any API client to test:

### Upload User Image
```
POST http://localhost:5000/api/user/register
Headers: Authorization: Bearer YOUR_TOKEN
Body: form-data
  - Image: [select image file]
  - Name: "Test User"
  - Email: "test@example.com"
  - Password: "password123"
```

### Upload Product Image
```
POST http://localhost:5000/api/product
Headers: Authorization: Bearer YOUR_TOKEN
Body: form-data
  - Prod_image: [select image file]
  - Product_code: "PROD-001"
  - Product_name: "Test Product"
  - ... other required fields
```

## 📊 Response Format

Successful upload will return:
```json
{
  "success": true,
  "message": "Upload successful",
  "data": {
    "Image": "https://storage.googleapis.com/ishantube-images-2025/users/users-1234567890.jpg"
  }
}
```

## 🆘 Troubleshooting

### ❌ "Authentication error"
- Check if `google-cloud-key.json` is in the project root
- Verify `GCS_PROJECT_ID` matches the project in JSON file

### ❌ "Bucket not found"
- Verify bucket name: `ishantube-images-2025`
- Check service account has access to bucket

### ❌ "Permission denied"
- Service account needs **Storage Admin** or **Storage Object Admin** role

## 📁 File Organization

Files are automatically organized:
```
ishantube-images-2025/
├── architects/architect-1234567890.jpg
├── channel-partners/cp-1234567890.jpg
├── users/users-1234567890.jpg
├── incentives/incentive-1234567890.jpg
├── products/product-1234567890.jpg
└── excel/excel-1234567890.xlsx
```

## 🔒 Security

✅ `google-cloud-key.json` is in `.gitignore`
✅ `.env` file is in `.gitignore`
⚠️ Never commit these files to version control!

## 📞 Need Help?

Refer to detailed documentation:
- `GOOGLE_CLOUD_SETUP.md` - Full setup guide
- `MIGRATION_NOTES.md` - Technical migration details

---

**Ready to go! 🚀**
