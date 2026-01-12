import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';

// Only load .env in development
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

// ===== DEBUG LOGGING - Check Environment Variables =====
console.log('========== AWS S3 CONFIGURATION DEBUG ==========');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME || 'NOT SET');
console.log('AWS_REGION:', process.env.AWS_REGION || 'NOT SET');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 10)}...` : 'NOT SET');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? `${process.env.AWS_SECRET_ACCESS_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('AWS_SECRET_ACCESS_KEY Length:', process.env.AWS_SECRET_ACCESS_KEY ? process.env.AWS_SECRET_ACCESS_KEY.length : 0);
console.log('==========================================');

// Initialize AWS S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

console.log('✅ S3 Client initialized successfully');

const bucketName = process.env.AWS_S3_BUCKET_NAME || 'ishantube-images';

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

// Function to upload file to AWS S3
const uploadToS3 = async (file, folder = 'general') => {
    return new Promise(async (resolve, reject) => {
        if (!file) {
            return reject(new Error('No file provided'));
        }

        try {
            // Generate unique filename
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const extension = path.extname(file.originalname);
            const filename = `${folder}/${folder}-${uniqueSuffix}${extension}`;

            console.log('🔄 Uploading to S3...');
            console.log('📦 Bucket:', bucketName);
            console.log('🌍 Region:', process.env.AWS_REGION);
            console.log('📁 File:', filename);
            console.log('📝 Content-Type:', file.mimetype);

            // Upload to S3
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: filename,
                Body: file.buffer,
                ContentType: file.mimetype,
            });

            await s3Client.send(command);

            // Get the public URL
            const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${filename}`;

            console.log('✅ Upload successful!');
            console.log('🔗 Public URL:', publicUrl);

            resolve({
                filename: filename,
                url: publicUrl,
                mimetype: file.mimetype,
                size: file.size
            });
        } catch (error) {
            console.error('❌ S3 Upload Error:', error.message);
            console.error('📋 Error Details:', {
                code: error.Code || error.code,
                message: error.message,
                bucket: bucketName,
                region: process.env.AWS_REGION
            });
            reject(error);
        }
    });
};

// Middleware for Architect Image Upload
export const uploadArchitectImage = [
    imageUpload.single('Image'),
    async (req, res, next) => {
        try {
            if (req.file) {
                const uploadResult = await uploadToS3(req.file, 'architects');
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
                const uploadResult = await uploadToS3(req.file, 'channel-partners');
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
                const uploadResult = await uploadToS3(req.file, 'users');
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
                const uploadResult = await uploadToS3(req.file, 'incentives');
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
                const uploadResult = await uploadToS3(req.file, 'products');
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
                const uploadResult = await uploadToS3(req.file, 'excel');
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

// Function to delete file from S3
export const deleteFileFromS3 = async (filename) => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: filename,
        });
        await s3Client.send(command);
        console.log(`File ${filename} deleted from S3`);
        return true;
    } catch (error) {
        console.error(`Error deleting file ${filename}:`, error);
        return false;
    }
};

// Export the uploadToS3 function for direct use if needed
export { uploadToS3 };

// Middleware for Chat Attachment Upload (generic files/images)
export const uploadChatAttachment = [
    multer({
        storage: multerMemoryStorage,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB limit
        }
    }).single('attachment'),
    async (req, res, next) => {
        try {
            if (req.file) {
                const uploadResult = await uploadToS3(req.file, 'chat-attachments');
                req.body.attachment = uploadResult.url;
                req.body.attachmentPath = uploadResult.filename;
                req.uploadedFile = uploadResult;
            }
            next();
        } catch (error) {
            next(error);
        }
    }
];
