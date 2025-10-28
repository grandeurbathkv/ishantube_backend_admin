# 🔄 Migration from Multer to Google Cloud Storage

## ✅ Changes Made

### 1. **New Middleware Created**
- **File**: `src/middleware/gcs.upload.middleware.js`
- Replaces: `src/middleware/upload.middleware.js` (backed up as `.backup`)
- Uses: `@google-cloud/storage` instead of `multer` disk storage

### 2. **All Routers Updated**
Updated import statements in:
- ✅ `src/moduls/users/user.router.js`
- ✅ `src/moduls/customer/architect.router.js`
- ✅ `src/moduls/customer/channelPartner.router.js`
- ✅ `src/moduls/customer/channelPartnerIncentive.router.js`
- ✅ `src/moduls/Inventory/product.router.js`

### 3. **Static File Serving Disabled**
- Commented out in `src/index.js`: `app.use('/uploads', express.static('uploads'));`
- Images are now served directly from Google Cloud Storage

### 4. **Environment Variables Added**
Added to `.env`:
```
GCS_BUCKET_NAME=ishantube-images-2025
GCS_PROJECT_ID=your-project-id-here
GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json
```

### 5. **Dependencies**
- ✅ Installed: `@google-cloud/storage`
- ⚠️ `multer` is still used for parsing multipart/form-data but files go to memory, not disk

## 📁 Upload Organization

Files are organized in Google Cloud Storage bucket folders:
```
ishantube-images-2025/
├── architects/
├── channel-partners/
├── users/
├── incentives/
├── products/
└── excel/
```

## 🔧 Middleware Exports

The new middleware exports these functions:
- `uploadArchitectImage` - For architect image uploads
- `uploadChannelPartnerImage` - For channel partner images
- `uploadUserImage` - For user images
- `uploadIncentiveImage` - For incentive images
- `uploadProductImage` - For product images
- `uploadExcelFile` - For Excel file uploads
- `handleUploadError` - Error handling middleware
- `processUploadedFile` - File processing middleware (kept for compatibility)
- `deleteFileFromGCS` - Helper function to delete files
- `uploadToGCS` - Direct upload function

## 🔐 Setup Required

1. **Create Google Cloud Service Account** (see `GOOGLE_CLOUD_SETUP.md`)
2. **Download JSON key file** and save as `google-cloud-key.json`
3. **Update `.env` file** with your actual project ID
4. **Test upload endpoints**

## 🚀 API Response Changes

### Before (Multer):
```json
{
  "Image": "http://localhost:5000/uploads/users/user-1234567890.jpg"
}
```

### After (Google Cloud Storage):
```json
{
  "Image": "https://storage.googleapis.com/ishantube-images-2025/users/users-1234567890.jpg"
}
```

## ⚠️ Important Notes

1. **Files are public by default** - The middleware makes uploaded files public
2. **Old local uploads** in `uploads/` folder are NOT automatically migrated
3. **Backup created**: Old middleware saved as `upload.middleware.js.backup`
4. **Database records** with old local URLs will still work if you keep the uploads folder

## 🧪 Testing

Test all upload endpoints:
- POST `/api/user/register` - User image
- POST `/api/architect` - Architect image
- POST `/api/channelpartner` - Channel partner image
- POST `/api/incentive` - Incentive image
- POST `/api/product` - Product image
- POST `/api/product/upload-excel` - Excel file

## 📊 Benefits

✅ **Scalability** - No disk space limitations
✅ **Reliability** - Google's infrastructure
✅ **Performance** - Fast CDN delivery
✅ **Accessibility** - Files accessible from anywhere
✅ **No local storage** - Server doesn't store files

## 🔄 Rollback Instructions

If you need to rollback to Multer:
1. Rename `upload.middleware.js.backup` to `upload.middleware.js`
2. Update all router imports back to `upload.middleware.js`
3. Uncomment static serving in `src/index.js`
4. Uninstall: `npm uninstall @google-cloud/storage`

## 📝 Migration Checklist

- [x] Install @google-cloud/storage package
- [x] Create new GCS middleware
- [x] Update all router imports
- [x] Disable static file serving
- [x] Add environment variables
- [x] Update .gitignore
- [ ] Create Google Cloud service account
- [ ] Download and setup JSON key file
- [ ] Update .env with project ID
- [ ] Test all upload endpoints
- [ ] Verify files are uploaded to GCS
- [ ] (Optional) Migrate existing local files to GCS

---

**Date**: October 28, 2025
**Status**: ✅ Code Migration Complete - Pending Configuration
