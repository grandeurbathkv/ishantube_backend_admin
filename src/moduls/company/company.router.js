import express from 'express';
import multer from 'multer';
import {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  exportCompaniesToExcel,
  exportCompaniesToPDF,
  importCompaniesFromExcel,
  getCompanyAnalytics,
} from './company.controller.js';
import { protect } from '../../middleware/user.middleware.js';

const router = express.Router();

// Multer configuration for Excel import
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  }
});

/**
 * @swagger
 * tags:
 *   name: Company
 *   description: Company management with comprehensive CRUD operations, Excel/PDF export, and analytics
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Company:
 *       type: object
 *       required:
 *         - Company_Short_Code
 *         - Company_Name
 *         - Company_Address1
 *         - Company_Phone_Number
 *         - Company_Gstno
 *       properties:
 *         _id:
 *           type: string
 *           description: Company ID (auto-generated)
 *           readOnly: true
 *           example: "60d21b4667d0d8992e610c85"
 *         Company_Short_Code:
 *           type: string
 *           description: Company Short Code (4 characters, unique, uppercase)
 *           example: "ISHA"
 *           minLength: 4
 *           maxLength: 4
 *         Company_Name:
 *           type: string
 *           description: Company Name (unique)
 *           example: "Ishan Tubes Private Limited"
 *         Company_Address1:
 *           type: string
 *           description: Company Address Line 1
 *           example: "123 Industrial Area"
 *         Company_Address2:
 *           type: string
 *           description: Company Address Line 2
 *           example: "Sector 5"
 *         Company_Address3:
 *           type: string
 *           description: Company Address Line 3
 *           example: "Near Railway Station"
 *         Company_Phone_Number:
 *           type: string
 *           description: Company Phone Number (10 digits)
 *           example: "9876543210"
 *         Company_Gstno:
 *           type: string
 *           description: Company GST Number (15 characters, unique, uppercase)
 *           example: "29ABCDE1234F1Z5"
 *         Company_Bank:
 *           type: string
 *           description: Bank Name
 *           example: "State Bank of India"
 *         Company_Bank_Branch:
 *           type: string
 *           description: Bank Branch Name
 *           example: "Main Branch"
 *         Company_Bank_Ifsc:
 *           type: string
 *           description: Bank IFSC Code (11 characters, uppercase)
 *           example: "SBIN0001234"
 *         Company_Account_No:
 *           type: string
 *           description: Bank Account Number
 *           example: "1234567890123456"
 *         status:
 *           type: string
 *           enum: [Active, Inactive]
 *           default: Active
 *           description: Company Status
 *         created_by:
 *           type: string
 *           description: User ID who created the company
 *           readOnly: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Company creation timestamp
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Company last update timestamp
 *           readOnly: true
 */

/**
 * @swagger
 * /api/company:
 *   get:
 *     summary: Get all companies with pagination, search, and sorting
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term (searches across code, name, phone, GST, bank)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by (e.g., Company_Name, Company_Short_Code, createdAt)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (asc or desc)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of companies with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Company'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     pages:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', protect, getAllCompanies);

/**
 * @swagger
 * /api/company/analytics:
 *   get:
 *     summary: Get company analytics and statistics
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     active:
 *                       type: integer
 *                       example: 85
 *                     inactive:
 *                       type: integer
 *                       example: 15
 *                     recentlyAdded:
 *                       type: integer
 *                       example: 12
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/analytics', protect, getCompanyAnalytics);

/**
 * @swagger
 * /api/company/export/excel:
 *   get:
 *     summary: Export companies to Excel file
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter companies before export
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive]
 *         description: Filter by status before export
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/export/excel', protect, exportCompaniesToExcel);

/**
 * @swagger
 * /api/company/export/pdf:
 *   get:
 *     summary: Export companies to PDF file
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter companies before export
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive]
 *         description: Filter by status before export
 *     responses:
 *       200:
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/export/pdf', protect, exportCompaniesToPDF);

/**
 * @swagger
 * /api/company/import/excel:
 *   post:
 *     summary: Import companies from Excel file
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file with company data
 *     responses:
 *       200:
 *         description: Import results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Import completed. 50 companies imported successfully, 5 failed."
 *                 results:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: array
 *                       items:
 *                         type: object
 *                     failed:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *       400:
 *         description: Bad request (no file or invalid data)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/import/excel', protect, upload.single('file'), importCompaniesFromExcel);

/**
 * @swagger
 * /api/company/{id}:
 *   get:
 *     summary: Get company by ID
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Company details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       404:
 *         description: Company not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/:id', protect, getCompanyById);

/**
 * @swagger
 * /api/company:
 *   post:
 *     summary: Create a new company
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Company_Short_Code
 *               - Company_Name
 *               - Company_Address1
 *               - Company_Phone_Number
 *               - Company_Gstno
 *             properties:
 *               Company_Short_Code:
 *                 type: string
 *                 example: "ISHA"
 *               Company_Name:
 *                 type: string
 *                 example: "Ishan Tubes Private Limited"
 *               Company_Address1:
 *                 type: string
 *                 example: "123 Industrial Area"
 *               Company_Address2:
 *                 type: string
 *                 example: "Sector 5"
 *               Company_Address3:
 *                 type: string
 *                 example: "Near Railway Station"
 *               Company_Phone_Number:
 *                 type: string
 *                 example: "9876543210"
 *               Company_Gstno:
 *                 type: string
 *                 example: "29ABCDE1234F1Z5"
 *               Company_Bank:
 *                 type: string
 *                 example: "State Bank of India"
 *               Company_Bank_Branch:
 *                 type: string
 *                 example: "Main Branch"
 *               Company_Bank_Ifsc:
 *                 type: string
 *                 example: "SBIN0001234"
 *               Company_Account_No:
 *                 type: string
 *                 example: "1234567890123456"
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *                 default: Active
 *     responses:
 *       201:
 *         description: Company created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Company created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       400:
 *         description: Bad request (validation error or duplicate)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', protect, createCompany);

/**
 * @swagger
 * /api/company/{id}:
 *   put:
 *     summary: Update company by ID
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Company_Short_Code:
 *                 type: string
 *                 example: "ISHA"
 *               Company_Name:
 *                 type: string
 *                 example: "Ishan Tubes Private Limited"
 *               Company_Address1:
 *                 type: string
 *                 example: "123 Industrial Area"
 *               Company_Address2:
 *                 type: string
 *                 example: "Sector 5"
 *               Company_Address3:
 *                 type: string
 *                 example: "Near Railway Station"
 *               Company_Phone_Number:
 *                 type: string
 *                 example: "9876543210"
 *               Company_Gstno:
 *                 type: string
 *                 example: "29ABCDE1234F1Z5"
 *               Company_Bank:
 *                 type: string
 *                 example: "State Bank of India"
 *               Company_Bank_Branch:
 *                 type: string
 *                 example: "Main Branch"
 *               Company_Bank_Ifsc:
 *                 type: string
 *                 example: "SBIN0001234"
 *               Company_Account_No:
 *                 type: string
 *                 example: "1234567890123456"
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *     responses:
 *       200:
 *         description: Company updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Company updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       400:
 *         description: Bad request (validation error or duplicate)
 *       404:
 *         description: Company not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/:id', protect, updateCompany);

/**
 * @swagger
 * /api/company/{id}:
 *   delete:
 *     summary: Delete company by ID
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Company deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Company deleted successfully"
 *       404:
 *         description: Company not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/:id', protect, deleteCompany);

export default router;
