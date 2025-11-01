# Company API Testing Guide

## Base URL
```
Development: http://localhost:5000/api/company
Production: https://ishantube-backend-admin-352857787507.europe-west1.run.app/api/company
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

---

## 1. Get All Companies (with Pagination, Search, Sorting)

### Endpoint
```
GET /api/company
```

### Query Parameters
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `search` (optional) - Search term (searches across code, name, phone, GST, bank)
- `sortBy` (optional, default: 'createdAt') - Field to sort by
- `sortOrder` (optional, default: 'desc') - 'asc' or 'desc'
- `status` (optional) - Filter by 'Active' or 'Inactive'

### Example Request
```bash
curl -X GET "http://localhost:5000/api/company?page=1&limit=10&search=ishan&sortBy=Company_Name&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example Response
```json
{
  "success": true,
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c85",
      "Company_Short_Code": "ISHA",
      "Company_Name": "Ishan Tubes Private Limited",
      "Company_Address1": "123 Industrial Area",
      "Company_Address2": "Sector 5",
      "Company_Address3": "Near Railway Station",
      "Company_Phone_Number": "9876543210",
      "Company_Gstno": "29ABCDE1234F1Z5",
      "Company_Bank": "State Bank of India",
      "Company_Bank_Branch": "Main Branch",
      "Company_Bank_Ifsc": "SBIN0001234",
      "Company_Account_No": "1234567890123456",
      "status": "Active",
      "created_by": {
        "_id": "60d21b4667d0d8992e610c85",
        "User_Name": "Admin User",
        "Email_id": "admin@example.com"
      },
      "createdAt": "2023-06-22T10:00:00.000Z",
      "updatedAt": "2023-06-22T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

---

## 2. Get Company by ID

### Endpoint
```
GET /api/company/:id
```

### Example Request
```bash
curl -X GET "http://localhost:5000/api/company/60d21b4667d0d8992e610c85" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example Response
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "Company_Short_Code": "ISHA",
    "Company_Name": "Ishan Tubes Private Limited",
    "Company_Address1": "123 Industrial Area",
    "Company_Address2": "Sector 5",
    "Company_Address3": "Near Railway Station",
    "Company_Phone_Number": "9876543210",
    "Company_Gstno": "29ABCDE1234F1Z5",
    "Company_Bank": "State Bank of India",
    "Company_Bank_Branch": "Main Branch",
    "Company_Bank_Ifsc": "SBIN0001234",
    "Company_Account_No": "1234567890123456",
    "status": "Active",
    "created_by": {
      "_id": "60d21b4667d0d8992e610c85",
      "User_Name": "Admin User",
      "Email_id": "admin@example.com"
    },
    "createdAt": "2023-06-22T10:00:00.000Z",
    "updatedAt": "2023-06-22T10:00:00.000Z"
  }
}
```

---

## 3. Create Company

### Endpoint
```
POST /api/company
```

### Request Body
```json
{
  "Company_Short_Code": "ISHA",
  "Company_Name": "Ishan Tubes Private Limited",
  "Company_Address1": "123 Industrial Area",
  "Company_Address2": "Sector 5",
  "Company_Address3": "Near Railway Station",
  "Company_Phone_Number": "9876543210",
  "Company_Gstno": "29ABCDE1234F1Z5",
  "Company_Bank": "State Bank of India",
  "Company_Bank_Branch": "Main Branch",
  "Company_Bank_Ifsc": "SBIN0001234",
  "Company_Account_No": "1234567890123456",
  "status": "Active"
}
```

### Required Fields
- Company_Short_Code (4 characters, uppercase)
- Company_Name (unique)
- Company_Address1
- Company_Phone_Number (10 digits)
- Company_Gstno (15 characters, unique, uppercase)

### Example Request
```bash
curl -X POST "http://localhost:5000/api/company" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Company_Short_Code": "ISHA",
    "Company_Name": "Ishan Tubes Private Limited",
    "Company_Address1": "123 Industrial Area",
    "Company_Phone_Number": "9876543210",
    "Company_Gstno": "29ABCDE1234F1Z5"
  }'
```

### Example Response
```json
{
  "success": true,
  "message": "Company created successfully",
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "Company_Short_Code": "ISHA",
    "Company_Name": "Ishan Tubes Private Limited",
    "Company_Address1": "123 Industrial Area",
    "Company_Phone_Number": "9876543210",
    "Company_Gstno": "29ABCDE1234F1Z5",
    "status": "Active",
    "created_by": "60d21b4667d0d8992e610c85",
    "createdAt": "2023-06-22T10:00:00.000Z",
    "updatedAt": "2023-06-22T10:00:00.000Z"
  }
}
```

---

## 4. Update Company

### Endpoint
```
PUT /api/company/:id
```

### Request Body (all fields optional, send only what you want to update)
```json
{
  "Company_Short_Code": "ISHA",
  "Company_Name": "Ishan Tubes Private Limited",
  "Company_Address1": "123 Industrial Area",
  "Company_Address2": "Sector 5",
  "Company_Address3": "Near Railway Station",
  "Company_Phone_Number": "9876543210",
  "Company_Gstno": "29ABCDE1234F1Z5",
  "Company_Bank": "State Bank of India",
  "Company_Bank_Branch": "Main Branch",
  "Company_Bank_Ifsc": "SBIN0001234",
  "Company_Account_No": "1234567890123456",
  "status": "Inactive"
}
```

### Example Request
```bash
curl -X PUT "http://localhost:5000/api/company/60d21b4667d0d8992e610c85" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Company_Phone_Number": "9999999999",
    "status": "Inactive"
  }'
```

### Example Response
```json
{
  "success": true,
  "message": "Company updated successfully",
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "Company_Short_Code": "ISHA",
    "Company_Name": "Ishan Tubes Private Limited",
    "Company_Phone_Number": "9999999999",
    "status": "Inactive",
    "updatedAt": "2023-06-22T12:00:00.000Z"
  }
}
```

---

## 5. Delete Company

### Endpoint
```
DELETE /api/company/:id
```

### Example Request
```bash
curl -X DELETE "http://localhost:5000/api/company/60d21b4667d0d8992e610c85" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example Response
```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

---

## 6. Export Companies to Excel

### Endpoint
```
GET /api/company/export/excel
```

### Query Parameters
- `search` (optional) - Filter companies before export
- `status` (optional) - Filter by status before export

### Example Request
```bash
curl -X GET "http://localhost:5000/api/company/export/excel?search=ishan" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output companies.xlsx
```

### Response
Downloads an Excel file (.xlsx) with all company data

---

## 7. Export Companies to PDF

### Endpoint
```
GET /api/company/export/pdf
```

### Query Parameters
- `search` (optional) - Filter companies before export
- `status` (optional) - Filter by status before export

### Example Request
```bash
curl -X GET "http://localhost:5000/api/company/export/pdf?status=Active" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output companies.pdf
```

### Response
Downloads a PDF file with all company data

---

## 8. Import Companies from Excel

### Endpoint
```
POST /api/company/import/excel
```

### Request
- Content-Type: multipart/form-data
- Field name: `file`
- File type: .xlsx or .xls

### Excel Format
The Excel file should have the following columns:
- Company Code (required, 4 characters)
- Company Name (required)
- Address Line 1 (required)
- Address Line 2
- Address Line 3
- Phone Number (required, 10 digits)
- GST Number (required, 15 characters)
- Bank Name
- Bank Branch
- IFSC Code
- Account Number
- Status (Active/Inactive, default: Active)

### Example Request
```bash
curl -X POST "http://localhost:5000/api/company/import/excel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@companies.xlsx"
```

### Example Response
```json
{
  "success": true,
  "message": "Import completed. 50 companies imported successfully, 5 failed.",
  "results": {
    "success": [
      {
        "row": 2,
        "company": "Ishan Tubes Private Limited"
      }
    ],
    "failed": [
      {
        "row": 7,
        "data": { ... },
        "error": "Company already exists (duplicate Code, Name, or GST)"
      }
    ],
    "total": 55
  }
}
```

---

## 9. Get Company Analytics

### Endpoint
```
GET /api/company/analytics
```

### Example Request
```bash
curl -X GET "http://localhost:5000/api/company/analytics" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example Response
```json
{
  "success": true,
  "data": {
    "total": 100,
    "active": 85,
    "inactive": 15,
    "recentlyAdded": 12
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Company with this Short Code already exists"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Company not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Error fetching companies",
  "error": "Error details..."
}
```

---

## Validation Rules

### Company_Short_Code
- Exactly 4 characters
- Automatically converted to uppercase
- Must be unique

### Company_Name
- Required
- Must be unique

### Company_Phone_Number
- Exactly 10 digits
- Only numbers allowed

### Company_Gstno
- Exactly 15 characters
- Format: 2 digits + 5 letters + 4 digits + 1 letter + 1 letter/digit + Z + 1 letter/digit
- Automatically converted to uppercase
- Must be unique

### Company_Bank_Ifsc
- Optional
- Format: 4 letters + 0 + 6 letters/digits
- Automatically converted to uppercase

---

## Testing with Swagger

Access the Swagger documentation at:
```
http://localhost:5000/api-docs
```

Navigate to the "Company" section to test all APIs interactively.

---

## Frontend Integration

All APIs are integrated in the frontend at:
```
src/feature-module/people/company-list.tsx
```

### Features:
✅ View all companies with pagination
✅ Search across multiple fields
✅ Sort by different columns (Name, Code, Date, etc.)
✅ Create new company
✅ Edit existing company
✅ Delete company
✅ View company details
✅ Export to Excel
✅ Export to PDF
✅ Import from Excel
✅ Real-time validation

---

## Notes

1. All create/update operations automatically convert `Company_Short_Code`, `Company_Gstno`, and `Company_Bank_Ifsc` to uppercase.

2. The backend checks for duplicate Short Code, Name, and GST Number during create and update operations.

3. Phone numbers are validated to be exactly 10 digits.

4. GST numbers are validated using regex pattern for Indian GST format.

5. All endpoints require authentication via JWT token.

6. The `created_by` field is automatically set from the authenticated user's token.

7. Timestamps (`createdAt` and `updatedAt`) are automatically managed by Mongoose.

8. Search functionality works across: Company_Short_Code, Company_Name, Company_Phone_Number, Company_Gstno, and Company_Bank.

9. Export functions respect search and status filters.

10. Import function validates all data before inserting and provides detailed error reports for failed rows.
