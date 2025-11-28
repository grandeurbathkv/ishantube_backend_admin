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
  // Set token expiry to 30 days (1 month)
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
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

// @desc    Create test users for chat testing
// @route   POST /api/users/create-test-users
// @access  Protected (Super Admin only)
export const createTestUsers = async (req, res, next) => {
  try {
    const testUsers = [
      {
        'User Name': 'Rahul Sharma',
        'Email id': 'rahul.sharma@gmail.com',
        'Mobile Number': '9876543210',
        Password: 'Test@123',
        Role: 'Admin',
        Image: 'https://i.pravatar.cc/150?img=11',
        status: true
      },
      {
        'User Name': 'Priya Singh',
        'Email id': 'priya.singh@gmail.com',
        'Mobile Number': '9876543211',
        Password: 'Test@123',
        Role: 'Marketing',
        Image: 'https://i.pravatar.cc/150?img=47',
        status: true
      },
      {
        'User Name': 'Amit Kumar',
        'Email id': 'amit.kumar@gmail.com',
        'Mobile Number': '9876543212',
        Password: 'Test@123',
        Role: 'Store Head',
        Image: 'https://i.pravatar.cc/150?img=12',
        status: true
      },
      {
        'User Name': 'Sneha Patel',
        'Email id': 'sneha.patel@gmail.com',
        'Mobile Number': '9876543213',
        Password: 'Test@123',
        Role: 'Dispatch head',
        Image: 'https://i.pravatar.cc/150?img=48',
        status: true
      },
      {
        'User Name': 'Vikram Reddy',
        'Email id': 'vikram.reddy@gmail.com',
        'Mobile Number': '9876543214',
        Password: 'Test@123',
        Role: 'Transport Manager',
        Image: 'https://i.pravatar.cc/150?img=13',
        status: true
      },
      {
        'User Name': 'Anjali Gupta',
        'Email id': 'anjali.gupta@gmail.com',
        'Mobile Number': '9876543215',
        Password: 'Test@123',
        Role: 'Accountant',
        Image: 'https://i.pravatar.cc/150?img=49',
        status: true
      },
      {
        'User Name': 'Rajesh Verma',
        'Email id': 'rajesh.verma@gmail.com',
        'Mobile Number': '9876543216',
        Password: 'Test@123',
        Role: 'Document Manager',
        Image: 'https://i.pravatar.cc/150?img=14',
        status: true
      },
      {
        'User Name': 'Neha Desai',
        'Email id': 'neha.desai@gmail.com',
        'Mobile Number': '9876543217',
        Password: 'Test@123',
        Role: 'Guest',
        Image: 'https://i.pravatar.cc/150?img=50',
        status: true
      }
    ];

    const createdUsers = [];
    const skippedUsers = [];

    for (const userData of testUsers) {
      const existingUser = await User.findOne({ 'Email id': userData['Email id'] });
      
      if (existingUser) {
        skippedUsers.push(userData['Email id']);
        continue;
      }

      const user = await User.create(userData);
      createdUsers.push({
        name: user['User Name'],
        email: user['Email id'],
        role: user.Role
      });
    }

    const totalUsers = await User.countDocuments({});

    res.status(201).json({
      success: true,
      message: 'Test users creation completed',
      data: {
        created: createdUsers,
        skipped: skippedUsers,
        totalUsersInDB: totalUsers
      }
    });
  } catch (error) {
    next(error);
  }
};