// @desc    Get all User _id and User Name for dropdown
// @route   GET /api/user/dropdown
// @access  Protected
export const getUserDropdown = async (req, res, next) => {
  try {
    const dropdown = await User.getIdNameDropdown();
    return res.status(200).json({
      message: 'User dropdown data',
      data: dropdown,
    });
  } catch (error) {
    next(error);
  }
};
import User from './user.model.js';
import jwt from 'jsonwebtoken';

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Protected (Super Admin only)
export const registerUser = async (req, res, next) => {
  const { User_id, Password, 'Mobile Number': mobileNumber, 'Email id': email, Image, 'User Name': userName, Role } = req.body;

  try {
    const userExists = await User.findOne({ 'Email id': email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = await User.create({
      User_id,
      Password,
      'Mobile Number': mobileNumber,
      'Email id': email,
      Image,
      'User Name': userName,
      Role,
    });

    if (user) {
      // Create a user object without the password field
      const userResponse = {
        User_id: user.User_id,
        'Mobile Number': user['Mobile Number'],
        'Email id': user['Email id'],
        'User Name': user['User Name'],
        Role: user.Role,
        Image: user.Image,
        isSuperAdmin: user.isSuperAdmin,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.status(201).json({
        message: 'User registered successfully',
        token: generateToken(user._id),
        user: userResponse,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req, res, next) => {
  const { 'Email id': email, Password } = req.body;

  try {
    const user = await User.findOne({ 'Email id': email });
    if (user && (await user.matchPassword(Password))) {
      // Create a user object without the password field
      const userResponse = {
        User_id: user.User_id,
        'Mobile Number': user['Mobile Number'],
        'Email id': user['Email id'],
        'User Name': user['User Name'],
        Role: user.Role,
        Image: user.Image,
        isSuperAdmin: user.isSuperAdmin,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.json({
        message: 'Login successful',
        token: generateToken(user._id),
        user: userResponse,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/users/logout
// @access  Protected
export const logoutUser = async (req, res, next) => {
  try {
    // In a stateless JWT implementation, logout is typically handled on the client side
    // by removing the token. However, we can provide a response to confirm logout.
    
    res.json({
      message: 'Logout successful',
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Protected
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-Password');
    
    if (user) {
      const userResponse = {
        User_id: user.User_id,
        'Mobile Number': user['Mobile Number'],
        'Email id': user['Email id'],
        'User Name': user['User Name'],
        Role: user.Role,
        Image: user.Image,
        isSuperAdmin: user.isSuperAdmin,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.json({
        message: 'User profile retrieved successfully',
        user: userResponse,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};