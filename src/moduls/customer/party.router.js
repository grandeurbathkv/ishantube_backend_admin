import express from 'express';
import {
  manageParties,
  manageDropdownData,
  getPartyAnalytics,
  getAllPartiesDropdown,
  uploadPartiesFromExcel,
  generatePartiesPDF
} from './party.controller.js';
import { protect } from '../../middleware/user.middleware.js';
import { 
  uploadExcelFile, 
  handleUploadError 
} from '../../middleware/gcs.upload.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Party
 *   description: Party management with optimized endpoints and dropdown management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Party:
 *       type: object
 *       required:
 *         - Party_Billing_Name
 *         - Contact_Person
 *         - Mobile_Number
 *         - Party_Address
 *         - Party_city
 *         - Party_State
 *         - Party_default_User_id
 *         - Party_default_cp_id
 *         - Party_default_Arch_id
 *       properties:
 *         Party_id:
 *           type: string
 *           description: Party Unique ID (auto-generated)
 *           readOnly: true
 *           example: "PTY001"
 *         Party_Billing_Name:
 *           type: string
 *           description: Party Billing Name
 *           example: "ABC Construction Pvt Ltd"
 *         Contact_Person:
 *           type: string
 *           description: Party Contact Person Name
 *           example: "John Doe"
 *         Mobile_Number:
 *           type: string
 *           description: Mobile number for WhatsApp notifications (10 digits)
 *           pattern: "^[0-9]{10}$"
 *           example: "9876543210"
 *         Other_Numbers:
 *           type: string
 *           description: Other contact numbers (optional)
 *           example: "022-12345678, 9876543211"
 *         Email_id:
 *           type: string
 *           format: email
 *           description: Party email ID (optional)
 *           example: "contact@abc-construction.com"
 *         Party_Address:
 *           type: string
 *           description: Party Address
 *           example: "123 Business Park, Sector 5, Mumbai"
 *         Party_city:
 *           type: string
 *           description: Party City (dropdown with auto-create option)
 *           example: "Mumbai"
 *         Party_State:
 *           type: string
 *           description: Party State (dropdown with auto-create option)
 *           example: "Maharashtra"
 *         Party_Gstno:
 *           type: string
 *           description: Party GST Number (15 characters, optional)
 *           pattern: "^[a-zA-Z0-9]{15}$"
 *           example: "27ABCDE1234F1Z5"
 *         Party_default_User_id:
 *           type: string
 *           description: Default User ID (reference to User table)
 *           example: "60d21b4667d0d8992e610c85"
 *         Party_default_cp_id:
 *           type: string
 *           description: Default Channel Partner ID (reference or "NA")
 *           example: "CP001"
 *         Party_default_Arch_id:
 *           type: string
 *           description: Default Architect ID (reference or "NA")
 *           example: "ARCH001"
 *     PartyCity:
 *       type: object
 *       required:
 *         - name
 *         - state
 *       properties:
 *         name:
 *           type: string
 *           description: City name
 *           example: "Mumbai"
 *         state:
 *           type: string
 *           description: State name
 *           example: "Maharashtra"
 *     PartyState:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: State name
 *           example: "Maharashtra"
 */

// ========== Main Party Management Routes ==========

/**
 * @swagger
 * /api/party:
 *   post:
 *     summary: Create a new Party (auto-creates city/state if needed)
 *     tags: [Party]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Party'
 *     responses:
 *       201:
 *         description: Party created successfully
 *       400:
 *         description: Party with this ID already exists or validation error
 *       401:
 *         description: Not authorized
 *   get:
 *     summary: Get all Parties with advanced filters and search
 *     tags: [Party]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in ID, name, contact person, mobile, email, address
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         description: Filter by default user ID
 *       - in: query
 *         name: cp_id
 *         schema:
 *           type: string
 *         description: Filter by channel partner ID
 *       - in: query
 *         name: arch_id
 *         schema:
 *           type: string
 *         description: Filter by architect ID
 *       - in: query
 *         name: include_details
 *         schema:
 *           type: boolean
 *         description: Include related entity details (user, CP, architect)
 *       - in: query
 *         name: include_sites
 *         schema:
 *           type: boolean
 *         description: Include sites data for each party (true for full sites data, false for only site count)
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
 *     responses:
 *       200:
 *         description: Parties retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 count:
 *                   type: number
 *                 total:
 *                   type: number
 *                 page:
 *                   type: number
 *                 totalPages:
 *                   type: number
 *                 filters:
 *                   type: object
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Party'
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/party/{id}:
 *   get:
 *     summary: Get Party by ID with complete details
 *     tags: [Party]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Party ID
 *     responses:
 *       200:
 *         description: Party retrieved successfully with related details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Party'
 *                     - type: object
 *                       properties:
 *                         userDetails:
 *                           type: object
 *                         channelPartnerDetails:
 *                           type: object
 *                         architectDetails:
 *                           type: object
 *       404:
 *         description: Party not found
 *       401:
 *         description: Not authorized
 *   put:
 *     summary: Update Party (auto-creates city/state if needed)
 *     tags: [Party]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Party ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Party'
 *     responses:
 *       200:
 *         description: Party updated successfully
 *       404:
 *         description: Party not found
 *       401:
 *         description: Not authorized
 *   delete:
 *     summary: Delete Party
 *     tags: [Party]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Party ID
 *     responses:
 *       200:
 *         description: Party deleted successfully
 *       404:
 *         description: Party not found
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/party/upload-excel:
 *   post:
 *     summary: Upload Parties from Excel file
 *     tags: [Party]
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
 *                 description: Excel file (.xlsx or .xls) containing Party data. Expected columns - Party_Billing_Name, Contact_Person, Mobile_Number, Email_id, Party_Address, Party_city, Party_State, Party_Gstno, Other_Numbers, Party_default_User_id, Party_default_cp_id, Party_default_Arch_id
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
 *                   example: "Excel upload completed. 15/20 Parties processed successfully"
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
router.post('/upload-excel', protect, uploadExcelFile, handleUploadError, uploadPartiesFromExcel);

/**
 * @swagger
 * /api/party/export-pdf:
 *   get:
 *     summary: Generate and download Parties PDF report
 *     tags: [Party]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search filter to apply before generating PDF
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state
 *     responses:
 *       200:
 *         description: PDF file generated and downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: No Parties found to export
 *       401:
 *         description: Not authorized
 */
router.get('/export-pdf', protect, generatePartiesPDF);

// Main CRUD routes
router.route('/').post(protect, manageParties).get(protect, manageParties);
router.route('/:id').get(protect, manageParties).put(protect, manageParties).delete(protect, manageParties);

// ========== Dropdown Management Routes ==========

/**
 * @swagger
 * /api/party/dropdown/{type}:
 *   get:
 *     summary: Get dropdown data (cities or states)
 *     tags: [Party]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [cities, states]
 *         description: Type of dropdown data
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in names
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter cities by state (only for cities type)
 *     responses:
 *       200:
 *         description: Dropdown data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 count:
 *                   type: number
 *                 filters:
 *                   type: object
 *                 data:
 *                   type: array
 *                   items:
 *                     oneOf:
 *                       - $ref: '#/components/schemas/PartyCity'
 *                       - $ref: '#/components/schemas/PartyState'
 *       400:
 *         description: Invalid dropdown type
 *       401:
 *         description: Not authorized
 *   post:
 *     summary: Create new dropdown item (city or state)
 *     tags: [Party]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [cities, states]
 *         description: Type of dropdown data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/PartyCity'
 *               - $ref: '#/components/schemas/PartyState'
 *     responses:
 *       201:
 *         description: Dropdown item created successfully
 *       400:
 *         description: Invalid data or item already exists
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/party/dropdown/{type}/{id}:
 *   put:
 *     summary: Update dropdown item
 *     tags: [Party]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [cities, states]
 *         description: Type of dropdown data
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/PartyCity'
 *               - $ref: '#/components/schemas/PartyState'
 *     responses:
 *       200:
 *         description: Dropdown item updated successfully
 *       404:
 *         description: Item not found
 *       401:
 *         description: Not authorized
 *   delete:
 *     summary: Delete dropdown item (with usage validation)
 *     tags: [Party]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [cities, states]
 *         description: Type of dropdown data
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Dropdown item deleted successfully
 *       400:
 *         description: Item cannot be deleted as it is in use
 *       404:
 *         description: Item not found
 *       401:
 *         description: Not authorized
 */

// Dropdown management routes
// router.route('/dropdown/:type').get(protect, manageDropdownData).post(protect, manageDropdownData);
router.route('/dropdown/:type/:id').put(protect, manageDropdownData).delete(protect, manageDropdownData);

// ========== Analytics Routes ==========

/**
 * @swagger
 * /api/party/analytics:
 *   get:
 *     summary: Get Party analytics and reports
 *     tags: [Party]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [summary, detailed]
 *           default: summary
 *         description: Type of analytics report
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   description: Analytics data based on type
 *       400:
 *         description: Invalid analytics type
 *       401:
 *         description: Not authorized
 */
router.get('/analytics', protect, getPartyAnalytics);

/**
 * @swagger
 * /api/party/dropdown/all:
 *   get:
 *     summary: Get all Party ID & Name dropdown
 *     tags: [Party]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search Party by ID or Billing Name
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           example: all
 *         description: Limit number of records (use "all" for full list)
 *     responses:
 *       200:
 *         description: All Party dropdown data retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get("/dropdown/all", protect, getAllPartiesDropdown);



export default router;
