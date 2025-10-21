import express from 'express';
import {
  manageProducts,
  manageDropdownData,
  getProductAnalytics,
  getProductDropdown,
  getProductFilters,
  uploadProductsFromExcel,
  generateProductsPDF
} from './product.controller.js';
import { protect } from '../../middleware/user.middleware.js';
import { uploadProductImage, uploadExcelFile, handleUploadError } from '../../middleware/upload.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Product
 *   description: Product inventory management with CRUD operations and dropdown management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - Product_code
 *         - Product_Description
 *         - Product_Brand
 *         - Product_Type
 *         - Product_Color
 *         - Product_mrp
 *         - Product_Flag
 *         - Product_Category
 *         - Product_Sub_Category
 *         - Product_Series
 *       properties:
 *         Prod_ID:
 *           type: string
 *           description: Product Unique ID (auto-generated)
 *           readOnly: true
 *           example: "PROD0001"
 *         Product_code:
 *           type: string
 *           description: Product Unique Code
 *           example: "ABC123"
 *         Product_Description:
 *           type: string
 *           description: Product Description
 *           example: "High Quality Ceramic Tiles"
 *         Product_Brand:
 *           type: string
 *           description: Product Brand (dropdown with auto-create)
 *           example: "Kajaria"
 *         Product_Type:
 *           type: string
 *           enum: [Rough, Trim]
 *           description: Product Type
 *           example: "Rough"
 *         Product_Color:
 *           type: string
 *           description: Product Color (dropdown with auto-create)
 *           example: "White"
 *         Product_mrp:
 *           type: number
 *           description: Product MRP
 *           example: 599.99
 *         Product_Flag:
 *           type: string
 *           enum: [S2s, o2s]
 *           description: Product Flag
 *           example: "S2s"
 *         Product_Category:
 *           type: string
 *           description: Product Category (dropdown with auto-create)
 *           example: "Tiles"
 *         Product_Sub_Category:
 *           type: string
 *           description: Product Sub Category (dropdown with auto-create)
 *           example: "Floor Tiles"
 *         Product_Series:
 *           type: string
 *           description: Product Series (dropdown with auto-create)
 *           example: "Premium"
 *         Product_Discount_sale_low:
 *           type: number
 *           minimum: 0
 *           maximum: 99.99
 *           description: Product Discount Sale Low %
 *           example: 5.0
 *         Product_discount_sale_high:
 *           type: number
 *           minimum: 0
 *           maximum: 99.99
 *           description: Product Discount Sale High %
 *           example: 15.0
 *         Prod_Purc_scheme:
 *           type: boolean
 *           description: Purchase Scheme on/off
 *           example: true
 *         Prod_scheme_discount:
 *           type: number
 *           minimum: 0
 *           maximum: 99.99
 *           description: Product Purchase Scheme Discount %
 *           example: 10.0
 *         Product_purc_base_disc:
 *           type: number
 *           minimum: 0
 *           maximum: 99.99
 *           description: Product Purchase Base Discount %
 *           example: 3.0
 *         Product_opening_stock:
 *           type: number
 *           minimum: 0
 *           description: Product Opening Stock
 *           example: 100
 *         Product_Fresh_Stock:
 *           type: number
 *           minimum: 0
 *           description: Product Fresh Stock (auto calculated)
 *           example: 50
 *         Product_Damage_stock:
 *           type: number
 *           minimum: 0
 *           description: Product Damaged Stock (auto calculated)
 *           example: 5
 *         Product_sample_stock:
 *           type: number
 *           minimum: 0
 *           description: Product Sample Stock (auto calculated)
 *           example: 10
 *         Prod_Showroom_stock:
 *           type: number
 *           minimum: 0
 *           description: Product Showroom Stock (auto calculated)
 *           example: 20
 *         Prod_image:
 *           type: string
 *           description: Product Image URL
 *           example: "https://example.com/image.jpg"
 *         Product_gst:
 *           type: number
 *           minimum: 0
 *           maximum: 99.99
 *           description: Product GST %
 *           example: 18.0
 *         Product_fragile:
 *           type: boolean
 *           description: Product Breakable or not
 *           example: true
 *         Product_Notes:
 *           type: string
 *           description: Product Notes
 *           example: "Handle with care"
 *         Product_mustorder:
 *           type: string
 *           description: Product must order Code reference (use "NA" if not applicable)
 *           example: "PROD0002"
 *     ProductDropdownItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Product ID
 *           example: "PROD0001"
 *         code:
 *           type: string
 *           description: Product Code
 *           example: "ABC123"
 *         description:
 *           type: string
 *           description: Product Description
 *           example: "High Quality Ceramic Tiles"
 *         mrp:
 *           type: number
 *           description: Product MRP
 *           example: 599.99
 *         label:
 *           type: string
 *           description: Combined Product ID and Description for display
 *           example: "PROD0001 - High Quality Ceramic Tiles"
 */

// ========== Main Product Management Routes ==========

/**
 * @swagger
 * /api/product:
 *   post:
 *     summary: Create a new Product (auto-creates dropdowns if needed)
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/Product'
 *               - type: object
 *                 properties:
 *                   Prod_image:
 *                     type: string
 *                     format: binary
 *                     description: Product image file
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Product with this code already exists or validation error
 *       401:
 *         description: Not authorized
 *   get:
 *     summary: Get all Products with advanced filters and search
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in ID, code, description, brand, category
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: sub_category
 *         schema:
 *           type: string
 *         description: Filter by sub category
 *       - in: query
 *         name: series
 *         schema:
 *           type: string
 *         description: Filter by series
 *       - in: query
 *         name: product_type
 *         schema:
 *           type: string
 *           enum: [Rough, Trim]
 *         description: Filter by product type
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *         description: Filter by color
 *       - in: query
 *         name: flag
 *         schema:
 *           type: string
 *           enum: [S2s, o2s]
 *         description: Filter by product flag
 *       - in: query
 *         name: fragile
 *         schema:
 *           type: boolean
 *         description: Filter by fragile products
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/product/{id}:
 *   get:
 *     summary: Get Product by ID
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *       404:
 *         description: Product not found
 *       401:
 *         description: Not authorized
 *   put:
 *     summary: Update Product (auto-creates dropdowns if needed)
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/Product'
 *               - type: object
 *                 properties:
 *                   Prod_image:
 *                     type: string
 *                     format: binary
 *                     description: Product image file
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 *       401:
 *         description: Not authorized
 *   delete:
 *     summary: Delete Product
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 *       401:
 *         description: Not authorized
 */

// Main CRUD routes with file upload support
router.route('/').post(protect, uploadProductImage, handleUploadError, manageProducts).get(protect, manageProducts);
router.route('/:id').get(protect, manageProducts).put(protect, uploadProductImage, handleUploadError, manageProducts).delete(protect, manageProducts);

// ========== Product Dropdown Route ==========

/**
 * @swagger
 * /api/product/dropdown/list:
 *   get:
 *     summary: Get Product dropdown list
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in Product ID, code, or description
 *         example: "PROD0001"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of results to return
 *         example: 50
 *     responses:
 *       200:
 *         description: Product dropdown data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product dropdown data retrieved successfully"
 *                 count:
 *                   type: number
 *                   example: 25
 *                 filters:
 *                   type: object
 *                   properties:
 *                     search:
 *                       type: string
 *                       example: "Ceramic"
 *                     limit:
 *                       type: string
 *                       example: "100"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductDropdownItem'
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */

// Product dropdown route
router.get('/dropdown/list', protect, getProductDropdown);

// ========== Dropdown Management Routes ==========

/**
 * @swagger
 * /api/product/dropdown/{type}:
 *   get:
 *     summary: Get dropdown data (brands, colors, categories, subcategories, series)
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [brands, colors, categories, subcategories, series]
 *         description: Type of dropdown data
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in names
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter subcategories by category (only for subcategories type)
 *     responses:
 *       200:
 *         description: Dropdown data retrieved successfully
 *       400:
 *         description: Invalid dropdown type
 *       401:
 *         description: Not authorized
 *   post:
 *     summary: Create new dropdown item
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [brands, colors, categories, subcategories, series]
 *         description: Type of dropdown data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Item name
 *                 example: "Kajaria"
 *               category:
 *                 type: string
 *                 description: Category name (required for subcategories only)
 *                 example: "Tiles"
 *     responses:
 *       201:
 *         description: Dropdown item created successfully
 *       400:
 *         description: Invalid data or item already exists
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/product/dropdown/{type}/{id}:
 *   put:
 *     summary: Update dropdown item
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [brands, colors, categories, subcategories, series]
 *         description: Type of dropdown data
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Item name
 *                 example: "Updated Brand Name"
 *               category:
 *                 type: string
 *                 description: Category name (for subcategories only)
 *                 example: "Updated Category"
 *     responses:
 *       200:
 *         description: Dropdown item updated successfully
 *       404:
 *         description: Item not found
 *       401:
 *         description: Not authorized
 *   delete:
 *     summary: Delete dropdown item (with usage validation)
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [brands, colors, categories, subcategories, series]
 *         description: Type of dropdown data
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Dropdown item deleted successfully
 *       400:
 *         description: Item cannot be deleted as it is in use
 *       404:
 *         description: Item not found
 *       401:
 *         description: Not authorized
 */

// Dropdown management routes
router.route('/dropdown/:type').get(protect, manageDropdownData).post(protect, manageDropdownData);
router.route('/dropdown/:type/:id').put(protect, manageDropdownData).delete(protect, manageDropdownData);

// ========== Analytics Routes ==========

/**
 * @swagger
 * /api/product/analytics:
 *   get:
 *     summary: Get Product analytics and reports
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [summary, stock]
 *           default: summary
 *         description: Type of analytics report
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   description: Analytics data based on type
 *       400:
 *         description: Invalid analytics type
 *       401:
 *         description: Not authorized
 */
router.get('/analytics', protect, getProductAnalytics);

// ========== Filter Routes ==========

/**
 * @swagger
 * /api/product/filters:
 *   get:
 *     summary: Get products with cascading filters OR get filter options (Brand -> Category -> Sub Category)
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [products, options, brands, categories, subcategories]
 *           default: products
 *         description: |
 *           - products: Get filtered products with cascading options
 *           - options: Get all filter options (brands, categories, subcategories)  
 *           - brands: Get only brands list
 *           - categories: Get categories (filtered by brand if provided)
 *           - subcategories: Get subcategories (filtered by brand/category if provided)
 *         example: "products"
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand name
 *         example: "Kajaria"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category name
 *         example: "Tiles"
 *       - in: query
 *         name: subcategory
 *         schema:
 *           type: string
 *         description: Filter by subcategory name
 *         example: "Floor Tiles"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination (only for type=products)
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of products per page (only for type=products)
 *         example: 50
 *     responses:
 *       200:
 *         description: Success response varies by type parameter
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Response when type=products
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Product filters applied successfully"
 *                     data:
 *                       type: object
 *                       properties:
 *                         products:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Product'
 *                         cascadeOptions:
 *                           type: object
 *                           description: Available options for next level filtering
 *                           properties:
 *                             brands:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               description: Available brands (when category is selected)
 *                             categories:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               description: Available categories (when brand is selected)
 *                             subcategories:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               description: Available subcategories (when brand/category is selected)
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             currentPage:
 *                               type: integer
 *                             totalPages:
 *                               type: integer
 *                             totalProducts:
 *                               type: integer
 *                             hasNext:
 *                               type: boolean
 *                             hasPrev:
 *                               type: boolean
 *                         appliedFilters:
 *                           type: object
 *                           properties:
 *                             brand:
 *                               type: string
 *                             category:
 *                               type: string
 *                             subcategory:
 *                               type: string
 *                 - type: object
 *                   description: Response when type=options/brands/categories/subcategories
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Filter options retrieved successfully"
 *                     data:
 *                       type: object
 *                       properties:
 *                         brands:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: List of available brands
 *                           example: ["Kajaria", "Somany", "Orient Bell"]
 *                         categories:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: List of available categories
 *                           example: ["Tiles", "Sanitaryware", "Faucets"]
 *                         subcategories:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: List of available subcategories
 *                           example: ["Floor Tiles", "Wall Tiles", "Designer Tiles"]
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.get('/filters', protect, getProductFilters);

// ========== Excel Upload and PDF Export Routes ==========

/**
 * @swagger
 * /api/product/upload-excel:
 *   post:
 *     summary: Upload Products from Excel file
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file (.xlsx or .xls) containing Product data. Expected columns - Product_code, Product_Description, Product_Brand, Product_Type, Product_Color, Product_mrp, Product_Flag, Product_Category, Product_Sub_Category, Product_Series, etc.
 *     responses:
 *       200:
 *         description: Excel file processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Excel upload completed. 25/30 records processed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRows:
 *                           type: number
 *                           example: 30
 *                         successful:
 *                           type: number
 *                           example: 25
 *                         failed:
 *                           type: number
 *                           example: 3
 *                         duplicates:
 *                           type: number
 *                           example: 2
 *                     successful:
 *                       type: array
 *                       description: Successfully created records
 *                       items:
 *                         type: object
 *                         properties:
 *                           row:
 *                             type: number
 *                             example: 2
 *                           data:
 *                             $ref: '#/components/schemas/Product'
 *                     failed:
 *                       type: array
 *                       description: Records that failed validation
 *                       items:
 *                         type: object
 *                         properties:
 *                           row:
 *                             type: number
 *                             example: 5
 *                           data:
 *                             type: object
 *                           error:
 *                             type: string
 *                             example: "Product Code is required"
 *                     duplicates:
 *                       type: array
 *                       description: Records that already exist
 *                       items:
 *                         type: object
 *                         properties:
 *                           row:
 *                             type: number
 *                             example: 8
 *                           data:
 *                             type: object
 *                           existing:
 *                             $ref: '#/components/schemas/Product'
 *                           error:
 *                             type: string
 *                             example: "Product with this code already exists"
 *       400:
 *         description: Invalid file format, validation error, or empty file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Only .xlsx and .xls files are allowed"
 *       401:
 *         description: Not authorized
 */
router.post('/upload-excel', protect, uploadExcelFile, handleUploadError, uploadProductsFromExcel);

/**
 * @swagger
 * /api/product/export-pdf:
 *   get:
 *     summary: Generate and download Products PDF report
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search filter to apply before generating PDF
 *         example: "ceramic"
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand before generating PDF
 *         example: "Kajaria"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category before generating PDF
 *         example: "Tiles"
 *       - in: query
 *         name: sub_category
 *         schema:
 *           type: string
 *         description: Filter by sub category before generating PDF
 *         example: "Floor Tiles"
 *       - in: query
 *         name: product_type
 *         schema:
 *           type: string
 *           enum: [Rough, Trim]
 *         description: Filter by product type before generating PDF
 *         example: "Rough"
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *         description: Filter by color before generating PDF
 *         example: "White"
 *       - in: query
 *         name: includeStock
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Whether to include stock data in the PDF
 *         example: "true"
 *     responses:
 *       200:
 *         description: PDF file generated and downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *               description: PDF file containing Products report
 *         headers:
 *           Content-Disposition:
 *             description: Attachment filename
 *             schema:
 *               type: string
 *               example: 'attachment; filename="products-2025-01-06.pdf"'
 *       404:
 *         description: No Products found to export
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "No Products found to export"
 *       401:
 *         description: Not authorized
 */
router.get('/export-pdf', protect, generateProductsPDF);

export default router;