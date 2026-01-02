import mongoose from 'mongoose';

// Channel Partner Schema
const channelPartnerSchema = new mongoose.Schema({
  CP_id: {
    type: String,
    unique: true,
    trim: true,
  },
  CP_Name: {
    type: String,
    required: [true, 'Channel Partner Name is required'],
    trim: true,
  },
  'Mobile Number': {
    type: String,
    required: false,
    validate: {
      validator: function (v) {
        if (!v || v === '') return true; // Allow empty
        return /^\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid 10-digit mobile number!`
    },
  },
  'Email id': {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Please fill a valid email address'],
  },
  Image: {
    type: String,
    required: false,
  },
  CP_Address: {
    type: String,
    required: [true, 'Channel Partner Address is required'],
    trim: true,
  },
  mobileVerified: {
    type: Boolean,
    default: false,
  },
  status: {
    type: Boolean,
    default: true,
    required: true,
  },
}, { timestamps: true });

// Pre-save middleware to auto-generate CP_id
channelPartnerSchema.pre('save', async function (next) {
  if (!this.CP_id) {
    try {
      // Find the last channel partner and extract the number
      const lastPartner = await this.constructor.findOne({}, {}, { sort: { 'CP_id': -1 } });

      let nextNumber = 1;
      if (lastPartner && lastPartner.CP_id) {
        const lastNumber = parseInt(lastPartner.CP_id.replace('CP', ''));
        nextNumber = lastNumber + 1;
      }

      // Generate CP_id with format CP001, CP002, etc.
      this.CP_id = `CP${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Static method to get all CP_id and CP_Name for dropdowns
channelPartnerSchema.statics.getIdNameDropdown = async function () {
  return this.find({}, { CP_id: 1, CP_Name: 1, _id: 0 }).sort({ CP_Name: 1 });
};

// Create model
const ChannelPartner = mongoose.model('ChannelPartner', channelPartnerSchema);

export { ChannelPartner };
