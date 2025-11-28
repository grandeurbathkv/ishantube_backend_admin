import jwt from 'jsonwebtoken';
import User from '../moduls/users/user.model.js';

// Middleware to protect routes with JWT token
export const protect = async (req, res, next) => {
  console.log('🔐 Auth Middleware - Step 1: Checking authorization');
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('🔐 Auth Middleware - Step 2: Token found:', token.substring(0, 20) + '...');

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔐 Auth Middleware - Step 3: Token decoded:', decoded);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-Password');
      console.log('🔐 Auth Middleware - Step 4: User found:', req.user ? req.user._id : 'NOT FOUND');

      if (!req.user) {
        console.log('🔐 Auth Middleware - Step 5: User not found in database');
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      console.log('🔐 Auth Middleware - Step 6: Authentication successful');
      next();
    } catch (error) {
      console.error('🔐 Auth Middleware - ERROR:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    console.log('🔐 Auth Middleware - ERROR: No token provided');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to check if the user is a Super Admin
export const superAdminAuth = (req, res, next) => {
  if (req.user && req.user.isSuperAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a Super Admin' });
  }
};

// Alias for authenticateToken (same as protect middleware)
export const authenticateToken = protect;