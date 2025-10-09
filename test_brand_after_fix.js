// Test Brand API after fixing index issue

console.log(`
🧪 Brand API Test Instructions (After Fix):

1. Server already running on: http://localhost:5000

2. Test Brand Creation:
   Method: POST
   URL: http://localhost:5000/api/brand
   
   Headers:
   {
     "Content-Type": "application/json",
     "Authorization": "Bearer YOUR_JWT_TOKEN"
   }
   
   Body (JSON):
   {
     "Brand_Name": "Test Brand ${Date.now()}",
     "Supplier_Name": "Test Supplier"
   }

3. Expected Response (201):
   {
     "success": true,
     "message": "Brand created successfully",
     "data": {
       "Brand_Code": "BRD001",
       "Brand_Name": "Test Brand ...",
       "Supplier_Name": "Test Supplier",
       "created_by": "USER_ID",
       "createdAt": "...",
       "updatedAt": "..."
     }
   }

✅ Fixed Issues:
- Dropped old Brand_id index from database
- Cleaned up null Brand_id documents
- Brand_Code will auto-generate properly now

🔗 Swagger Docs: http://localhost:5000/api-docs
🎯 Ready to test Brand creation!
`);