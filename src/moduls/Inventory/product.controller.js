import {
  Product,
  ProductBrand,
  ProductColor,
  ProductCategory,
  ProductSubCategory,
  ProductSeries
} from './product.model.js';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

// Utility function to round to 2 decimal places
const roundTo2Decimals = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// ========== Main Product Management (Consolidated CRUD) ==========
const manageProducts = async (req, res) => {
  try {
    const method = req.method;
    const { id } = req.params;
    const userId = req.user._id;

    switch (method) {
      case 'POST':
        // Create new Product
        const {
          Product_code,
          Product_Description,
          Product_Brand,
          Product_Type,
          Product_Color,
          Product_mrp,
          Product_Flag,
          Product_Category,
          Product_Sub_Category,
          Product_Series,
          Product_Discount_sale_low,
          Product_discount_sale_high,
          Prod_Purc_scheme,
          Prod_scheme_discount,
          Product_purc_base_disc,
          Product_opening_stock,
          Product_Fresh_Stock,
          Product_Damage_stock,
          Product_sample_stock,
          Prod_Showroom_stock,
          Prod_image,
          Product_gst,
          Product_fragile,
          Product_Notes,
          Product_mustorder
        } = req.body;

        // Check if Product_code already exists
        const existingProduct = await Product.findOne({ Product_code });
        if (existingProduct) {
          return res.status(400).json({
            success: false,
            message: `Product with code "${Product_code}" already exists`
          });
        }

        // Auto-create dropdowns if needed
        if (Product_Brand) {
          await ProductBrand.getOrCreate(Product_Brand, userId);
        }
        if (Product_Color) {
          await ProductColor.getOrCreate(Product_Color, userId);
        }
        if (Product_Category) {
          await ProductCategory.getOrCreate(Product_Category, userId);
        }
        if (Product_Sub_Category && Product_Category) {
          await ProductSubCategory.getOrCreate(Product_Sub_Category, Product_Category, userId);
        }
        if (Product_Series) {
          await ProductSeries.getOrCreate(Product_Series, userId);
        }

        const newProduct = await Product.create({
          Product_code,
          Product_Description,
          Product_Brand,
          Product_Type,
          Product_Color,
          Product_mrp,
          Product_Flag,
          Product_Category,
          Product_Sub_Category,
          Product_Series,
          Product_Discount_sale_low: Product_Discount_sale_low || 0,
          Product_discount_sale_high: Product_discount_sale_high || 0,
          Prod_Purc_scheme: Prod_Purc_scheme || false,
          Prod_scheme_discount: Prod_scheme_discount || 0,
          Product_purc_base_disc: Product_purc_base_disc || 0,
          Product_opening_stock: Product_opening_stock || 0,
          Product_Fresh_Stock: Product_Fresh_Stock || 0,
          Product_Damage_stock: Product_Damage_stock || 0,
          Product_sample_stock: Product_sample_stock || 0,
          Prod_Showroom_stock: Prod_Showroom_stock || 0,
          Prod_image: Prod_image || '',
          Product_gst: roundTo2Decimals(parseFloat(Product_gst) || 0),
          Product_fragile: Product_fragile || false,
          Product_Notes: Product_Notes || '',
          Product_mustorder: Product_mustorder || 'NA',
          created_by: userId
        });

        return res.status(201).json({
          success: true,
          message: 'Product created successfully',
          data: newProduct
        });

      case 'GET':
        if (id) {
          // Get specific Product by ID
          const product = await Product.findOne({ Prod_ID: id })
            .populate('created_by', 'name email');

          if (!product) {
            return res.status(404).json({
              success: false,
              message: 'Product not found'
            });
          }

          return res.status(200).json({
            success: true,
            message: 'Product retrieved successfully',
            data: product
          });
        } else {
          // Get all Products with filters and search
          const {
            search,
            brand,
            category,
            sub_category,
            series,
            product_type,
            color,
            flag,
            fragile,
            page = 1,
            limit = 10
          } = req.query;

          let filter = {};

          // Search functionality
          if (search) {
            filter.$or = [
              { Prod_ID: { $regex: search, $options: 'i' } },
              { Product_code: { $regex: search, $options: 'i' } },
              { Product_Description: { $regex: search, $options: 'i' } },
              { Product_Brand: { $regex: search, $options: 'i' } },
              { Product_Category: { $regex: search, $options: 'i' } }
            ];
          }

          // Filters
          if (brand) filter.Product_Brand = { $regex: brand, $options: 'i' };
          if (category) filter.Product_Category = { $regex: category, $options: 'i' };
          if (sub_category) filter.Product_Sub_Category = { $regex: sub_category, $options: 'i' };
          if (series) filter.Product_Series = { $regex: series, $options: 'i' };
          if (product_type) filter.Product_Type = product_type;
          if (color) filter.Product_Color = { $regex: color, $options: 'i' };
          if (flag) filter.Product_Flag = flag;
          if (fragile !== undefined) filter.Product_fragile = fragile === 'true';

          const skip = (parseInt(page) - 1) * parseInt(limit);

          const products = await Product.find(filter)
            .populate('created_by', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

          const total = await Product.countDocuments(filter);

          return res.status(200).json({
            success: true,
            message: 'Products retrieved successfully',
            count: products.length,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            filters: {
              search, brand, category, sub_category, series,
              product_type, color, flag, fragile
            },
            data: products
          });
        }

      case 'PUT':
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'Product ID is required for update'
          });
        }

        const updateData = req.body;

        // Auto-create dropdowns if updated
        if (updateData.Product_Brand) {
          await ProductBrand.getOrCreate(updateData.Product_Brand, userId);
        }
        if (updateData.Product_Color) {
          await ProductColor.getOrCreate(updateData.Product_Color, userId);
        }
        if (updateData.Product_Category) {
          await ProductCategory.getOrCreate(updateData.Product_Category, userId);
        }
        if (updateData.Product_Sub_Category && updateData.Product_Category) {
          await ProductSubCategory.getOrCreate(updateData.Product_Sub_Category, updateData.Product_Category, userId);
        }
        if (updateData.Product_Series) {
          await ProductSeries.getOrCreate(updateData.Product_Series, userId);
        }

        const updatedProduct = await Product.findOneAndUpdate(
          { Prod_ID: id },
          updateData,
          { new: true, runValidators: true }
        ).populate('created_by', 'name email');

        if (!updatedProduct) {
          return res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Product updated successfully',
          data: updatedProduct
        });

      case 'DELETE':
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'Product ID is required for deletion'
          });
        }

        const deletedProduct = await Product.findOneAndDelete({ Prod_ID: id });

        if (!deletedProduct) {
          return res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Product deleted successfully',
          data: deletedProduct
        });

      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Product Management Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ========== Dropdown Data Management ==========
const manageDropdownData = async (req, res) => {
  try {
    const method = req.method;
    const { type, id } = req.params;
    const userId = req.user._id;

    const validTypes = ['brands', 'colors', 'categories', 'subcategories', 'series'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid dropdown type. Use one of: ${validTypes.join(', ')}`
      });
    }

    switch (method) {
      case 'GET':
        let data, filter = {};
        const { search, category } = req.query;

        if (search) {
          filter.name = { $regex: search, $options: 'i' };
        }

        switch (type) {
          case 'brands':
            data = await ProductBrand.find(filter).sort({ name: 1 }).populate('created_by', 'name');
            break;
          case 'colors':
            data = await ProductColor.find(filter).sort({ name: 1 }).populate('created_by', 'name');
            break;
          case 'categories':
            data = await ProductCategory.find(filter).sort({ name: 1 }).populate('created_by', 'name');
            break;
          case 'subcategories':
            if (category) {
              filter.category = { $regex: category, $options: 'i' };
            }
            data = await ProductSubCategory.find(filter).sort({ name: 1 }).populate('created_by', 'name');
            break;
          case 'series':
            data = await ProductSeries.find(filter).sort({ name: 1 }).populate('created_by', 'name');
            break;
        }

        return res.status(200).json({
          success: true,
          message: `${type} retrieved successfully`,
          count: data.length,
          filters: { search, category },
          data
        });

      case 'POST':
        const { name, category: parentCategory } = req.body;

        if (!name) {
          return res.status(400).json({
            success: false,
            message: `${type.slice(0, -1)} name is required`
          });
        }

        let newItem;
        switch (type) {
          case 'brands':
            newItem = await ProductBrand.getOrCreate(name, userId);
            break;
          case 'colors':
            newItem = await ProductColor.getOrCreate(name, userId);
            break;
          case 'categories':
            newItem = await ProductCategory.getOrCreate(name, userId);
            break;
          case 'subcategories':
            if (!parentCategory) {
              return res.status(400).json({
                success: false,
                message: 'Category is required for subcategory creation'
              });
            }
            await ProductCategory.getOrCreate(parentCategory, userId);
            newItem = await ProductSubCategory.getOrCreate(name, parentCategory, userId);
            break;
          case 'series':
            newItem = await ProductSeries.getOrCreate(name, userId);
            break;
        }

        return res.status(201).json({
          success: true,
          message: `${type.slice(0, -1)} created successfully`,
          data: newItem
        });

      case 'PUT':
        if (!id) {
          return res.status(400).json({
            success: false,
            message: `${type.slice(0, -1)} ID is required for update`
          });
        }

        const updateData = req.body;
        let updatedItem;

        switch (type) {
          case 'brands':
            updatedItem = await ProductBrand.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('created_by', 'name');
            break;
          case 'colors':
            updatedItem = await ProductColor.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('created_by', 'name');
            break;
          case 'categories':
            updatedItem = await ProductCategory.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('created_by', 'name');
            break;
          case 'subcategories':
            updatedItem = await ProductSubCategory.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('created_by', 'name');
            break;
          case 'series':
            updatedItem = await ProductSeries.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('created_by', 'name');
            break;
        }

        if (!updatedItem) {
          return res.status(404).json({
            success: false,
            message: `${type.slice(0, -1)} not found`
          });
        }

        return res.status(200).json({
          success: true,
          message: `${type.slice(0, -1)} updated successfully`,
          data: updatedItem
        });

      case 'DELETE':
        if (!id) {
          return res.status(400).json({
            success: false,
            message: `${type.slice(0, -1)} ID is required for deletion`
          });
        }

        // Check if item is being used by any product
        let inUseFilter = {};
        switch (type) {
          case 'brands':
            const brand = await ProductBrand.findById(id);
            if (brand) inUseFilter.Product_Brand = brand.name;
            break;
          case 'colors':
            const color = await ProductColor.findById(id);
            if (color) inUseFilter.Product_Color = color.name;
            break;
          case 'categories':
            const category = await ProductCategory.findById(id);
            if (category) inUseFilter.Product_Category = category.name;
            break;
          case 'subcategories':
            const subCategory = await ProductSubCategory.findById(id);
            if (subCategory) inUseFilter.Product_Sub_Category = subCategory.name;
            break;
          case 'series':
            const series = await ProductSeries.findById(id);
            if (series) inUseFilter.Product_Series = series.name;
            break;
        }

        const productInUse = await Product.findOne(inUseFilter);
        if (productInUse) {
          return res.status(400).json({
            success: false,
            message: `${type.slice(0, -1)} cannot be deleted as it is being used by products`
          });
        }

        let deletedItem;
        switch (type) {
          case 'brands':
            deletedItem = await ProductBrand.findByIdAndDelete(id);
            break;
          case 'colors':
            deletedItem = await ProductColor.findByIdAndDelete(id);
            break;
          case 'categories':
            deletedItem = await ProductCategory.findByIdAndDelete(id);
            break;
          case 'subcategories':
            deletedItem = await ProductSubCategory.findByIdAndDelete(id);
            break;
          case 'series':
            deletedItem = await ProductSeries.findByIdAndDelete(id);
            break;
        }

        if (!deletedItem) {
          return res.status(404).json({
            success: false,
            message: `${type.slice(0, -1)} not found`
          });
        }

        return res.status(200).json({
          success: true,
          message: `${type.slice(0, -1)} deleted successfully`,
          data: deletedItem
        });

      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Dropdown Management Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ========== Product Analytics ==========
const getProductAnalytics = async (req, res) => {
  try {
    const { type = 'summary' } = req.query;

    switch (type) {
      case 'summary':
        const totalProducts = await Product.countDocuments();
        const productsByBrand = await Product.aggregate([
          { $group: { _id: '$Product_Brand', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
        const productsByCategory = await Product.aggregate([
          { $group: { _id: '$Product_Category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);

        return res.status(200).json({
          success: true,
          message: 'Product analytics retrieved successfully',
          data: {
            totalProducts,
            productsByBrand,
            productsByCategory
          }
        });

      case 'stock':
        const stockAnalytics = await Product.aggregate([
          {
            $project: {
              Prod_ID: 1,
              Product_code: 1,
              Product_Description: 1,
              totalStock: {
                $add: [
                  '$Product_opening_stock',
                  '$Product_Fresh_Stock',
                  '$Product_Damage_stock',
                  '$Product_sample_stock',
                  '$Prod_Showroom_stock'
                ]
              },
              Product_opening_stock: 1,
              Product_Fresh_Stock: 1,
              Product_Damage_stock: 1,
              Product_sample_stock: 1,
              Prod_Showroom_stock: 1
            }
          },
          { $sort: { totalStock: -1 } }
        ]);

        return res.status(200).json({
          success: true,
          message: 'Stock analytics retrieved successfully',
          data: stockAnalytics
        });

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid analytics type. Use "summary" or "stock"'
        });
    }
  } catch (error) {
    console.error('Analytics Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ========== Product Dropdown ==========
const getProductDropdown = async (req, res) => {
  try {
    const { search, limit = 100 } = req.query;

    let filter = {};

    // Search functionality
    if (search) {
      filter.$or = [
        { Prod_ID: { $regex: search, $options: 'i' } },
        { Product_code: { $regex: search, $options: 'i' } },
        { Product_Description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter)
      .select('Prod_ID Product_code Product_Description Product_mrp')
      .sort({ Prod_ID: 1 })
      .limit(parseInt(limit));

    const dropdownData = products.map(product => ({
      id: product.Prod_ID,
      code: product.Product_code,
      description: product.Product_Description,
      mrp: product.Product_mrp,
      label: `${product.Prod_ID} - ${product.Product_Description}`
    }));

    return res.status(200).json({
      success: true,
      message: 'Product dropdown data retrieved successfully',
      count: dropdownData.length,
      filters: { search, limit },
      data: dropdownData
    });

  } catch (error) {
    console.error('Product Dropdown Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ========== Product Filter API (Combined Function) ==========
const getProductFilters = async (req, res) => {
  try {
    const {
      brand,
      category,
      subcategory,
      page = 1,
      limit = 50,
      type = 'products' // 'products', 'options', 'brands', 'categories', 'subcategories'
    } = req.query;

    // If type is for getting filter options only
    if (type !== 'products') {
      let result = {};

      switch (type) {
        case 'brands':
          const brands = await Product.distinct('Product_Brand');
          result.brands = brands.filter(brand => brand && brand.trim() !== '');
          break;

        case 'categories':
          let categoryFilter = {};
          if (brand) {
            categoryFilter.Product_Brand = brand;
          }
          const categories = await Product.distinct('Product_Category', categoryFilter);
          result.categories = categories.filter(cat => cat && cat.trim() !== '');
          break;

        case 'subcategories':
          let subCategoryFilter = {};
          if (brand) {
            subCategoryFilter.Product_Brand = brand;
          }
          if (category) {
            subCategoryFilter.Product_Category = category;
          }
          const subcategories = await Product.distinct('Product_Sub_Category', subCategoryFilter);
          result.subcategories = subcategories.filter(subcat => subcat && subcat.trim() !== '');
          break;

        case 'options':
        default:
          // Get all filter options
          const allBrands = await Product.distinct('Product_Brand');
          const allCategories = await Product.distinct('Product_Category');
          const allSubCategories = await Product.distinct('Product_Sub_Category');

          result = {
            brands: allBrands.filter(brand => brand && brand.trim() !== ''),
            categories: allCategories.filter(cat => cat && cat.trim() !== ''),
            subcategories: allSubCategories.filter(subcat => subcat && subcat.trim() !== '')
          };
          break;
      }

      return res.status(200).json({
        success: true,
        message: 'Filter options retrieved successfully',
        data: result
      });
    }

    // Main product filtering logic
    let filter = {};
    let cascadeData = {};

    // Build filter based on selections
    if (brand) {
      filter.Product_Brand = brand;
    }
    if (category) {
      filter.Product_Category = category;
    }
    if (subcategory) {
      filter.Product_Sub_Category = subcategory;
    }

    // Get filtered products
    const skip = (page - 1) * limit;
    const products = await Product.find(filter)
      .select('Prod_ID Product_code Product_Description Product_Brand Product_Category Product_Sub_Category Product_mrp Product_Type Product_Color Product_Series Prod_image Product_gst Product_fragile')
      .sort({ Prod_ID: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalProducts = await Product.countDocuments(filter);

    // Get cascading filter data based on current selections
    if (brand) {
      // If brand is selected, get categories and subcategories for that brand
      const categoryFilter = { Product_Brand: brand };
      const categories = await Product.distinct('Product_Category', categoryFilter);
      cascadeData.categories = categories.filter(cat => cat && cat.trim() !== '');

      if (category) {
        // If both brand and category selected, get subcategories
        const subCategoryFilter = { Product_Brand: brand, Product_Category: category };
        const subcategories = await Product.distinct('Product_Sub_Category', subCategoryFilter);
        cascadeData.subcategories = subcategories.filter(subcat => subcat && subcat.trim() !== '');
      }
    } else if (category) {
      // If only category is selected, get subcategories and brands for that category
      const brandFilter = { Product_Category: category };
      const brands = await Product.distinct('Product_Brand', brandFilter);
      cascadeData.brands = brands.filter(brand => brand && brand.trim() !== '');

      const subCategoryFilter = { Product_Category: category };
      const subcategories = await Product.distinct('Product_Sub_Category', subCategoryFilter);
      cascadeData.subcategories = subcategories.filter(subcat => subcat && subcat.trim() !== '');
    } else {
      // If no filters, get all brands and categories
      const allBrands = await Product.distinct('Product_Brand');
      cascadeData.brands = allBrands.filter(brand => brand && brand.trim() !== '');

      const allCategories = await Product.distinct('Product_Category');
      cascadeData.categories = allCategories.filter(cat => cat && cat.trim() !== '');
    }

    return res.status(200).json({
      success: true,
      message: 'Product filters applied successfully',
      data: {
        products: products,
        cascadeOptions: cascadeData,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalProducts / limit),
          totalProducts: totalProducts,
          hasNext: page * limit < totalProducts,
          hasPrev: page > 1
        },
        appliedFilters: {
          brand: brand || null,
          category: category || null,
          subcategory: subcategory || null
        }
      }
    });

  } catch (error) {
    console.error('Product Filter Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ========== Upload Products from Excel file ==========
// @desc    Upload Products from Excel file
// @route   POST /api/product/upload-excel
// @access  Protected
const uploadProductsFromExcel = async (req, res, next) => {
  try {
    console.log('========================================');
    console.log('STEP 1: Product Excel upload initiated...');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    console.log('========================================');

    // Check if file is uploaded
    if (!req.file) {
      console.log('ERROR: No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'Excel file is required'
      });
    }

    console.log('STEP 2: File received:', req.file.originalname);

    // Validate file type
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    console.log('STEP 3: Validating file extension:', fileExtension);

    if (!allowedExtensions.includes(fileExtension)) {
      console.log('ERROR: Invalid file extension');
      return res.status(400).json({
        success: false,
        message: 'Only .xlsx and .xls files are allowed'
      });
    }

    console.log('STEP 4: Reading Excel file...');

    // Read Excel file
    // NOTE: uploadExcelFile uses multer.memoryStorage(), so `req.file.path` is typically undefined.
    // Prefer reading from buffer; fall back to path if present.
    let workbook;
    if (req.file.buffer) {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      console.log('STEP 4A: Excel read from memory buffer');
    } else if (req.file.path) {
      workbook = XLSX.readFile(req.file.path);
      console.log('STEP 4A: Excel read from file path:', req.file.path);
    } else {
      console.log('ERROR: Uploaded file has no buffer or path');
      return res.status(400).json({
        success: false,
        message: 'Uploaded Excel file could not be read (missing buffer/path)'
      });
    }
    const sheetName = workbook.SheetNames[0]; // Get first sheet
    const worksheet = workbook.Sheets[sheetName];

    console.log('STEP 5: Excel file read successfully, sheet name:', sheetName);

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log('STEP 6: Excel data converted to JSON');

    if (!jsonData || jsonData.length === 0) {
      console.log('ERROR: Excel file is empty');
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or has no valid data'
      });
    }

    console.log(`STEP 7: Found ${jsonData.length} rows in Excel file`);

    // Validate and process data
    const results = {
      successful: [],
      failed: [],
      duplicates: [],
      totalRows: jsonData.length
    };

    const userId = req.user._id;

    // Expected columns (flexible mapping — case-insensitive matching applied separately)
    const columnMapping = {
      'Product_code': ['Product_code', 'Product Code', 'Code', 'SKU', 'Item Code', 'Item_Code', 'ProductCode', 'Prod Code', 'Prod_Code', 'Product ID', 'Product_ID'],
      'Product_Description': ['Product_Description', 'Product Description', 'Description', 'Name', 'Item Name', 'Item_Name', 'Product Name', 'Product_Name', 'Title', 'Item Description'],
      'Product_Brand': ['Product_Brand', 'Product Brand', 'Brand', 'Brand Name', 'Make'],
      'Product_Type': ['Product_Type', 'Product Type', 'Type', 'Item Type', 'Tile Type'],
      'Product_Color': ['Product_Color', 'Product Color', 'Color', 'Colour', 'Shade', 'Color Name'],
      'Product_mrp': ['Product_mrp', 'Product MRP', 'MRP', 'Price', 'Rate', 'Unit Price', 'Selling Price', 'List Price', 'Basic Price', 'Basic Rate'],
      'Product_Flag': ['Product_Flag', 'Product Flag', 'Flag', 'Status', 'Product Status'],
      'Product_Category': ['Product_Category', 'Product Category', 'Category', 'Cat', 'Item Category', 'Main Category'],
      'Product_Sub_Category': ['Product_Sub_Category', 'Product Sub Category', 'Sub Category', 'Subcategory', 'Sub_Category', 'SubCategory', 'Sub Cat', 'Item Sub Category'],
      'Product_Series': ['Product_Series', 'Product Series', 'Series', 'Collection', 'Range'],
      'Product_Discount_sale_low': ['Product_Discount_sale_low', 'Discount Low', 'Low Discount', 'Sale Discount Low', 'Disc Low', 'Discount%', 'Discount', 'Sale Disc Low'],
      'Product_discount_sale_high': ['Product_discount_sale_high', 'Discount High', 'High Discount', 'Sale Discount High', 'Disc High', 'Sale Disc High'],
      'Prod_Purc_scheme': ['Prod_Purc_scheme', 'Purchase Scheme', 'Scheme', 'Purc Scheme', 'Purchase Scheme Flag'],
      'Prod_scheme_discount': ['Prod_scheme_discount', 'Scheme Discount', 'Scheme Disc'],
      'Product_purc_base_disc': ['Product_purc_base_disc', 'Base Discount', 'Purchase Base Discount', 'Purc Base Disc', 'Base Disc'],
      'Product_opening_stock': ['Product_opening_stock', 'Opening Stock', 'Stock', 'Qty', 'Quantity', 'Opening Qty', 'Op Stock', 'Closing Stock', 'Balance'],
      'Product_Fresh_Stock': ['Product_Fresh_Stock', 'Fresh Stock', 'Fresh Qty', 'Good Stock'],
      'Product_Damage_stock': ['Product_Damage_stock', 'Damage Stock', 'Damaged Stock', 'Damage Qty', 'Defective'],
      'Product_sample_stock': ['Product_sample_stock', 'Sample Stock', 'Sample Qty'],
      'Prod_Showroom_stock': ['Prod_Showroom_stock', 'Showroom Stock', 'Display Stock', 'Showroom Qty'],
      'Product_gst': ['Product_gst', 'GST', 'Tax', 'GST%', 'GST Rate', 'Tax Rate', 'Tax %'],
      'Product_fragile': ['Product_fragile', 'Fragile', 'Breakable', 'Is Fragile'],
      'Product_Notes': ['Product_Notes', 'Notes', 'Remarks', 'Comment', 'Comments', 'Note'],
      'Product_mustorder': ['Product_mustorder', 'Must Order', 'Reference', 'Must Order Ref', 'Order Ref']
    };

    // Helper function to find column value (case-insensitive + whitespace-tolerant)
    const normalizeKey = (key) => key.toString().toLowerCase().replace(/[_\s]+/g, '').trim();

    // Build a normalized key → original value lookup for each row
    const buildNormalizedRow = (row) => {
      const map = {};
      for (const key of Object.keys(row)) {
        map[normalizeKey(key)] = row[key];
      }
      return map;
    };

    // Return a cell value trimmed; treat whitespace-only strings as null
    const sanitize = (v) => {
      if (v === undefined || v === null) return null;
      const s = String(v).trim();
      return s === '' ? null : s;
    };

    const findColumnValue = (row, fieldName, normalizedRow) => {
      const possibleColumns = columnMapping[fieldName] || [fieldName];
      // 1. Exact match first
      for (const col of possibleColumns) {
        const val = sanitize(row[col]);
        if (val !== null) return val;
      }
      // 2. Case/whitespace-insensitive match
      for (const col of possibleColumns) {
        const nk = normalizeKey(col);
        const val = sanitize(normalizedRow[nk]);
        if (val !== null) return val;
      }
      return null;
    };

    // Log first row keys to aid debugging
    if (jsonData.length > 0) {
      console.log('STEP 7A: First row column keys:', Object.keys(jsonData[0]));
      console.log('STEP 7B: First row sample data:', jsonData[0]);
    }

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2; // Excel row number (considering header)
      const normalizedRow = buildNormalizedRow(row);

      try {
        // Extract data from row
        const productCode = findColumnValue(row, 'Product_code', normalizedRow);
        const productDescription = findColumnValue(row, 'Product_Description', normalizedRow);
        const productBrand = findColumnValue(row, 'Product_Brand', normalizedRow);
        const productTypeRaw = findColumnValue(row, 'Product_Type', normalizedRow);
        const productColor = findColumnValue(row, 'Product_Color', normalizedRow);
        const productMrp = findColumnValue(row, 'Product_mrp', normalizedRow);
        const productFlagRaw = findColumnValue(row, 'Product_Flag', normalizedRow);
        const productCategory = findColumnValue(row, 'Product_Category', normalizedRow);
        const productSubCategory = findColumnValue(row, 'Product_Sub_Category', normalizedRow);

        // Normalise Product_Type (case-insensitive, trim)
        const validTypes = ['Rough', 'Trim', 'Combo', 'Upper'];
        const productType = productTypeRaw
          ? validTypes.find(t => t.toLowerCase() === productTypeRaw.toString().trim().toLowerCase()) || productTypeRaw.toString().trim()
          : null;

        // Normalise Product_Flag (case-insensitive, trim)
        const validFlags = ['S2s', 'O2s', 'TSL', 'NP', 'OBSELETE', 'NA'];
        const productFlag = productFlagRaw
          ? validFlags.find(f => f.toLowerCase() === productFlagRaw.toString().trim().toLowerCase()) || productFlagRaw.toString().trim()
          : 'S2s'; // Default to S2s if not provided

        // Validate required fields
        if (!productCode) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Product Code is required'
          });
          continue;
        }

        if (!productDescription) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Product Description is required'
          });
          continue;
        }

        if (!productBrand) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Product Brand is required'
          });
          continue;
        }

        if (!productType || !['Rough', 'Trim', 'Combo', 'Upper'].includes(productType)) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: `Product Type is required and must be one of: Rough, Trim, Combo, Upper (got: "${productTypeRaw}")`
          });
          continue;
        }

        if (!productColor) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Product Color is required'
          });
          continue;
        }

        if (!productMrp || isNaN(productMrp) || parseFloat(productMrp) <= 0) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Product MRP is required and must be a positive number'
          });
          continue;
        }

        if (!productFlag || !['S2s', 'O2s', 'TSL', 'NP', 'OBSELETE', 'NA'].includes(productFlag)) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: `Product Flag must be one of: S2s, O2s, TSL, NP, OBSELETE, NA (got: "${productFlagRaw}")`
          });
          continue;
        }

        if (!productCategory) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Product Category is required'
          });
          continue;
        }

        if (!productSubCategory) {
          results.failed.push({
            row: rowNumber,
            data: row,
            error: 'Product Sub Category is required'
          });
          continue;
        }

        // Check for duplicates
        const existingProduct = await Product.findOne({ Product_code: productCode });
        if (existingProduct) {
          results.duplicates.push({
            row: rowNumber,
            data: row,
            existing: existingProduct,
            error: 'Product with this code already exists'
          });
          continue;
        }

        // Auto-create dropdowns if needed
        if (productBrand) {
          await ProductBrand.getOrCreate(productBrand, userId);
        }
        if (productColor) {
          await ProductColor.getOrCreate(productColor, userId);
        }
        if (productCategory) {
          await ProductCategory.getOrCreate(productCategory, userId);
        }
        if (productSubCategory && productCategory) {
          await ProductSubCategory.getOrCreate(productSubCategory, productCategory, userId);
        }

        const productSeries = findColumnValue(row, 'Product_Series', normalizedRow);
        if (productSeries) {
          await ProductSeries.getOrCreate(productSeries, userId);
        }

        const purcSchemeRaw = findColumnValue(row, 'Prod_Purc_scheme', normalizedRow);
        const fragileRaw = findColumnValue(row, 'Product_fragile', normalizedRow);

        // Create product data object
        const productData = {
          Product_code: productCode,
          Product_Description: productDescription,
          Product_Brand: productBrand,
          Product_Type: productType,
          Product_Color: productColor,
          Product_mrp: parseFloat(productMrp),
          Product_Flag: productFlag,
          Product_Category: productCategory,
          Product_Sub_Category: productSubCategory,
          Product_Series: productSeries || '',
          Product_Discount_sale_low: Math.max(0, parseFloat(findColumnValue(row, 'Product_Discount_sale_low', normalizedRow)) || 0),
          Product_discount_sale_high: Math.max(0, parseFloat(findColumnValue(row, 'Product_discount_sale_high', normalizedRow)) || 0),
          Prod_Purc_scheme: purcSchemeRaw === 'true' || purcSchemeRaw === true || false,
          Prod_scheme_discount: Math.max(0, parseFloat(findColumnValue(row, 'Prod_scheme_discount', normalizedRow)) || 0),
          Product_purc_base_disc: Math.max(0, parseFloat(findColumnValue(row, 'Product_purc_base_disc', normalizedRow)) || 0),
          Product_opening_stock: Math.max(0, parseFloat(findColumnValue(row, 'Product_opening_stock', normalizedRow)) || 0),
          Product_Fresh_Stock: Math.max(0, parseFloat(findColumnValue(row, 'Product_Fresh_Stock', normalizedRow)) || 0),
          Product_Damage_stock: Math.max(0, parseFloat(findColumnValue(row, 'Product_Damage_stock', normalizedRow)) || 0),
          Product_sample_stock: Math.max(0, parseFloat(findColumnValue(row, 'Product_sample_stock', normalizedRow)) || 0),
          Prod_Showroom_stock: Math.max(0, parseFloat(findColumnValue(row, 'Prod_Showroom_stock', normalizedRow)) || 0),
          Product_gst: roundTo2Decimals(parseFloat(findColumnValue(row, 'Product_gst', normalizedRow)) || 0),
          Product_fragile: fragileRaw === 'true' || fragileRaw === true || false,
          Product_Notes: findColumnValue(row, 'Product_Notes', normalizedRow) || '',
          Product_mustorder: findColumnValue(row, 'Product_mustorder', normalizedRow) || 'NA',
          created_by: userId
        };

        // Create new product
        const newProduct = await Product.create(productData);

        results.successful.push({
          row: rowNumber,
          data: newProduct
        });

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.failed.push({
          row: rowNumber,
          data: row,
          error: error.message || 'Unknown error occurred'
        });
      }
    }

    // Clean up uploaded file (only if stored on disk)
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('STEP 10: Uploaded file deleted successfully');
      } catch (cleanupError) {
        console.warn('WARNING: Could not delete uploaded file:', cleanupError.message);
      }
    }

    console.log('========================================');
    console.log('STEP 11: Product Excel upload completed');
    console.log('Summary:', {
      total: results.totalRows,
      successful: results.successful.length,
      failed: results.failed.length,
      duplicates: results.duplicates.length
    });
    console.log('========================================');

    return res.status(200).json({
      success: true,
      message: `Excel upload completed. ${results.successful.length}/${results.totalRows} records processed successfully`,
      data: {
        summary: {
          totalRows: results.totalRows,
          successful: results.successful.length,
          failed: results.failed.length,
          duplicates: results.duplicates.length
        },
        successful: results.successful,
        failed: results.failed,
        duplicates: results.duplicates
      }
    });

  } catch (error) {
    console.error('========================================');
    console.error('ERROR in Product Excel upload:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('========================================');

    // Clean up uploaded file in case of error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Cleanup: Uploaded file deleted after error');
      } catch (cleanupError) {
        console.warn('WARNING: Could not delete uploaded file:', cleanupError.message);
      }
    }

    next(error);
  }
};

// ========== Generate and download Products PDF ==========
// @desc    Generate and download Products PDF  
// @route   GET /api/product/export-pdf
// @access  Protected
const generateProductsPDF = async (req, res, next) => {
  try {
    console.log('========================================');
    console.log('STEP 1: Product PDF generation initiated...');
    console.log('Query parameters:', req.query);
    console.log('========================================');

    // Dynamic import of jsPDF to handle ES module compatibility
    console.log('STEP 2: Loading jsPDF module...');
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
    await import('jspdf-autotable');
    console.log('STEP 2: jsPDF module loaded successfully');

    // Get query parameters for filtering
    const {
      search,
      brand,
      category,
      sub_category,
      product_type,
      color,
      includeStock = 'false'
    } = req.query;

    console.log('STEP 3: Building filter...');
    console.log('includeStock parameter:', includeStock);

    let filter = {};

    // Apply search filter if provided
    if (search) {
      console.log('Applying search filter:', search);
      filter.$or = [
        { Prod_ID: new RegExp(search, 'i') },
        { Product_code: new RegExp(search, 'i') },
        { Product_Description: new RegExp(search, 'i') },
        { Product_Brand: new RegExp(search, 'i') },
        { Product_Category: new RegExp(search, 'i') }
      ];
    }

    // Apply specific filters
    if (brand) {
      console.log('Applying brand filter:', brand);
      filter.Product_Brand = brand;
    }
    if (category) {
      console.log('Applying category filter:', category);
      filter.Product_Category = category;
    }
    if (sub_category) {
      console.log('Applying sub_category filter:', sub_category);
      filter.Product_Sub_Category = sub_category;
    }
    if (product_type) {
      console.log('Applying product_type filter:', product_type);
      filter.Product_Type = product_type;
    }
    if (color) {
      console.log('Applying color filter:', color);
      filter.Product_Color = color;
    }

    console.log('STEP 4: Final filter applied:', JSON.stringify(filter));

    // Fetch products data
    console.log('STEP 5: Fetching products from database...');
    const products = await Product.find(filter).sort({ Prod_ID: 1 });
    console.log('STEP 5: Products fetched, count:', products ? products.length : 0);

    if (!products || products.length === 0) {
      console.log('STEP 6: No products found, returning 404');
      console.log('========================================');
      return res.status(404).json({
        success: false,
        message: 'No Products found to export'
      });
    }

    console.log(`STEP 6: Generating PDF for ${products.length} Products`);

    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(40, 116, 166);
    doc.text('Products Report', 14, 20);

    // Add generation date and filter info
    doc.setFontSize(10);
    doc.setTextColor(100);
    const currentDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generated on: ${currentDate}`, 14, 28);

    let yPos = 33;
    if (search) {
      doc.text(`Search Filter: "${search}"`, 14, yPos);
      yPos += 5;
    }
    if (brand) {
      doc.text(`Brand Filter: "${brand}"`, 14, yPos);
      yPos += 5;
    }
    if (category) {
      doc.text(`Category Filter: "${category}"`, 14, yPos);
      yPos += 5;
    }

    doc.text(`Total Records: ${products.length}`, 14, yPos);
    yPos += 5;

    // Prepare table data
    let tableColumns, tableRows;

    if (includeStock === 'true') {
      tableColumns = [
        'S.No.',
        'Product ID',
        'Code',
        'Description',
        'Brand',
        'Type',
        'Category',
        'MRP',
        'Opening Stock',
        'Fresh Stock',
        'Damage Stock'
      ];

      tableRows = products.map((product, index) => [
        (index + 1).toString(),
        product.Prod_ID || '-',
        product.Product_code || '-',
        (product.Product_Description || '-').substring(0, 30) + '...',
        product.Product_Brand || '-',
        product.Product_Type || '-',
        product.Product_Category || '-',
        `₹${product.Product_mrp || 0}`,
        product.Product_opening_stock || 0,
        product.Product_Fresh_Stock || 0,
        product.Product_Damage_stock || 0
      ]);
    } else {
      tableColumns = [
        'S.No.',
        'Product ID',
        'Code',
        'Description',
        'Brand',
        'Type',
        'Color',
        'Category',
        'Sub Category',
        'MRP',
        'GST%'
      ];

      tableRows = products.map((product, index) => [
        (index + 1).toString(),
        product.Prod_ID || '-',
        product.Product_code || '-',
        (product.Product_Description || '-').substring(0, 25) + '...',
        product.Product_Brand || '-',
        product.Product_Type || '-',
        product.Product_Color || '-',
        product.Product_Category || '-',
        product.Product_Sub_Category || '-',
        `₹${product.Product_mrp || 0}`,
        `${product.Product_gst || 0}%`
      ]);
    }

    // Add table to PDF
    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: yPos + 5,
      theme: 'striped',
      headStyles: {
        fillColor: [40, 116, 166],
        textColor: 255,
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: 50
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: includeStock === 'true' ? {
        0: { cellWidth: 15, halign: 'center' }, // S.No.
        1: { cellWidth: 25, halign: 'center' }, // Product ID
        2: { cellWidth: 25, halign: 'left' },   // Code
        3: { cellWidth: 40, halign: 'left' },   // Description
        4: { cellWidth: 25, halign: 'left' },   // Brand
        5: { cellWidth: 20, halign: 'center' }, // Type
        6: { cellWidth: 25, halign: 'left' },   // Category
        7: { cellWidth: 25, halign: 'right' },  // MRP
        8: { cellWidth: 20, halign: 'center' }, // Opening Stock
        9: { cellWidth: 20, halign: 'center' }, // Fresh Stock
        10: { cellWidth: 20, halign: 'center' } // Damage Stock
      } : {
        0: { cellWidth: 15, halign: 'center' }, // S.No.
        1: { cellWidth: 25, halign: 'center' }, // Product ID
        2: { cellWidth: 25, halign: 'left' },   // Code
        3: { cellWidth: 35, halign: 'left' },   // Description
        4: { cellWidth: 25, halign: 'left' },   // Brand
        5: { cellWidth: 20, halign: 'center' }, // Type
        6: { cellWidth: 25, halign: 'left' },   // Color
        7: { cellWidth: 25, halign: 'left' },   // Category
        8: { cellWidth: 25, halign: 'left' },   // Sub Category
        9: { cellWidth: 25, halign: 'right' },  // MRP
        10: { cellWidth: 20, halign: 'center' } // GST%
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      margin: { top: 10, left: 14, right: 14 }
    });

    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Page ${i} of ${pageCount} | Generated by IshanthTube Admin System`,
        14,
        doc.internal.pageSize.height - 10
      );
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `products-${timestamp}.pdf`;

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send PDF
    console.log('STEP 10: Sending PDF to client...');
    const pdfOutput = doc.output();
    res.send(Buffer.from(pdfOutput, 'binary'));

    console.log(`STEP 11: Product PDF generated successfully: ${filename}`);
    console.log('========================================');

  } catch (error) {
    console.error('========================================');
    console.error('ERROR in Product PDF generation:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('========================================');
    next(error);
  }
};

// ========== Product Image Search (DuckDuckGo – no API key required) ==========
const searchProductImages = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const q = query.trim();
    console.log(`🔍 Searching DuckDuckGo images for: "${q}"`);

    const { default: axios } = await import('axios');

    const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    // Step 1: visit homepage to get session cookies (required to avoid 403)
    const homeRes = await axios.get('https://duckduckgo.com/', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      timeout: 12000,
    });
    const cookies = (homeRes.headers['set-cookie'] || [])
      .map(c => c.split(';')[0])
      .join('; ');

    // Step 2: fetch search page with cookies to extract vqd token
    const searchRes = await axios.get('https://duckduckgo.com/', {
      params: { q, iax: 'images', ia: 'images' },
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://duckduckgo.com/',
        'Cookie': cookies,
      },
      timeout: 12000,
    });

    const vqd = searchRes.data.match(/vqd=['"]([^'"]+)['"]/)?.[1];
    if (!vqd) {
      console.warn('⚠️  Could not extract vqd token');
      return res.status(200).json({ success: true, data: [], message: 'No images found for this search.' });
    }
    console.log(`✅ DuckDuckGo vqd token: ${vqd}`);

    // Step 3: fetch image results with cookies + correct referer (prevents 403)
    const imgRes = await axios.get('https://duckduckgo.com/i.js', {
      params: { l: 'us-en', o: 'json', q, vqd, f: ',,,', p: '1' },
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`,
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': cookies,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      timeout: 12000,
    });

    const hits = (imgRes.data.results || []).slice(0, 18);
    const images = hits.map((hit, i) => ({
      id: i,
      previewURL: hit.thumbnail || hit.image,
      webformatURL: hit.image,
      largeImageURL: hit.image,
      tags: hit.title || q,
      pageURL: hit.url,
      user: hit.source,
    }));

    console.log(`✅ Found ${images.length} images for "${q}"`);
    return res.status(200).json({ success: true, message: `Found ${images.length} images`, total: images.length, data: images });

  } catch (error) {
    console.error('Image search error:', error.message);
    return res.status(200).json({
      success: true,
      data: [],
      message: 'Image search temporarily unavailable. Try a different search term or upload an image manually.',
    });
  }
};

export {
  manageProducts,
  manageDropdownData,
  getProductAnalytics,
  getProductDropdown,
  getProductFilters,
  uploadProductsFromExcel,
  generateProductsPDF,
  searchProductImages
};