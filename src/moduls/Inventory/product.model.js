import mongoose from 'mongoose';

// Product Brand Schema (for dropdown management)
const productBrandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Brand name is required'],
    trim: true,
    minlength: [2, 'Brand name must be at least 2 characters long'],
    maxlength: [50, 'Brand name cannot exceed 50 characters']
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Product Color Schema (for dropdown management)
const productColorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Color name is required'],
    trim: true,
    minlength: [2, 'Color name must be at least 2 characters long'],
    maxlength: [30, 'Color name cannot exceed 30 characters']
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Product Category Schema (for dropdown management)
const productCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters long'],
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Product Sub Category Schema (for dropdown management)
const productSubCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Sub Category name is required'],
    trim: true,
    minlength: [2, 'Sub Category name must be at least 2 characters long'],
    maxlength: [50, 'Sub Category name cannot exceed 50 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required for sub category'],
    trim: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Product Series Schema (for dropdown management)
const productSeriesSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Series name is required'],
    trim: true,
    minlength: [2, 'Series name must be at least 2 characters long'],
    maxlength: [50, 'Series name cannot exceed 50 characters']
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Main Product Schema
const productSchema = new mongoose.Schema({
  Prod_ID: {
    type: String,
    required: false, // Auto-generated
    trim: true
  },
  Product_code: {
    type: String,
    required: [true, 'Product code is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Product code cannot be empty'
    }
  },
  Product_Description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Product description cannot be empty'
    }
  },
  Product_Brand: {
    type: String,
    required: [true, 'Product brand is required'],
    trim: true
  },
  Product_Type: {
    type: String,
    required: [true, 'Product type is required'],
    enum: ['Rough', 'Trim'],
    trim: true
  },
  Product_Color: {
    type: String,
    required: [true, 'Product color is required'],
    trim: true
  },
  Product_mrp: {
    type: Number,
    required: [true, 'Product MRP is required'],
    min: [0, 'Product MRP cannot be negative'],
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: 'Product MRP must be greater than 0'
    }
  },
  Product_Flag: {
    type: String,
    required: [true, 'Product flag is required'],
    enum: ['S2s', 'o2s'],
    trim: true
  },
  Product_Category: {
    type: String,
    required: [true, 'Product category is required'],
    trim: true
  },
  Product_Sub_Category: {
    type: String,
    required: [true, 'Product sub category is required'],
    trim: true
  },
  Product_Series: {
    type: String,
    // required: [true, 'Product series is required'],
    // trim: true
  },
  Product_Discount_sale_low: {
    type: Number,
    required: [true, 'Product discount sale low is required'],
    min: [0, 'Discount cannot be negative'],
    max: [99.99, 'Discount cannot exceed 99.99%'],
    default: 0
  },
  Product_discount_sale_high: {
    type: Number,
    required: [true, 'Product discount sale high is required'],
    min: [0, 'Discount cannot be negative'],
    max: [99.99, 'Discount cannot exceed 99.99%'],
    default: 0
  },
  Prod_Purc_scheme: {
    type: Boolean,
    required: [true, 'Purchase scheme flag is required'],
    default: false
  },
  Prod_scheme_discount: {
    type: Number,
    required: [true, 'Product scheme discount is required'],
    min: [0, 'Discount cannot be negative'],
    max: [99.99, 'Discount cannot exceed 99.99%'],
    default: 0
  },
  Product_purc_base_disc: {
    type: Number,
    required: [true, 'Product purchase base discount is required'],
    min: [0, 'Discount cannot be negative'],
    max: [99.99, 'Discount cannot exceed 99.99%'],
    default: 0
  },
  Product_opening_stock: {
    type: Number,
    required: [true, 'Product opening stock is required'],
    min: [0, 'Opening stock cannot be negative'],
    default: 0
  },
  Product_Fresh_Stock: {
    type: Number,
    required: [true, 'Product fresh stock is required'],
    min: [0, 'Fresh stock cannot be negative'],
    default: 0
  },
  Product_Damage_stock: {
    type: Number,
    required: [true, 'Product damage stock is required'],
    min: [0, 'Damage stock cannot be negative'],
    default: 0
  },
  Product_sample_stock: {
    type: Number,
    required: [true, 'Product sample stock is required'],
    min: [0, 'Sample stock cannot be negative'],
    default: 0
  },
  Prod_Showroom_stock: {
    type: Number,
    required: [true, 'Product showroom stock is required'],
    min: [0, 'Showroom stock cannot be negative'],
    default: 0
  },
  Product_Ordered_Quantity: {
    type: Number,
    required: false,
    min: [0, 'Ordered quantity cannot be negative'],
    default: 0
  },
  Product_In_Transit_Quantity: {
    type: Number,
    required: false,
    min: [0, 'In transit quantity cannot be negative'],
    default: 0
  },
  Prod_image: {
    type: String,
    trim: true,
    default: ''
  },
  Product_gst: {
    type: Number,
    required: [true, 'Product GST is required'],
    min: [0, 'GST cannot be negative'],
    max: [99.99, 'GST cannot exceed 99.99%'],
    default: 0
  },
  Product_fragile: {
    type: Boolean,
    required: [true, 'Product fragile flag is required'],
    default: false
  },
  Product_Notes: {
    type: String,
    trim: true,
    default: ''
  },
  Product_mustorder: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return v === 'NA' || (v && v.length > 0);
      },
      message: 'Product must order reference is required (use "NA" if not applicable)'
    },
    default: 'NA'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
productSchema.index({ Prod_ID: 1 });
productSchema.index({ Product_code: 1 });
productSchema.index({ Product_Brand: 1 });
productSchema.index({ Product_Category: 1 });
productSchema.index({ Product_Sub_Category: 1 });
productSchema.index({ Product_Series: 1 });
productSchema.index({ Product_Type: 1 });
productSchema.index({ Product_Color: 1 });

// Indexes for dropdown schemas
productBrandSchema.index({ name: 1 });
productColorSchema.index({ name: 1 });
productCategorySchema.index({ name: 1 });
productSubCategorySchema.index({ name: 1 });
productSubCategorySchema.index({ category: 1 });
productSeriesSchema.index({ name: 1 });

// Pre-save middleware to auto-generate Prod_ID
productSchema.pre('save', async function(next) {
  try {
    // Auto-generate Prod_ID if not provided
    if (!this.Prod_ID) {
      // Find the last Product and extract the number
      const lastProduct = await this.constructor.findOne({ Prod_ID: /^PROD\d{4}$/ }, {}, { sort: { Prod_ID: -1 } });
      let nextNumber = 1;
      if (lastProduct && lastProduct.Prod_ID) {
        const lastNumber = parseInt(lastProduct.Prod_ID.replace('PROD', ''));
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
      this.Prod_ID = `PROD${nextNumber.toString().padStart(4, '0')}`;
    }

    // Check if User exists
    const User = mongoose.model('User');
    const userExists = await User.findById(this.created_by);
    if (!userExists) {
      throw new Error('Referenced User does not exist');
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Static methods for dropdown management
productBrandSchema.statics.getOrCreate = async function(brandName, userId) {
  try {
    let brand = await this.findOne({ name: brandName.trim() });
    if (!brand) {
      brand = await this.create({
        name: brandName.trim(),
        created_by: userId
      });
    }
    return brand;
  } catch (error) {
    throw error;
  }
};

productColorSchema.statics.getOrCreate = async function(colorName, userId) {
  try {
    let color = await this.findOne({ name: colorName.trim() });
    if (!color) {
      color = await this.create({
        name: colorName.trim(),
        created_by: userId
      });
    }
    return color;
  } catch (error) {
    throw error;
  }
};

productCategorySchema.statics.getOrCreate = async function(categoryName, userId) {
  try {
    let category = await this.findOne({ name: categoryName.trim() });
    if (!category) {
      category = await this.create({
        name: categoryName.trim(),
        created_by: userId
      });
    }
    return category;
  } catch (error) {
    throw error;
  }
};

productSubCategorySchema.statics.getOrCreate = async function(subCategoryName, categoryName, userId) {
  try {
    let subCategory = await this.findOne({ 
      name: subCategoryName.trim(),
      category: categoryName.trim()
    });
    if (!subCategory) {
      subCategory = await this.create({
        name: subCategoryName.trim(),
        category: categoryName.trim(),
        created_by: userId
      });
    }
    return subCategory;
  } catch (error) {
    throw error;
  }
};

productSeriesSchema.statics.getOrCreate = async function(seriesName, userId) {
  try {
    let series = await this.findOne({ name: seriesName.trim() });
    if (!series) {
      series = await this.create({
        name: seriesName.trim(),
        created_by: userId
      });
    }
    return series;
  } catch (error) {
    throw error;
  }
};

// Create models
const Product = mongoose.model('Product', productSchema);
const ProductBrand = mongoose.model('ProductBrand', productBrandSchema);
const ProductColor = mongoose.model('ProductColor', productColorSchema);
const ProductCategory = mongoose.model('ProductCategory', productCategorySchema);
const ProductSubCategory = mongoose.model('ProductSubCategory', productSubCategorySchema);
const ProductSeries = mongoose.model('ProductSeries', productSeriesSchema);

export { 
  Product, 
  ProductBrand, 
  ProductColor, 
  ProductCategory, 
  ProductSubCategory, 
  ProductSeries 
};