import mongoose from 'mongoose';

// Brand Schema
const brandSchema = new mongoose.Schema({
  Brand_Code: {
    type: String,
    required: false, // Optional, will be auto-generated
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Allow empty/undefined for auto-generation
        return v === undefined || v === null || v.length === 0 || (typeof v === 'string' && v.length > 0);
      },
      message: 'Brand Code cannot be empty'
    }
  },
  Brand_Name: {
    type: String,
    required: [true, 'Brand Name is required'],
    trim: true,
    unique: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Brand Name cannot be empty'
    }
  },
  Supplier_Name: {
    type: String,
    required: [true, 'Supplier Name is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Supplier Name cannot be empty'
    }
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
brandSchema.index({ Brand_Code: 1 });
brandSchema.index({ Brand_Name: 1 });
brandSchema.index({ Supplier_Name: 1 });
brandSchema.index({ created_by: 1 });

// Virtual to populate User details
brandSchema.virtual('createdByDetails', {
  ref: 'User',
  localField: 'created_by',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
brandSchema.set('toJSON', { virtuals: true });
brandSchema.set('toObject', { virtuals: true });

// Pre-save middleware to auto-generate Brand_Code
brandSchema.pre('save', async function(next) {
  try {
    // Auto-generate Brand_Code if not provided
    if (!this.Brand_Code) {
      // Find the last Brand and extract the number
      const lastBrand = await this.constructor.findOne({ Brand_Code: /^BRD\d{3}$/ }, {}, { sort: { Brand_Code: -1 } });
      let nextNumber = 1;
      if (lastBrand && lastBrand.Brand_Code) {
        const lastNumber = parseInt(lastBrand.Brand_Code.replace('BRD', ''));
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
      this.Brand_Code = `BRD${nextNumber.toString().padStart(3, '0')}`;
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

// Static methods for analytics
brandSchema.statics.getBrandAnalytics = async function() {
  try {
    const analytics = await this.aggregate([
      {
        $facet: {
          totalBrands: [{ $count: "count" }],
          bySupplier: [
            { $group: { _id: '$Supplier_Name', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          recentBrands: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { $project: { Brand_Code: 1, Brand_Name: 1, Supplier_Name: 1, createdAt: 1 } }
          ]
        }
      }
    ]);

    return {
      totalBrands: analytics[0].totalBrands[0]?.count || 0,
      bySupplier: analytics[0].bySupplier,
      recentBrands: analytics[0].recentBrands
    };
  } catch (error) {
    throw error;
  }
};

// Create and export Brand model
const Brand = mongoose.model('Brand', brandSchema);

export { Brand };
