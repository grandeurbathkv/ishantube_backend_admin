# Frontend Users List Update Instructions

## Backend Field Names (from user.model.js):

- `User Name` (not User_Name)
- `Email id` (not User_Email)
- `Mobile Number` (not User_Phone)
- `Role`
- `Image`
- `status`
- `Password`

## Key Changes Needed:

1. Update all form fields to match backend
2. Update API calls to use correct field names
3. Only Super Admin can access User Management
4. Remove User_Address, User_City, User_State, User_Pincode (not in backend)
