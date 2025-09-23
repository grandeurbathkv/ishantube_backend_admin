import mongoose from 'mongoose';

// Channel Partner Incentive Schema
const channelPartnerIncentiveSchema = new mongoose.Schema({
  CP_id: {
    type: String,
    required: [true, 'Channel Partner ID is required'],
    ref: 'ChannelPartner',
    validate: {
      validator: async function(v) {
        // Check if the Channel Partner exists
        const ChannelPartner = mongoose.model('ChannelPartner');
        const partner = await ChannelPartner.findOne({ CP_id: v });
        return !!partner;
      },
      message: 'Referenced Channel Partner does not exist'
    }
  },
  Brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
  },
  Image: {
    type: String,
    required: false,
    description: 'Brand/Incentive related image'
  },
  Incentive_type: {
    type: String,
    required: [true, 'Incentive type is required'],
    enum: {
      values: ['Percentage', 'Amount'],
      message: 'Incentive type must be either Percentage or Amount'
    },
  },
  Incentive_factor: {
    type: Number,
    required: [true, 'Incentive factor is required'],
    validate: {
      validator: function(v) {
        // For update validators, 'this' may not have Incentive_type, so get it from the update object or from the document
        let incentiveType;
        if (this && this.Incentive_type) {
          incentiveType = this.Incentive_type;
        } else if (this && this.getUpdate) {
          // For update validators, get the value from the update object
          const update = this.getUpdate();
          incentiveType = update.Incentive_type || (update.$set && update.$set.Incentive_type);
        }
        if (incentiveType === 'Percentage') {
          return v >= 0.00 && v <= 99.99;
        }
        if (incentiveType === 'Amount') {
          return v >= 0.00;
        }
        // If incentiveType is not available, allow the value (or you can choose to reject)
        return true;
      },
      message: 'Incentive factor is not valid! Percentage should be between 0.00 to 99.99, Amount should be 0.00 or greater'
    },
  },
  status: {
    type: Boolean,
    default: true,
    required: true,
  },
}, { timestamps: true });

// Create compound index for unique combination of CP_id and Brand
channelPartnerIncentiveSchema.index({ CP_id: 1, Brand: 1 }, { unique: true });

// Virtual to populate Channel Partner details
channelPartnerIncentiveSchema.virtual('channelPartner', {
  ref: 'ChannelPartner',
  localField: 'CP_id',
  foreignField: 'CP_id',
  justOne: true
});

// Ensure virtual fields are serialized
channelPartnerIncentiveSchema.set('toJSON', { virtuals: true });

// Create model
const ChannelPartnerIncentive = mongoose.model('ChannelPartnerIncentive', channelPartnerIncentiveSchema);

export { ChannelPartnerIncentive };