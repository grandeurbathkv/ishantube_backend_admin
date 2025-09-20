import mongoose from 'mongoose';

// Channel Partner Incentive Schema
const channelPartnerIncentiveSchema = new mongoose.Schema({
  CP_id: {
    type: String,
    required: [true, 'Channel Partner ID is required'],
    ref: 'ChannelPartner',
  },
  Brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
  },
  Incentive_type: {
    type: String,
    required: [true, 'Incentive type is required'],
    enum: {
      values: ['Percentage', 'Amount'],
      message: 'Incentive type must be either Percentage or Fixed Amount'
    },
  },
  Incentive_factor: {
    type: Number,
    required: [true, 'Incentive factor is required'],
    validate: {
      validator: function(v) {
        // If Incentive_type is Percentage, value should be between 0.00 to 99.99
        if (this.Incentive_type === 'Percentage') {
          return v >= 0.00 && v <= 99.99;
        }
        // If Incentive_type is Amount, value should be >= 0.00
        if (this.Incentive_type === 'Amount') {
          return v >= 0.00;
        }
        return false;
      },
      message: function(props) {
        if (this.Incentive_type === 'Percentage') {
          return `${props.value} is not valid! Percentage should be between 0.00 to 99.99`;
        }
        return `${props.value} is not valid! Amount should be 0.00 or greater`;
      }
    },
  },
}, { timestamps: true });

// Create compound index for unique combination of CP_id and Brand
channelPartnerIncentiveSchema.index({ CP_id: 1, Brand: 1 }, { unique: true });

// Create model
const ChannelPartnerIncentive = mongoose.model('ChannelPartnerIncentive', channelPartnerIncentiveSchema);

export { ChannelPartnerIncentive };