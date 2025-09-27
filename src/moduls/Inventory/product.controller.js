import { 
  Product, 
  ProductBrand, 
  ProductColor, 
  ProductCategory, 
  ProductSubCategory, 
  ProductSeries 
} from './product.model.js';
import mongoose from 'mongoose';

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
          Prod_image: req.file ? req.file.filename : (Prod_image || ''),
          Product_gst: Product_gst || 0,
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

        // Handle file upload for image
        if (req.file) {
          updateData.Prod_image = req.file.filename;
        }

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

export {
  manageProducts,
  manageDropdownData,
  getProductAnalytics,
  getProductDropdown
};