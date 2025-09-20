import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directories if they don't exist
const channelPartnersDir = 'uploads/channel-partners';
const usersDir = 'uploads/users';

if (!fs.existsSync(channelPartnersDir)) {
  fs.mkdirSync(channelPartnersDir, { recursive: true });
}

if (!fs.existsSync(usersDir)) {
  fs.mkdirSync(usersDir, { recursive: true });
}

// Configure storage for Channel Partners
const channelPartnerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, channelPartnersDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `cp-${uniqueSuffix}${extension}`);
  }
});

// Configure storage for Users
const userStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, usersDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `user-${uniqueSuffix}${extension}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'Image') {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for Image field'), false);
    }
  } else {
    cb(new Error('Unexpected field'), false);
  }
};

// Configure multer for Channel Partners
const channelPartnerUpload = multer({
  storage: channelPartnerStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  }
});

// Configure multer for Users
const userUpload = multer({
  storage: userStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  }
});

// Middleware for single image upload - Channel Partner
export const uploadChannelPartnerImage = channelPartnerUpload.single('Image');

// Middleware for single image upload - User
export const uploadUserImage = userUpload.single('Image');

// Error handling middleware for multer
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 2MB.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field. Only Image field is allowed.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`
    });
  }
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next();
};

// Middleware to process uploaded file
export const processUploadedFile = (req, res, next) => {
  if (req.file) {
    // Create full URL for the uploaded file
    const protocol = req.protocol;
    const host = req.get('host');
    const filePath = req.file.path.replace(/\\/g, '/'); // Convert Windows backslashes to forward slashes
    const fileUrl = `${protocol}://${host}/${filePath}`;
    
    // Add both file path and full URL to req.body
    req.body.Image = fileUrl;
    req.body.imagePath = req.file.path; // Keep original path for database storage if needed
  }
  next();
};