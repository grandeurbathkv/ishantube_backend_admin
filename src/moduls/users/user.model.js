import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  User_id: {
    type: String,
    required: [true, 'User ID is required'],
    unique: true,
    trim: true,
  },
  Password: {
    type: String,
    required: [true, 'Password is required'],
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
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Please fill a valid email address'],
  },
  Image: {
    type: String,
    required: false,
  },
  'User Name': {
    type: String,
    required: [true, 'User Name is required'],
    trim: true,
  },
  Role: {
    type: String,
    required: [true, 'Role is required'],
    enum: [
      'Super Admin',
      'Admin',
      'Marketing',
      'Dispatch head',
      'Store Head',
      'Transport Manager',
      'Accountant',
      'Document Manager',
      'Guest',
    ],
  },
  isSuperAdmin: {
    type: Boolean,
    required: true,
    default: false,
  },
  status: {
    type: Boolean,
    default: true,
    required: true,
  },
}, { timestamps: true });

// Hash password and set isSuperAdmin before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (this.isModified('Password')) {
    const salt = await bcrypt.genSalt(10);
    this.Password = await bcrypt.hash(this.Password, salt);
  }
  
  // Set isSuperAdmin based on the Role. This ensures it's updated if the role changes.
  this.isSuperAdmin = this.Role === 'Super Admin';
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.Password);
};
const User = mongoose.model('User', userSchema);
export default User;