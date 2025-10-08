// Brand API Test Helper
// Run this after starting your server

console.log(`
🧪 Brand POST API Test Instructions:

1. Start your server: npm start

2. Test with Postman/Thunder Client:
   Method: POST
   URL: http://localhost:5000/api/brand
   
   Headers:
   {
     "Content-Type": "application/json",
     "Authorization": "Bearer YOUR_JWT_TOKEN"
   }
   
   Body (JSON):
   {
     "Brand_Name": "Apple",
     "Supplier_Name": "Apple Inc."
   }

3. Expected Response (201):
   {
     "success": true,
     "message": "Brand created successfully",
     "data": {
       "Brand_Code": "BRD001",
       "Brand_Name": "Apple",
       "Supplier_Name": "Apple Inc.",
       "created_by": "USER_ID",
       "createdAt": "...",
       "updatedAt": "..."
     }
   }

4. Possible Errors:
   - 403: Super Admin access required
   - 401: Not authorized (invalid/missing token)
   - 400: Brand name already exists
   - 500: Server error

📝 Notes:
- Brand_Code auto-generates (BRD001, BRD002, etc.)
- Only Super Admin can create brands
- Brand_Name must be unique
- Both Brand_Name and Supplier_Name are required

🔗 Swagger Docs: http://localhost:5000/api-docs
`);

// Quick server check
fetch('http://localhost:5000/')
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Server is running!');
      console.log('📄 Visit: http://localhost:5000/api-docs for full documentation');
    }
  })
  .catch(err => {
    console.log('❌ Server not running. Start with: npm start');
  });