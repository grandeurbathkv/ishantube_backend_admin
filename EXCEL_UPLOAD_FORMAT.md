# Channel Partners Excel Upload Format

This document describes the expected format for Excel files when uploading Channel Partners data.

## File Requirements

- **File Types**: `.xlsx` or `.xls`
- **Maximum Size**: 10MB
- **Sheets**: Only the first sheet will be processed

## Column Headers

The Excel file should contain the following columns (flexible naming):

| Required Columns | Alternative Names | Data Type | Validation |
|------------------|-------------------|-----------|------------|
| `CP_Name` | Channel Partner Name, Name, Partner Name | Text | Required, non-empty |
| `Mobile Number` | Mobile, Phone, Contact Number | Number | Required, exactly 10 digits |
| `CP_Address` | Address, Channel Partner Address | Text | Required, non-empty |

| Optional Columns | Alternative Names | Data Type | Validation |
|------------------|-------------------|-----------|------------|
| `Email id` | Email, Email ID, Email Address | Email | Valid email format if provided |
| `status` | Status, Active, Is Active | Boolean | true/false, 1/0, defaults to true |

## Sample Excel Format

```
| CP_Name          | Mobile Number | Email id              | CP_Address                    | status |
|------------------|---------------|-----------------------|-------------------------------|--------|
| ABC Electronics  | 9876543210    | abc@electronics.com   | 123 Main St, Mumbai, MH      | true   |
| XYZ Store        | 9876543211    | xyz@store.com         | 456 Park Ave, Delhi, DL      | true   |
| PQR Distributors | 9876543212    | pqr@distributors.com  | 789 Market Rd, Bangalore, KA | false  |
```

## Validation Rules

1. **CP_Name**: Must be unique across existing records
2. **Mobile Number**: 
   - Must be exactly 10 digits
   - Must be unique across existing records
3. **Email id**: Must be valid email format (if provided)
4. **CP_Address**: Cannot be empty
5. **status**: 
   - Accepts: true, false, 1, 0, "true", "false"
   - Defaults to true if not provided

## Upload Response

The API will return a detailed response showing:

- **Summary**: Total rows, successful, failed, and duplicate counts
- **Successful**: List of successfully created records with row numbers
- **Failed**: List of failed records with validation errors and row numbers  
- **Duplicates**: List of duplicate records with existing data and row numbers

## Tips for Success

1. Ensure column headers match the expected names (case-insensitive)
2. Remove any empty rows or columns
3. Ensure mobile numbers are formatted as numbers (not text with spaces/hyphens)
4. Use consistent email formats
5. Test with a small file first before uploading large datasets

## Error Handling

Common errors and solutions:

- **"CP_Name is required"**: Ensure the name column is not empty
- **"Mobile Number must be 10 digits"**: Check for spaces, hyphens, or country codes
- **"Channel Partner already exists"**: Check for duplicate names or mobile numbers
- **"Invalid email format"**: Ensure email follows name@domain.com format

## API Endpoint

```bash
POST /api/channelpartner/upload-excel
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- file: <excel_file>
```