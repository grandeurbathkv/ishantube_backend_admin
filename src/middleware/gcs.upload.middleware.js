import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucketName = process.env.GCS_BUCKET_NAME || 'ishantube-images-2025';
const bucket = storage.bucket(bucketName);

// File filter for images only
const imageFileFilter = (req, file, cb) => {
  if (file.fieldname === 'Image' || file.fieldname === 'Prod_image') {
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

// File filter for Excel files only
const excelFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel' // .xls
  ];
  
  const allowedExtensions = ['.xlsx', '.xls'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
  }
};

// Configure multer to use memory storage (files will be stored in buffer)
const multerMemoryStorage = multer.memoryStorage();

// Multer configuration for images
const imageUpload = multer({
  storage: multerMemoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  }
});

// Multer configuration for Excel files
const excelUpload = multer({
  storage: multerMemoryStorage,
  fileFilter: excelFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for Excel files
  }
});

// Function to upload file to Google Cloud Storage
const uploadToGCS = async (file, folder = 'general') => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided'));
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `${folder}/${folder}-${uniqueSuffix}${extension}`;

    // Create a new blob in the bucket
    const blob = bucket.file(filename);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
      },
    });

    blobStream.on('error', (err) => {
      reject(err);
    });

    blobStream.on('finish', async () => {
      // Get the public URL (works with Uniform Bucket-Level Access)
      // If bucket is public, files are automatically accessible
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
      
      resolve({
        filename: filename,
        url: publicUrl,
        mimetype: file.mimetype,
        size: file.size
      });
    });

    blobStream.end(file.buffer);
  });
};

// Middleware for Architect Image Upload
export const uploadArchitectImage = [
  imageUpload.single('Image'),
  async (req, res, next) => {
    try {
      if (req.file) {
        const uploadResult = await uploadToGCS(req.file, 'architects');
        req.body.Image = uploadResult.url;
        req.body.imagePath = uploadResult.filename;
        req.uploadedFile = uploadResult;
      }
      next();
    } catch (error) {
      next(error);
    }
  }
];

// Middleware for Channel Partner Image Upload
export const uploadChannelPartnerImage = [
  imageUpload.single('Image'),
  async (req, res, next) => {
    try {
      if (req.file) {
        const uploadResult = await uploadToGCS(req.file, 'channel-partners');
        req.body.Image = uploadResult.url;
        req.body.imagePath = uploadResult.filename;
        req.uploadedFile = uploadResult;
      }
      next();
    } catch (error) {
      next(error);
    }
  }
];

// Middleware for User Image Upload
export const uploadUserImage = [
  imageUpload.single('Image'),
  async (req, res, next) => {
    try {
      if (req.file) {
        const uploadResult = await uploadToGCS(req.file, 'users');
        req.body.Image = uploadResult.url;
        req.body.imagePath = uploadResult.filename;
        req.uploadedFile = uploadResult;
      }
      next();
    } catch (error) {
      next(error);
    }
  }
];

// Middleware for Incentive Image Upload
export const uploadIncentiveImage = [
  imageUpload.single('Image'),
  async (req, res, next) => {
    try {
      if (req.file) {
        const uploadResult = await uploadToGCS(req.file, 'incentives');
        req.body.Image = uploadResult.url;
        req.body.imagePath = uploadResult.filename;
        req.uploadedFile = uploadResult;
      }
      next();
    } catch (error) {
      next(error);
    }
  }
];

// Middleware for Product Image Upload
export const uploadProductImage = [
  imageUpload.single('Prod_image'),
  async (req, res, next) => {
    try {
      if (req.file) {
        const uploadResult = await uploadToGCS(req.file, 'products');
        req.body.Prod_image = uploadResult.url;
        req.body.imagePath = uploadResult.filename;
        req.uploadedFile = uploadResult;
      }
      next();
    } catch (error) {
      next(error);
    }
  }
];

// Middleware for Excel File Upload
export const uploadExcelFile = [
  excelUpload.single('file'),
  async (req, res, next) => {
    try {
      if (req.file) {
        const uploadResult = await uploadToGCS(req.file, 'excel');
        req.body.filePath = uploadResult.url;
        req.body.fileName = uploadResult.filename;
        req.uploadedFile = uploadResult;
      }
      next();
    } catch (error) {
      next(error);
    }
  }
];

// Error handling middleware for uploads
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB for images and 10MB for Excel files.'
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
      message: error.message || 'File upload failed'
    });
  }
  
  next();
};

// Middleware to process uploaded file (for backward compatibility)
export const processUploadedFile = (req, res, next) => {
  // This middleware is now optional as the upload middleware already processes the file
  // Keeping it for backward compatibility
  next();
};

// Function to delete file from GCS
export const deleteFileFromGCS = async (filename) => {
  try {
    await bucket.file(filename).delete();
    console.log(`File ${filename} deleted from GCS`);
    return true;
  } catch (error) {
    console.error(`Error deleting file ${filename}:`, error);
    return false;
  }
};

// Export the uploadToGCS function for direct use if needed
export { uploadToGCS };
