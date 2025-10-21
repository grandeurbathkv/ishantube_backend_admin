# Product Excel Upload Format Guide

## Required Columns

| Column Name | Type | Required | Description | Example |
|-------------|------|----------|-------------|---------|
| Product_code | String | Yes | Unique product code/SKU | "ABC123" |
| Product_Description | String | Yes | Product description | "High Quality Ceramic Tiles" |
| Product_Brand | String | Yes | Product brand name | "Kajaria" |
| Product_Type | String | Yes | Product type (Rough/Trim) | "Rough" |
| Product_Color | String | Yes | Product color | "White" |
| Product_mrp | Number | Yes | Product MRP (must be > 0) | 599.99 |
| Product_Flag | String | Yes | Product flag (S2s/o2s) | "S2s" |
| Product_Category | String | Yes | Product category | "Tiles" |
| Product_Sub_Category | String | Yes | Product sub category | "Floor Tiles" |

## Optional Columns

| Column Name | Type | Default | Description | Example |
|-------------|------|---------|-------------|---------|
| Product_Series | String | "" | Product series | "Premium" |
| Product_Discount_sale_low | Number | 0 | Low discount percentage (0-99.99) | 5.0 |
| Product_discount_sale_high | Number | 0 | High discount percentage (0-99.99) | 15.0 |
| Prod_Purc_scheme | Boolean | false | Purchase scheme flag | true |
| Prod_scheme_discount | Number | 0 | Scheme discount percentage | 10.0 |
| Product_purc_base_disc | Number | 0 | Base discount percentage | 3.0 |
| Product_opening_stock | Number | 0 | Opening stock quantity | 100 |
| Product_Fresh_Stock | Number | 0 | Fresh stock quantity | 50 |
| Product_Damage_stock | Number | 0 | Damaged stock quantity | 5 |
| Product_sample_stock | Number | 0 | Sample stock quantity | 10 |
| Prod_Showroom_stock | Number | 0 | Showroom stock quantity | 20 |
| Product_gst | Number | 0 | GST percentage (0-99.99) | 18.0 |
| Product_fragile | Boolean | false | Is product fragile/breakable | true |
| Product_Notes | String | "" | Product notes/remarks | "Handle with care" |
| Product_mustorder | String | "NA" | Must order reference code | "PROD0002" |

## Column Name Variations (Flexible Mapping)

The system supports multiple column name variations:

### Product_code
- Product_code, Product Code, Code, SKU

### Product_Description  
- Product_Description, Product Description, Description, Name

### Product_Brand
- Product_Brand, Product Brand, Brand

### Product_Type
- Product_Type, Product Type, Type

### Product_Color
- Product_Color, Product Color, Color

### Product_mrp
- Product_mrp, Product MRP, MRP, Price

### Product_Flag
- Product_Flag, Product Flag, Flag

### Product_Category
- Product_Category, Product Category, Category

### Product_Sub_Category
- Product_Sub_Category, Product Sub Category, Sub Category, Subcategory

### Product_Series
- Product_Series, Product Series, Series

## Excel File Requirements

1. **File Format**: Only .xlsx and .xls files are supported
2. **File Size**: Maximum 10MB
3. **Sheet**: Data should be in the first sheet
4. **Headers**: First row should contain column headers
5. **Data**: Data should start from row 2

## Validation Rules

### Required Field Validation
- Product_code: Cannot be empty
- Product_Description: Cannot be empty  
- Product_Brand: Cannot be empty
- Product_Type: Must be "Rough" or "Trim"
- Product_Color: Cannot be empty
- Product_mrp: Must be a positive number > 0
- Product_Flag: Must be "S2s" or "o2s"
- Product_Category: Cannot be empty
- Product_Sub_Category: Cannot be empty

### Duplicate Check
- System checks for existing products with the same Product_code
- Duplicate products will be skipped and reported

### Auto-Creation of Dropdowns
- New brands, colors, categories, sub-categories, and series will be automatically created if they don't exist
- Sub-categories are linked to their parent category

## Sample Excel Data

| Product_code | Product_Description | Product_Brand | Product_Type | Product_Color | Product_mrp | Product_Flag | Product_Category | Product_Sub_Category | Product_Series | Product_gst |
|-------------|-------------------|---------------|--------------|---------------|-------------|--------------|------------------|---------------------|----------------|-------------|
| TILE001 | Premium Ceramic Floor Tile | Kajaria | Rough | White | 45.50 | S2s | Tiles | Floor Tiles | Premium | 18 |
| TILE002 | Designer Wall Tile | Somany | Trim | Beige | 65.75 | o2s | Tiles | Wall Tiles | Designer | 18 |
| BATH001 | Modern Bathroom Faucet | Hindware | Rough | Chrome | 2500.00 | S2s | Sanitaryware | Faucets | Modern | 18 |

## Upload Process

1. Prepare your Excel file with the required columns
2. Use the API endpoint: `POST /api/product/upload-excel`
3. Send the file as form-data with field name "file"
4. Include Authorization header with your Bearer token

## Response Format

```json
{
  "success": true,
  "message": "Excel upload completed. 25/30 records processed successfully",
  "data": {
    "summary": {
      "totalRows": 30,
      "successful": 25,
      "failed": 3,
      "duplicates": 2
    },
    "successful": [...],
    "failed": [...],
    "duplicates": [...]
  }
}
```

## Error Handling

- **Invalid file format**: Only .xlsx and .xls files allowed
- **Empty file**: File must contain data
- **Missing required fields**: Will be reported in failed array
- **Duplicate products**: Will be reported in duplicates array
- **Validation errors**: Each error will be detailed with row number and error message

## Best Practices

1. **Test with small batches** first (5-10 records)
2. **Verify column names** match the expected format
3. **Check data types** (numbers should be numeric, booleans should be true/false)
4. **Remove empty rows** to avoid processing errors
5. **Backup existing data** before bulk upload
6. **Review failed records** and fix data before re-uploading