import mongoose from 'mongoose';

// Party City Schema (for dropdown management)
const partyCitySchema = new mongoose.Schema({
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

// Party State Schema (for dropdown management)
const partyStateSchema = new mongoose.Schema({
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

// Main Party Schema
const partySchema = new mongoose.Schema({
  Party_id: {
    type: String,
    required: false, // Now optional, will be auto-generated
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Allow empty/undefined for auto-generation
        return v === undefined || v === null || v.length === 0 || (typeof v === 'string' && v.length > 0);
      },
      message: 'Party ID cannot be empty'
    }
  },
  Party_Billing_Name: {
    type: String,
    required: [true, 'Party Billing Name is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Party Billing Name cannot be empty'
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
  Party_Address: {
    type: String,
    required: [true, 'Party Address is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Party Address cannot be blank'
    }
  },
  Party_city: {
    type: String,
    required: [true, 'Party City is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Party City cannot be blank'
    }
  },
  Party_State: {
    type: String,
    required: [true, 'Party State is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Party State cannot be blank'
    }
  },
  Party_Gstno: {
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
  Party_default_User_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Party Default User ID is required']
  },
  Party_default_cp_id: {
    type: String,
    required: [true, 'Party Default Channel Partner ID is required'],
    validate: {
      validator: function(v) {
        // Allow either valid CP_id or "NA"
        return v === 'NA' || (v && v.length > 0);
      },
      message: 'Party Default Channel Partner ID is required (use "NA" if no CP assigned)'
    }
  },
  Party_default_Arch_id: {
    type: String,
    required: [true, 'Party Default Architect ID is required'],
    validate: {
      validator: function(v) {
        // Allow either valid Arch_id or "NA"
        return v === 'NA' || (v && v.length > 0);
      },
      message: 'Party Default Architect ID is required (use "NA" if no Architect assigned)'
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
partySchema.index({ Party_id: 1 });
partySchema.index({ Party_Billing_Name: 1 });
partySchema.index({ Mobile_Number: 1 });
partySchema.index({ Party_city: 1 });
partySchema.index({ Party_State: 1 });
partySchema.index({ Party_default_User_id: 1 });
partySchema.index({ Party_default_cp_id: 1 });
partySchema.index({ Party_default_Arch_id: 1 });

// Indexes for dropdown schemas
partyCitySchema.index({ name: 1 });
partyCitySchema.index({ state: 1 });
partyStateSchema.index({ name: 1 });

// Virtual to populate Channel Partner details when needed
partySchema.virtual('channelPartnerDetails', {
  ref: 'ChannelPartner',
  localField: 'Party_default_cp_id',
  foreignField: 'CP_id',
  justOne: true
});

// Virtual to populate Architect details when needed
partySchema.virtual('architectDetails', {
  ref: 'Architect',
  localField: 'Party_default_Arch_id',
  foreignField: 'Arch_id',
  justOne: true
});

// Virtual to populate User details
partySchema.virtual('userDetails', {
  ref: 'User',
  localField: 'Party_default_User_id',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
partySchema.set('toJSON', { virtuals: true });
partySchema.set('toObject', { virtuals: true });

// Pre-save middleware to auto-generate Party_id and validate references
partySchema.pre('save', async function(next) {
  try {
    // Auto-generate Party_id if not provided
    if (!this.Party_id) {
      // Find the last Party and extract the number
      const lastParty = await this.constructor.findOne({ Party_id: /^PTY\d{3}$/ }, {}, { sort: { Party_id: -1 } });
      let nextNumber = 1;
      if (lastParty && lastParty.Party_id) {
        const lastNumber = parseInt(lastParty.Party_id.replace('PTY', ''));
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
      this.Party_id = `PTY${nextNumber.toString().padStart(3, '0')}`;
    }

    // Check if User exists
    const User = mongoose.model('User');
    const userExists = await User.findById(this.Party_default_User_id);
    if (!userExists) {
      throw new Error('Referenced User does not exist');
    }

    // Check Channel Partner if not "NA"
    if (this.Party_default_cp_id !== 'NA') {
      const ChannelPartner = mongoose.model('ChannelPartner');
      const cpExists = await ChannelPartner.findOne({ CP_id: this.Party_default_cp_id });
      if (!cpExists) {
        throw new Error('Referenced Channel Partner does not exist');
      }
    }

    // Check Architect if not "NA"
    if (this.Party_default_Arch_id !== 'NA') {
      const Architect = mongoose.model('Architect');
      const archExists = await Architect.findOne({ Arch_id: this.Party_default_Arch_id });
      if (!archExists) {
        throw new Error('Referenced Architect does not exist');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Static methods for dropdown management
partyCitySchema.statics.getOrCreate = async function(cityName, stateName, userId) {
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

partyStateSchema.statics.getOrCreate = async function(stateName, userId) {
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

// Create models
const Party = mongoose.model('Party', partySchema);
const PartyCity = mongoose.model('PartyCity', partyCitySchema);
const PartyState = mongoose.model('PartyState', partyStateSchema);

export { Party, PartyCity, PartyState };
