import mongoose from 'mongoose';

// Site City Schema (reusing for site dropdown management)
const siteCitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'City name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'City name must be at least 2 characters long'],
    maxlength: [50, 'City name cannot exceed 50 characters']
  },
  state: {
    type: String,
    required: [true, 'State is required for city'],
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

// Site State Schema (reusing for site dropdown management)
const siteStateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'State name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'State name must be at least 2 characters long'],
    maxlength: [50, 'State name cannot exceed 50 characters']
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Main Site Schema
const siteSchema = new mongoose.Schema({
  Site_id: {
    type: String,
    required: false, // Now optional, will be auto-generated
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Allow empty/undefined for auto-generation
        return v === undefined || v === null || v.length === 0 || (typeof v === 'string' && v.length > 0);
      },
      message: 'Site ID cannot be empty'
    }
  },
  Site_Billing_Name: {
    type: String,
    required: [true, 'Site Billing Name is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Site Billing Name cannot be empty'
    }
  },
  Contact_Person: {
    type: String,
    required: [true, 'Contact Person is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Contact Person cannot be empty'
    }
  },
  Mobile_Number: {
    type: String,
    required: [true, 'Mobile Number is required'],
    validate: {
      validator: function(v) {
        // 10 digit mobile number validation
        return /^[0-9]{10}$/.test(v);
      },
      message: 'Mobile Number must be exactly 10 digits'
    }
  },
  Site_Supervisor_name: {
    type: String,
    trim: true,
    default: ''
  },
  Site_Supervisor_Number: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: function(v) {
        // 10 digit validation only if not empty
        if (!v || v.trim() === '') return true;
        return /^[0-9]{10}$/.test(v);
      },
      message: 'Site Supervisor Number must be exactly 10 digits'
    }
  },
  Other_Numbers: {
    type: String,
    trim: true,
    default: ''
  },
  Email_id: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: function(v) {
        // Email validation only if not empty
        if (!v || v.trim() === '') return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  Site_Address: {
    type: String,
    required: [true, 'Site Address is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Site Address cannot be blank'
    }
  },
  Site_city: {
    type: String,
    required: [true, 'Site City is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Site City cannot be blank'
    }
  },
  Site_State: {
    type: String,
    required: [true, 'Site State is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Site State cannot be blank'
    }
  },
  Site_Gstno: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: function(v) {
        // GST validation only if not empty - 15 characters
        if (!v || v.trim() === '') return true;
        return v.length === 15;
      },
      message: 'GST Number must be exactly 15 characters long'
    }
  },
  Site_party_id: {
    type: String,
    required: [true, 'Site Party ID is required'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Site Party ID cannot be empty'
    }
  },
  Site_User_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: [true, 'Site User ID is required']
  },
  Site_cp_id: {
    type: String,
    required: [true, 'Site Channel Partner ID is required'],
    validate: {
      validator: function(v) {
        // Allow either valid CP_id or "NA"
        return v === 'NA' || (v && v.length > 0);
      },
      message: 'Site Channel Partner ID is required (use "NA" if no CP assigned)'
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
siteSchema.index({ Site_id: 1 });
siteSchema.index({ Site_Billing_Name: 1 });
siteSchema.index({ Mobile_Number: 1 });
siteSchema.index({ Site_city: 1 });
siteSchema.index({ Site_State: 1 });
siteSchema.index({ Site_party_id: 1 });
siteSchema.index({ Site_User_id: 1 });
siteSchema.index({ Site_cp_id: 1 });

// Indexes for dropdown schemas
siteCitySchema.index({ name: 1 });
siteCitySchema.index({ state: 1 });
siteStateSchema.index({ name: 1 });

// Virtual to populate Party details
siteSchema.virtual('partyDetails', {
  ref: 'Party',
  localField: 'Site_party_id',
  foreignField: 'Party_id',
  justOne: true
});

// Virtual to populate Channel Partner details when needed
siteSchema.virtual('channelPartnerDetails', {
  ref: 'ChannelPartner',
  localField: 'Site_cp_id',
  foreignField: 'CP_id',
  justOne: true
});

// Virtual to populate User details
siteSchema.virtual('userDetails', {
  ref: 'User',
  localField: 'Site_User_id',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
siteSchema.set('toJSON', { virtuals: true });
siteSchema.set('toObject', { virtuals: true });

// Pre-save middleware to auto-generate Site_id and validate references
siteSchema.pre('save', async function(next) {
  try {
    // Auto-generate Site_id if not provided
    if (!this.Site_id) {
      // Find the last Site and extract the number
      const lastSite = await this.constructor.findOne({ Site_id: /^SITE\d{3}$/ }, {}, { sort: { Site_id: -1 } });
      let nextNumber = 1;
      if (lastSite && lastSite.Site_id) {
        const lastNumber = parseInt(lastSite.Site_id.replace('SITE', ''));
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
      this.Site_id = `SITE${nextNumber.toString().padStart(3, '0')}`;
    }

    // Check if User exists
    const User = mongoose.model('User');
    const userExists = await User.findById(this.Site_User_id);
    if (!userExists) {
      throw new Error('Referenced User does not exist');
    }

    // Check if Party exists
    const Party = mongoose.model('Party');
    const partyExists = await Party.findOne({ Party_id: this.Site_party_id });
    if (!partyExists) {
      throw new Error('Referenced Party does not exist');
    }

    // Check Channel Partner if not "NA"
    if (this.Site_cp_id !== 'NA') {
      const ChannelPartner = mongoose.model('ChannelPartner');
      const cpExists = await ChannelPartner.findOne({ CP_id: this.Site_cp_id });
      if (!cpExists) {
        throw new Error('Referenced Channel Partner does not exist');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Static methods for dropdown management (reusing city/state logic)
siteCitySchema.statics.getOrCreate = async function(cityName, stateName, userId) {
  try {
    // Check if city already exists
    let city = await this.findOne({ name: cityName.trim() });
    
    if (!city) {
      // Create new city
      city = await this.create({
        name: cityName.trim(),
        state: stateName.trim(),
        created_by: userId
      });
    }
    
    return city;
  } catch (error) {
    throw error;
  }
};

siteStateSchema.statics.getOrCreate = async function(stateName, userId) {
  try {
    // Check if state already exists
    let state = await this.findOne({ name: stateName.trim() });
    
    if (!state) {
      // Create new state
      state = await this.create({
        name: stateName.trim(),
        created_by: userId
      });
    }
    
    return state;
  } catch (error) {
    throw error;
  }
};

// Static method to get sites by party
siteSchema.statics.getSitesByParty = async function(partyId, options = {}) {
  try {
    const { populate = false, limit = 10, skip = 0 } = options;
    
    let query = this.find({ Site_party_id: partyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    if (populate) {
      query = query
        .populate('Site_User_id', 'name email')
        .populate('partyDetails', 'Party_Billing_Name Contact_Person')
        .populate('channelPartnerDetails', 'CP_Name Mobile_Number');
    }

    return await query;
  } catch (error) {
    throw error;
  }
};

// Static method to get site analytics by party
siteSchema.statics.getSiteAnalyticsByParty = async function(partyId) {
  try {
    const analytics = await this.aggregate([
      { $match: { Site_party_id: partyId } },
      {
        $group: {
          _id: null,
          totalSites: { $sum: 1 },
          citiesCount: { $addToSet: '$Site_city' },
          statesCount: { $addToSet: '$Site_State' },
          cpAssigned: {
            $sum: {
              $cond: [{ $ne: ['$Site_cp_id', 'NA'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalSites: 1,
          uniqueCities: { $size: '$citiesCount' },
          uniqueStates: { $size: '$statesCount' },
          cpAssigned: 1,
          cpNotAssigned: { $subtract: ['$totalSites', '$cpAssigned'] }
        }
      }
    ]);

    return analytics[0] || {
      totalSites: 0,
      uniqueCities: 0,
      uniqueStates: 0,
      cpAssigned: 0,
      cpNotAssigned: 0
    };
  } catch (error) {
    throw error;
  }
};

// Create models
const Site = mongoose.model('Site', siteSchema);
const SiteCity = mongoose.model('SiteCity', siteCitySchema);
const SiteState = mongoose.model('SiteState', siteStateSchema);

export { Site, SiteCity, SiteState };
