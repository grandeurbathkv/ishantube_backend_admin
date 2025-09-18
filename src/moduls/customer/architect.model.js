import mongoose from 'mongoose';

// Architect Type Schema (for dropdown)
const archTypeSchema = new mongoose.Schema({
  type_name: {
    type: String,
    required: [true, 'Architect type name is required'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

// City Schema (for dropdown)
const citySchema = new mongoose.Schema({
  city_name: {
    type: String,
    required: [true, 'City name is required'],
    unique: true,
    trim: true,
  },
  state_code: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

// State Schema (for dropdown)
const stateSchema = new mongoose.Schema({
  state_name: {
    type: String,
    required: [true, 'State name is required'],
    unique: true,
    trim: true,
  },
  state_code: {
    type: String,
    trim: true,
    unique: true,
  },
}, { timestamps: true });

// Architect Schema
const architectSchema = new mongoose.Schema({
  Arch_id: {
    type: String,
    required: [true, 'Architect ID is required'],
    unique: true,
    trim: true,
  },
  Arch_Name: {
    type: String,
    required: [true, 'Architect Name is required'],
    trim: true,
  },
  'Mobile Number': {
    type: String,
    required: [true, 'Mobile number is required'],
    validate: {
      validator: function(v) {
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
  Arch_type: {
    type: String,
    required: [true, 'Architect type is required'],
    trim: true,
  },
  Arch_category: {
    type: String,
    required: [true, 'Architect category is required'],
    enum: {
      values: ['A', 'B', 'C', 'D'],
      message: 'Architect category must be A, B, C, or D'
    },
  },
  Image: {
    type: String,
    required: false,
  },
  Arch_Address: {
    type: String,
    required: [true, 'Architect Address is required'],
    trim: true,
  },
  Arch_city: {
    type: String,
    required: [true, 'Architect city is required'],
    trim: true,
  },
  Arch_state: {
    type: String,
    required: [true, 'Architect state is required'],
    trim: true,
  },
}, { timestamps: true });

// Create indexes for better performance
architectSchema.index({ Arch_city: 1 });
architectSchema.index({ Arch_state: 1 });
architectSchema.index({ Arch_type: 1 });
citySchema.index({ city_name: 1 });
stateSchema.index({ state_name: 1 });
archTypeSchema.index({ type_name: 1 });

// Create models
const Architect = mongoose.model('Architect', architectSchema);
const ArchType = mongoose.model('ArchType', archTypeSchema);
const City = mongoose.model('City', citySchema);
const State = mongoose.model('State', stateSchema);

export { Architect, ArchType, City, State };
