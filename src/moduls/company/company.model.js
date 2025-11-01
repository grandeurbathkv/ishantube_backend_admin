import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  Company_Short_Code: {
    type: String,
    required: [true, 'Company Short Code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [4, 'Company Short Code must be exactly 4 characters'],
    maxlength: [4, 'Company Short Code must be exactly 4 characters'],
  },
  Company_Name: {
    type: String,
    required: [true, 'Company Name is required'],
    unique: true,
    trim: true,
  },
  Company_Address1: {
    type: String,
    required: [true, 'Company Address Line 1 is required'],
    trim: true,
  },
  Company_Address2: {
    type: String,
    trim: true,
    default: '',
  },
  Company_Address3: {
    type: String,
    trim: true,
    default: '',
  },
  Company_Phone_Number: {
    type: String,
    required: [true, 'Company Phone Number is required'],
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid 10-digit phone number!`
    },
  },
  Company_Gstno: {
    type: String,
    required: [true, 'Company GST Number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: props => `${props.value} is not a valid GST number!`
    },
  },
  Company_Bank: {
    type: String,
    trim: true,
    default: '',
  },
  Company_Bank_Branch: {
    type: String,
    trim: true,
    default: '',
  },
  Company_Bank_Ifsc: {
    type: String,
    trim: true,
    uppercase: true,
    default: '',
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty
        return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
      },
      message: props => `${props.value} is not a valid IFSC code!`
    },
  },
  Company_Account_No: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
});

// Indexes for faster queries
companySchema.index({ Company_Short_Code: 1 });
companySchema.index({ Company_Name: 1 });
companySchema.index({ Company_Gstno: 1 });
companySchema.index({ status: 1 });
companySchema.index({ created_by: 1 });
companySchema.index({ createdAt: -1 });

const Company = mongoose.model('Company', companySchema);

export default Company;
