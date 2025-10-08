import { Brand } from './brand.model.js';
import mongoose from 'mongoose';

// Middleware to check Super Admin access
const checkSuperAdminAccess = (req, res, next) => {
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only Super Admin can manage brands.'
    });
  }
  next();
};

// ========== Main Brand Management (Consolidated CRUD) ==========
const manageBrands = async (req, res) => {
  try {
    // Check Super Admin access first
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Admin can manage brands.'
      });
    }

    const method = req.method;
    const { id } = req.params;
    const userId = req.user._id;

    switch (method) {
      case 'POST':
        // Create new Brand
        const {
          Brand_Code,
          Brand_Name,
          Supplier_Name
        } = req.body;

        // Check if Brand_Code already exists (if provided)
        if (Brand_Code) {
          const existingBrand = await Brand.findOne({ Brand_Code });
          if (existingBrand) {
            return res.status(400).json({
              success: false,
              message: 'Brand with this code already exists'
            });
          }
        }

        // Check if Brand_Name already exists
        const existingBrandName = await Brand.findOne({ Brand_Name: Brand_Name });
        if (existingBrandName) {
          return res.status(400).json({
            success: false,
            message: 'Brand with this name already exists'
          });
        }

        // Create Brand
        const brandData = {
          Brand_Code,
          Brand_Name,
          Supplier_Name,
          created_by: userId
        };

        const newBrand = await Brand.create(brandData);

        // Populate created by user details for response
        const populatedBrand = await Brand.findById(newBrand._id)
          .populate('created_by', 'User Name Email id');

        return res.status(201).json({
          success: true,
          message: 'Brand created successfully',
          data: populatedBrand
        });

      case 'GET':
        if (id) {
          // Get specific Brand by ID with all details
          const brand = await Brand.findOne({ Brand_Code: id })
            .populate('created_by', 'User Name Email id');

          if (!brand) {
            return res.status(404).json({
              success: false,
              message: 'Brand not found'
            });
          }

          return res.status(200).json({
            success: true,
            message: 'Brand retrieved successfully',
            data: brand
          });
        } else {
          // Get all Brands with filters and search
          const {
            search,
            supplier,
            include_details,
            page = 1,
            limit = 10
          } = req.query;

          let filter = {};
          
          // Search functionality
          if (search) {
            filter.$or = [
              { Brand_Code: { $regex: search, $options: 'i' } },
              { Brand_Name: { $regex: search, $options: 'i' } },
              { Supplier_Name: { $regex: search, $options: 'i' } }
            ];
          }

          // Filter by supplier
          if (supplier) {
            filter.Supplier_Name = { $regex: supplier, $options: 'i' };
          }

          const skip = (parseInt(page) - 1) * parseInt(limit);
          
          let query = Brand.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

          // Include detailed references if requested
          if (include_details === 'true') {
            query = query.populate('created_by', 'User Name Email id');
          }

          const brands = await query;
          const total = await Brand.countDocuments(filter);

          return res.status(200).json({
            success: true,
            message: 'Brands retrieved successfully',
            count: brands.length,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            filters: {
              search,
              supplier,
              include_details
            },
            data: brands
          });
        }

      case 'PUT':
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'Brand ID is required for update'
          });
        }

        // Check if Brand_Name already exists (excluding current brand)
        if (req.body.Brand_Name) {
          const existingBrandName = await Brand.findOne({ 
            Brand_Name: req.body.Brand_Name,
            Brand_Code: { $ne: id }
          });
          if (existingBrandName) {
            return res.status(400).json({
              success: false,
              message: 'Brand with this name already exists'
            });
          }
        }

        const updatedBrand = await Brand.findOneAndUpdate(
          { Brand_Code: id },
          req.body,
          { new: true, runValidators: true }
        ).populate('created_by', 'User Name Email id');

        if (!updatedBrand) {
          return res.status(404).json({
            success: false,
            message: 'Brand not found'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Brand updated successfully',
          data: updatedBrand
        });

      case 'DELETE':
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'Brand ID is required for deletion'
          });
        }

        const deletedBrand = await Brand.findOneAndDelete({ Brand_Code: id });

        if (!deletedBrand) {
          return res.status(404).json({
            success: false,
            message: 'Brand not found'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Brand deleted successfully',
          data: deletedBrand
        });

      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Brand Management Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ========== Analytics & Reports ==========
const getBrandAnalytics = async (req, res) => {
  try {
    // Check Super Admin access first
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Admin can view brand analytics.'
      });
    }

    const { type = 'summary' } = req.query;

    switch (type) {
      case 'summary':
        const analytics = await Brand.getBrandAnalytics();
        
        return res.status(200).json({
          success: true,
          message: 'Brand analytics retrieved successfully',
          data: analytics
        });

      case 'detailed':
        const detailedAnalytics = await Brand.aggregate([
          {
            $facet: {
              monthlyGrowth: [
                {
                  $group: {
                    _id: {
                      year: { $year: '$createdAt' },
                      month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                  }
                },
                { $sort: { '_id.year': -1, '_id.month': -1 } },
                { $limit: 12 }
              ],
              supplierDistribution: [
                { $group: { _id: '$Supplier_Name', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
              ]
            }
          }
        ]);

        return res.status(200).json({
          success: true,
          message: 'Detailed brand analytics retrieved successfully',
          data: detailedAnalytics[0]
        });

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid analytics type. Use "summary" or "detailed"'
        });
    }
  } catch (error) {
    console.error('Brand Analytics Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ========== Get All Brands Dropdown ==========
const getAllBrandsDropdown = async (req, res) => {
  try {
    // Check Super Admin access first
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Admin can access brand dropdown.'
      });
    }

    const { search, supplier, limit = 100 } = req.query;

    let filter = {};

    // Search functionality
    if (search) {
      filter.$or = [
        { Brand_Code: { $regex: search, $options: 'i' } },
        { Brand_Name: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by supplier
    if (supplier) {
      filter.Supplier_Name = { $regex: supplier, $options: 'i' };
    }

    const brands = await Brand.find(filter)
      .select('Brand_Code Brand_Name Supplier_Name')
      .sort({ Brand_Name: 1 })
      .limit(parseInt(limit));

    const dropdownData = brands.map(brand => ({
      id: brand.Brand_Code,
      name: brand.Brand_Name,
      supplier: brand.Supplier_Name,
      label: `${brand.Brand_Code} - ${brand.Brand_Name}`
    }));

    return res.status(200).json({
      success: true,
      message: 'All Brand dropdown data retrieved successfully',
      count: dropdownData.length,
      filters: { search, supplier, limit },
      data: dropdownData
    });

  } catch (error) {
    console.error('Brand Dropdown Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export {
  manageBrands,
  getBrandAnalytics,
  getAllBrandsDropdown
};
