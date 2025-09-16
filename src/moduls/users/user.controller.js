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