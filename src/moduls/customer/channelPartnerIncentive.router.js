
import express from 'express';
import {
  manageIncentives,
  getIncentivesByPartnerId,
  deleteIncentivesByPartnerId,
  createChannelPartnerWithIncentive,
  changeIncentiveStatus,
  uploadIncentivesFromExcel,
  generateIncentivesPDF
} from './channelPartnerIncentive.controller.js';
import { protect } from '../../middleware/user.middleware.js';
import { 
  uploadIncentiveImage, 
  handleUploadError, 
  processUploadedFile,
  uploadExcelFile
} from '../../middleware/gcs.upload.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Channel Partner Incentives
 *   description: Channel Partner Incentive management and operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ChannelPartnerIncentive:
 *       type: object
 *       required:
 *         - CP_id
 *         - Brand
 *         - Incentive_type
 *         - Incentive_factor
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *           example: "507f1f77bcf86cd799439011"
 *         CP_id:
 *           type: string
 *           description: Channel Partner Unique ID (Reference)
 *           example: "CP001"
 *         Brand:
 *           type: string
 *           description: Brand Name
 *           example: "Samsung"
 *         Image:
 *           type: string
 *           description: Brand/Incentive related image URL
 *           example: "http://localhost:5000/uploads/incentives/incentive-1234567890.jpg"
 *         Incentive_type:
 *           type: string
 *           enum: [Percentage, Amount]
 *           description: Incentive Type - Percentage or Amount (Fixed Amount from frontend is converted to Amount)
 *           example: "Percentage"
 *         Incentive_factor:
 *           type: number
 *           description: Incentive Factor (0.00-99.99 for Percentage, >=0.00 for Amount)
 *           example: 5.50
 *         status:
 *           type: boolean
 *           description: Incentive status (active/inactive)
 *           example: true
 *           default: true
 *         channelPartner:
 *           $ref: '#/components/schemas/ChannelPartner'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     ChannelPartner:
 *       type: object
 *       required:
 *         - CP_Name
 *         - Mobile Number
 *         - CP_Address
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *         CP_id:
 *           type: string
 *           description: Auto-generated Channel Partner Unique ID
 *           example: "CP001"
 *         CP_Name:
 *           type: string
 *           description: Channel Partner Name
 *           example: "ABC Electronics"
 *         Mobile Number:
 *           type: string
 *           pattern: '^[0-9]{10}$'
 *           description: 10-digit mobile number
 *           example: "9876543210"
 *         Email id:
 *           type: string
 *           format: email
 *           description: Email address (optional)
 *           example: "contact@abcelectronics.com"
 *         CP_Address:
 *           type: string
 *           description: Channel Partner Address
 *           example: "123 Business Street, City, State - 123456"
 *         Image:
 *           type: string
 *           description: Channel Partner Image URL
 *           example: "http://localhost:5000/uploads/channelpartners/cp-1234567890.jpg"
 *         status:
 *           type: boolean
 *           description: Channel Partner status (active/inactive)
 *           example: true
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * @swagger
 * /api/incentives/create-with-partner:
 *   post:
 *     summary: Create Channel Partner with Incentive (Combined Form)
 *     tags: [Channel Partner Incentives]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - cp_name
 *               - mobile
 *               - cp_address
 *               - brand
 *               - incentive_type
 *               - incentive_factor
 *             properties:
 *               cp_name:
 *                 type: string
 *                 description: Channel Partner Name
 *                 example: "ABC Electronics"
 *               mobile:
 *                 type: string
 *                 pattern: '^[0-9]{10}$'
 *                 description: 10-digit mobile number (WhatsApp)
 *                 example: "9876543210"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email ID (optional)
 *                 example: "contact@abcelectronics.com"
 *               cp_address:
 *                 type: string
 *                 description: Channel Partner Address
 *                 example: "123 Business Street, City, State - 123456"
 *               Image:
 *                 type: string
 *                 format: binary
 *                 description: Channel Partner/Brand image (JPEG, PNG, max 2MB)
 *               brand:
 *                 type: string
 *                 description: Brand Name
 *                 example: "Samsung"
 *               incentive_type:
 *                 type: string
 *                 enum: [Percentage, "Fixed Amount"]
 *                 description: Incentive Type
 *                 example: "Percentage"
 *               incentive_factor:
 *                 type: number
 *                 description: Incentive Factor (0.00-99.99 for Percentage, >=0.00 for Fixed Amount)
 *                 example: 5.50
 *               status:
 *                 type: boolean
 *                 description: Status (active/inactive)
 *                 example: true
 *                 default: true
 *     responses:
 *       201:
 *         description: Channel Partner and Incentive created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel Partner and Incentive created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     channelPartner:
 *                       $ref: '#/components/schemas/ChannelPartner'
 *                     incentive:
 *                       $ref: '#/components/schemas/ChannelPartnerIncentive'
 *       400:
 *         description: Missing required fields or Channel Partner already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel Partner with this name or mobile number already exists"
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/incentives:
 *   post:
 *     summary: Create a new Channel Partner Incentive
 *     tags: [Channel Partner Incentives]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - CP_Name
 *               - Brand
 *               - Incentive_type
 *               - Incentive_factor
 *             properties:
 *               CP_Name:
 *                 type: string
 *                 description: Channel Partner Name (must exist in system)
 *                 example: "ABC Electronics"
 *               Brand:
 *                 type: string
 *                 description: Brand Name
 *                 example: "Samsung"
 *               Image:
 *                 type: string
 *                 format: binary
 *                 description: Brand/Incentive related image (JPEG, PNG, max 2MB)
 *               Incentive_type:
 *                 type: string
 *                 enum: [Percentage, Amount]
 *                 description: Incentive Type
 *                 example: "Percentage"
 *               Incentive_factor:
 *                 type: number
 *                 description: Incentive Factor (0.00-99.99 for Percentage, >=0.00 for Amount)
 *                 example: 5.50
 *               status:
 *                 type: boolean
 *                 description: Incentive status (active/inactive)
 *                 example: true
 *                 default: true
 *     responses:
 *       201:
 *         description: Channel Partner Incentive created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel Partner Incentive created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ChannelPartnerIncentive'
 *       400:
 *         description: Incentive for this brand already exists, Channel Partner is inactive, or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Incentive for this brand already exists for this Channel Partner"
 *       404:
 *         description: Channel Partner not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel Partner not found"
 *       401:
 *         description: Not authorized
 *   get:
 *     summary: Get all Channel Partner Incentives with filters
 *     tags: [Channel Partner Incentives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cp_id
 *         schema:
 *           type: string
 *         description: Filter by Channel Partner ID
 *         example: "CP001"
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand name (case-insensitive)
 *         example: "Samsung"
 *       - in: query
 *         name: incentive_type
 *         schema:
 *           type: string
 *           enum: [Percentage, Amount]
 *         description: Filter by incentive type
 *         example: "Percentage"
 *       - in: query
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Filter by status (true for active, false for inactive)
 *         example: true
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in brand name or CP_id
 *         example: "Samsung"
 *     responses:
 *       200:
 *         description: Channel Partner Incentives retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel Partner Incentives retrieved successfully"
 *                 count:
 *                   type: number
 *                   example: 5
 *                 filters:
 *                   type: object
 *                   description: Applied filters
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChannelPartnerIncentive'
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/incentives/{id}:
 *   get:
 *     summary: Get Channel Partner Incentive by ID
 *     tags: [Channel Partner Incentives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incentive ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Channel Partner Incentive retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel Partner Incentive retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ChannelPartnerIncentive'
 *       404:
 *         description: Channel Partner Incentive not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel Partner Incentive not found"
 *       401:
 *         description: Not authorized
 *   put:
 *     summary: Update Channel Partner Incentive
 *     tags: [Channel Partner Incentives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incentive ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               CP_Name:
 *                 type: string
 *                 description: Channel Partner Name (must exist and be active)
 *                 example: "ABC Electronics"
 *               Brand:
 *                 type: string
 *                 description: Brand Name
 *                 example: "Samsung"
 *               Image:
 *                 type: string
 *                 format: binary
 *                 description: Brand/Incentive related image (JPEG, PNG, max 2MB)
 *               Incentive_type:
 *                 type: string
 *                 enum: [Percentage, Amount]
 *                 description: Incentive Type
 *                 example: "Percentage"
 *               Incentive_factor:
 *                 type: number
 *                 description: Incentive Factor (0.00-99.99 for Percentage, >=0.00 for Amount)
 *                 example: 5.50
 *               status:
 *                 type: boolean
 *                 description: Incentive status (active/inactive)
 *                 example: true
 *     responses:
 *       200:
 *         description: Channel Partner Incentive updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel Partner Incentive updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ChannelPartnerIncentive'
 *       400:
 *         description: Incentive for this brand already exists, Channel Partner is inactive, or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Incentive for this brand already exists for this Channel Partner"
 *       404:
 *         description: Channel Partner Incentive not found or Channel Partner not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel Partner Incentive not found"
 *       401:
 *         description: Not authorized
 *   delete:
 *     summary: Delete Channel Partner Incentive
 *     tags: [Channel Partner Incentives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incentive ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Channel Partner Incentive deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel Partner Incentive deleted successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ChannelPartnerIncentive'
 *       404:
 *         description: Channel Partner Incentive not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel Partner Incentive not found"
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/incentives/partner/{cpId}:
 *   get:
 *     summary: Get all incentives for a specific Channel Partner
 *     tags: [Channel Partner Incentives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cpId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel Partner ID
 *         example: "CP001"
 *       - in: query
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Filter by status (true for active, false for inactive)
 *         example: true
 *     responses:
 *       200:
 *         description: Channel Partner Incentives retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel Partner Incentives retrieved successfully"
 *                 partner:
 *                   $ref: '#/components/schemas/ChannelPartner'
 *                 count:
 *                   type: number
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChannelPartnerIncentive'
 *       404:
 *         description: Channel Partner not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel Partner not found"
 *       401:
 *         description: Not authorized
 *   delete:
 *     summary: Delete all incentives for a specific Channel Partner
 *     tags: [Channel Partner Incentives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cpId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel Partner ID
 *         example: "CP001"
 *     responses:
 *       200:
 *         description: All incentives for Channel Partner deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "All incentives for Channel Partner CP001 deleted successfully"
 *                 deletedCount:
 *                   type: number
 *                   example: 5
 *                 partner:
 *                   $ref: '#/components/schemas/ChannelPartner'
 *       404:
 *         description: Channel Partner not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel Partner not found"
 *       401:
 *         description: Not authorized
 */

// Combined route to create Channel Partner with Incentive
router.route('/create-with-partner').post(protect, uploadIncentiveImage, handleUploadError, processUploadedFile, createChannelPartnerWithIncentive);

/**
 * @swagger
 * /api/incentives/upload-excel:
 *   post:
 *     summary: Upload Channel Partner Incentives from Excel file
 *     tags: [Channel Partner Incentives]
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
 *                 description: Excel file (.xlsx or .xls) containing Channel Partner Incentive data. Expected columns - CP_id, Brand, Incentive_type (Percentage/Amount), Incentive_factor, status
 *     responses:
 *       200:
 *         description: Excel file processed successfully
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
 *                   example: "Excel upload completed. 15/20 Channel Partner Incentives processed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRows:
 *                           type: number
 *                         successful:
 *                           type: number
 *                         failed:
 *                           type: number
 *                         duplicates:
 *                           type: number
 *                     successful:
 *                       type: array
 *                       items:
 *                         type: object
 *                     failed:
 *                       type: array
 *                       items:
 *                         type: object
 *                     duplicates:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid file format or validation error
 *       401:
 *         description: Not authorized
 */
router.post('/upload-excel', protect, uploadExcelFile, handleUploadError, uploadIncentivesFromExcel);

/**
 * @swagger
 * /api/incentives/export-pdf:
 *   get:
 *     summary: Generate and download Channel Partner Incentives PDF report
 *     tags: [Channel Partner Incentives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search filter to apply before generating PDF
 *       - in: query
 *         name: cp_id
 *         schema:
 *           type: string
 *         description: Filter by Channel Partner ID
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand name
 *       - in: query
 *         name: incentive_type
 *         schema:
 *           type: string
 *           enum: [Percentage, Amount]
 *         description: Filter by incentive type
 *       - in: query
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Filter by status (true for active, false for inactive)
 *     responses:
 *       200:
 *         description: PDF file generated and downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: No Channel Partner Incentives found to export
 *       401:
 *         description: Not authorized
 */
router.get('/export-pdf', protect, generateIncentivesPDF);

// Main CRUD routes for incentives
router.route('/').post(protect, uploadIncentiveImage, handleUploadError, processUploadedFile, manageIncentives).get(protect, manageIncentives);
router.route('/:id').get(protect, manageIncentives).put(protect, uploadIncentiveImage, handleUploadError, processUploadedFile, manageIncentives).delete(protect, manageIncentives);

// Routes for managing incentives by Channel Partner ID
router.route('/partner/:cpId').get(protect, getIncentivesByPartnerId).delete(protect, deleteIncentivesByPartnerId);

export default router;