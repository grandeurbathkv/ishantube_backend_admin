import XLSX from 'xlsx';

// Create sample Excel file for Product testing
const createSampleProductExcel = () => {
  console.log('📊 Creating sample Product Excel file...');

  // Sample product data
  const sampleData = [
    {
      'Product_code': 'TILE001',
      'Product_Description': 'Premium Ceramic Floor Tile 600x600mm',
      'Product_Brand': 'Kajaria',
      'Product_Type': 'Rough',
      'Product_Color': 'White',
      'Product_mrp': 45.50,
      'Product_Flag': 'S2s',
      'Product_Category': 'Tiles',
      'Product_Sub_Category': 'Floor Tiles',
      'Product_Series': 'Premium',
      'Product_Discount_sale_low': 5.0,
      'Product_discount_sale_high': 15.0,
      'Prod_Purc_scheme': true,
      'Prod_scheme_discount': 10.0,
      'Product_purc_base_disc': 3.0,
      'Product_opening_stock': 100,
      'Product_Fresh_Stock': 80,
      'Product_Damage_stock': 5,
      'Product_sample_stock': 10,
      'Prod_Showroom_stock': 5,
      'Product_gst': 18.0,
      'Product_fragile': true,
      'Product_Notes': 'Handle with care, premium quality',
      'Product_mustorder': 'NA'
    },
    {
      'Product_code': 'TILE002',
      'Product_Description': 'Designer Wall Tile 300x450mm',
      'Product_Brand': 'Somany',
      'Product_Type': 'Trim',
      'Product_Color': 'Beige',
      'Product_mrp': 65.75,
      'Product_Flag': 'o2s',
      'Product_Category': 'Tiles',
      'Product_Sub_Category': 'Wall Tiles',
      'Product_Series': 'Designer',
      'Product_Discount_sale_low': 8.0,
      'Product_discount_sale_high': 20.0,
      'Prod_Purc_scheme': false,
      'Prod_scheme_discount': 0,
      'Product_purc_base_disc': 5.0,
      'Product_opening_stock': 150,
      'Product_Fresh_Stock': 120,
      'Product_Damage_stock': 3,
      'Product_sample_stock': 15,
      'Prod_Showroom_stock': 12,
      'Product_gst': 18.0,
      'Product_fragile': true,
      'Product_Notes': 'Designer series, limited edition',
      'Product_mustorder': 'NA'
    },
    {
      'Product_code': 'BATH001',
      'Product_Description': 'Modern Bathroom Faucet Chrome Finish',
      'Product_Brand': 'Hindware',
      'Product_Type': 'Rough',
      'Product_Color': 'Chrome',
      'Product_mrp': 2500.00,
      'Product_Flag': 'S2s',
      'Product_Category': 'Sanitaryware',
      'Product_Sub_Category': 'Faucets',
      'Product_Series': 'Modern',
      'Product_Discount_sale_low': 10.0,
      'Product_discount_sale_high': 25.0,
      'Prod_Purc_scheme': true,
      'Prod_scheme_discount': 15.0,
      'Product_purc_base_disc': 8.0,
      'Product_opening_stock': 25,
      'Product_Fresh_Stock': 20,
      'Product_Damage_stock': 1,
      'Product_sample_stock': 2,
      'Prod_Showroom_stock': 2,
      'Product_gst': 18.0,
      'Product_fragile': false,
      'Product_Notes': 'Water saving technology',
      'Product_mustorder': 'NA'
    },
    {
      'Product_code': 'PIPE001',
      'Product_Description': 'PVC Pipe 4 inch diameter 3 meter',
      'Product_Brand': 'Supreme',
      'Product_Type': 'Rough',
      'Product_Color': 'Grey',
      'Product_mrp': 450.00,
      'Product_Flag': 'o2s',
      'Product_Category': 'Plumbing',
      'Product_Sub_Category': 'Pipes',
      'Product_Series': 'Standard',
      'Product_Discount_sale_low': 3.0,
      'Product_discount_sale_high': 12.0,
      'Prod_Purc_scheme': false,
      'Prod_scheme_discount': 0,
      'Product_purc_base_disc': 2.0,
      'Product_opening_stock': 200,
      'Product_Fresh_Stock': 180,
      'Product_Damage_stock': 8,
      'Product_sample_stock': 5,
      'Prod_Showroom_stock': 7,
      'Product_gst': 18.0,
      'Product_fragile': false,
      'Product_Notes': 'ISI marked, high quality',
      'Product_mustorder': 'NA'
    },
    {
      'Product_code': 'CEMENT001',
      'Product_Description': 'OPC Cement Grade 53 - 50kg bag',
      'Product_Brand': 'UltraTech',
      'Product_Type': 'Rough',
      'Product_Color': 'Grey',
      'Product_mrp': 380.00,
      'Product_Flag': 'S2s',
      'Product_Category': 'Construction Material',
      'Product_Sub_Category': 'Cement',
      'Product_Series': 'Premium',
      'Product_Discount_sale_low': 2.0,
      'Product_discount_sale_high': 8.0,
      'Prod_Purc_scheme': true,
      'Prod_scheme_discount': 5.0,
      'Product_purc_base_disc': 1.0,
      'Product_opening_stock': 500,
      'Product_Fresh_Stock': 450,
      'Product_Damage_stock': 15,
      'Product_sample_stock': 20,
      'Prod_Showroom_stock': 15,
      'Product_gst': 28.0,
      'Product_fragile': false,
      'Product_Notes': 'High strength cement',
      'Product_mustorder': 'NA'
    }
  ];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

  // Set column widths for better readability
  const columnWidths = [
    { wch: 12 }, // Product_code
    { wch: 35 }, // Product_Description  
    { wch: 15 }, // Product_Brand
    { wch: 10 }, // Product_Type
    { wch: 12 }, // Product_Color
    { wch: 12 }, // Product_mrp
    { wch: 10 }, // Product_Flag
    { wch: 18 }, // Product_Category
    { wch: 18 }, // Product_Sub_Category
    { wch: 12 }, // Product_Series
    { wch: 12 }, // Product_Discount_sale_low
    { wch: 12 }, // Product_discount_sale_high
    { wch: 12 }, // Prod_Purc_scheme
    { wch: 12 }, // Prod_scheme_discount
    { wch: 12 }, // Product_purc_base_disc
    { wch: 12 }, // Product_opening_stock
    { wch: 12 }, // Product_Fresh_Stock
    { wch: 12 }, // Product_Damage_stock
    { wch: 12 }, // Product_sample_stock
    { wch: 12 }, // Prod_Showroom_stock
    { wch: 12 }, // Product_gst
    { wch: 10 }, // Product_fragile
    { wch: 25 }, // Product_Notes
    { wch: 12 }  // Product_mustorder
  ];

  worksheet['!cols'] = columnWidths;

  // Write file
  const filename = 'sample_products_upload.xlsx';
  XLSX.writeFile(workbook, filename);

  console.log(`✅ Sample Excel file created: ${filename}`);
  console.log(`📋 File contains ${sampleData.length} sample products`);
  console.log('🔧 You can use this file to test the upload functionality');

  return filename;
};

// Also create a minimal version for quick testing
const createMinimalProductExcel = () => {
  console.log('📊 Creating minimal Product Excel file...');

  const minimalData = [
    {
      'Product Code': 'TEST001',
      'Product Description': 'Test Product 1',
      'Brand': 'Test Brand',
      'Type': 'Rough',
      'Color': 'White',
      'MRP': 100,
      'Flag': 'S2s',
      'Category': 'Test Category',
      'Sub Category': 'Test Sub Category',
      'Series': 'Test Series',
      'GST': 18
    },
    {
      'Product Code': 'TEST002', 
      'Product Description': 'Test Product 2',
      'Brand': 'Another Brand',
      'Type': 'Trim',
      'Color': 'Black',
      'MRP': 200,
      'Flag': 'o2s',
      'Category': 'Another Category',
      'Sub Category': 'Another Sub Category',
      'Series': 'Premium Series',
      'GST': 28
    }
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(minimalData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

  const filename = 'minimal_products_test.xlsx';
  XLSX.writeFile(workbook, filename);

  console.log(`✅ Minimal Excel file created: ${filename}`);
  console.log(`📋 File contains ${minimalData.length} test products with alternative column names`);

  return filename;
};

// Create both files
console.log('🚀 Creating sample Excel files for Product testing...\n');

const sampleFile = createSampleProductExcel();
console.log('');
const minimalFile = createMinimalProductExcel();

console.log(`
🎯 Testing Instructions:

1. Upload the sample files using:
   POST /api/product/upload-excel

2. Test with different scenarios:
   - Upload ${sampleFile} (complete data)
   - Upload ${minimalFile} (alternative column names)

3. After upload, test PDF export:
   GET /api/product/export-pdf
   GET /api/product/export-pdf?brand=Kajaria
   GET /api/product/export-pdf?category=Tiles
   GET /api/product/export-pdf?includeStock=true

4. Check the response for:
   - Successful records
   - Failed validations
   - Duplicate detection
   - Auto-created dropdowns

✅ Files created successfully!
`);