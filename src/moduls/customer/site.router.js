import express from 'express';
import {
  manageSites,
  manageSiteDropdownData,
  getSitesByParty,
  getSiteAnalytics,
  uploadSitesFromExcel,
  generateSitesPDF,
  sendSiteOTP,
  verifySiteOTP
} from './site.controller.js';
import { protect } from '../../middleware/user.middleware.js';
import {
  uploadExcelFile,
  handleUploadError
} from '../../middleware/s3.upload.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Site
 *   description: Site management with optimized endpoints and party relationships
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Site:
 *       type: object
 *       required:
 *         - Site_Billing_Name
 *         - Contact_Person
 *         - Mobile_Number
 *         - Site_Address
 *         - Site_city
 *         - Site_State
 *         - Site_party_id
 *         - Site_User_id
 *         - Site_cp_id
 *       properties:
 *         Site_id:
 *           type: string
 *           description: Site Unique ID (auto-generated)
 *           readOnly: true
 *           example: "SITE001"
 *         Site_Billing_Name:
 *           type: string
 *           description: Site Billing Name
 *           example: "ABC Construction Site - Phase 1"
 *         Contact_Person:
 *           type: string
 *           description: Site Contact Person Name
 *           example: "Site Manager Name"
 *         Mobile_Number:
 *           type: string
 *           description: Mobile number for WhatsApp notifications (10 digits)
 *           pattern: "^[0-9]{10}$"
 *           example: "9876543210"
 *         Site_Supervisor_name:
 *           type: string
 *           description: Site Supervisor Name (optional)
 *           example: "Supervisor Name"
 *         Site_Supervisor_Number:
 *           type: string
 *           description: Site Supervisor Mobile Number (10 digits, optional)
 *           pattern: "^[0-9]{10}$"
 *           example: "9876543211"
 *         Other_Numbers:
 *           type: string
 *           description: Other contact numbers (optional)
 *           example: "022-12345678, 9876543212"
 *         Email_id:
 *           type: string
 *           format: email
 *           description: Site email ID (optional)
 *           example: "site@abc-construction.com"
 *         Site_Address:
 *           type: string
 *           description: Site Address
 *           example: "Plot 123, Industrial Area, Sector 5"
 *         Site_city:
 *           type: string
 *           description: Site City (dropdown with auto-create option)
 *           example: "Mumbai"
 *         Site_State:
 *           type: string
 *           description: Site State (dropdown with auto-create option)
 *           example: "Maharashtra"
 *         Site_Gstno:
 *           type: string
 *           description: Site GST Number (15 characters, optional)
 *           pattern: "^[a-zA-Z0-9]{15}$"
 *           example: "27ABCDE1234F1Z5"
 *         Site_party_id:
 *           type: string
 *           description: Party ID to whom site belongs (reference to Party table)
 *           example: "PTY001"
 *         Site_User_id:
 *           type: string
 *           description: Default User ID (reference to User table)
 *           example: "60d21b4667d0d8992e610c85"
 *         Site_cp_id:
 *           type: string
 *           description: Default Channel Partner ID (reference or "NA")
 *           example: "CP001"
 *     SiteCity:
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
 *     SiteState:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: State name
 *           example: "Maharashtra"
 */

// ========== Main Site Management Routes ==========

/**
 * @swagger
 * /api/site:
 *   post:
 *     summary: Create a new Site (auto-creates city/state if needed)
 *     tags: [Site]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Site'
 *     responses:
 *       201:
 *         description: Site created successfully
 *       400:
 *         description: Site with this ID already exists or validation error
 *       401:
 *         description: Not authorized
 *   get:
 *     summary: Get all Sites with advanced filters and search
 *     tags: [Site]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in ID, name, contact person, mobile, supervisor, email, address
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
 *         name: party_id
 *         schema:
 *           type: string
 *         description: Filter by party ID
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: cp_id
 *         schema:
 *           type: string
 *         description: Filter by channel partner ID
 *       - in: query
 *         name: supervisor
 *         schema:
 *           type: boolean
 *         description: Filter by supervisor presence (true/false)
 *       - in: query
 *         name: include_details
 *         schema:
 *           type: boolean
 *         description: Include related entity details (user, party, CP)
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
 *         description: Sites retrieved successfully
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
 *                     $ref: '#/components/schemas/Site'
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/site/{id}:
 *   get:
 *     summary: Get Site by ID with complete details
 *     tags: [Site]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Site ID
 *     responses:
 *       200:
 *         description: Site retrieved successfully with related details
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
 *                     - $ref: '#/components/schemas/Site'
 *                     - type: object
 *                       properties:
 *                         userDetails:
 *                           type: object
 *                         partyDetails:
 *                           type: object
 *                         channelPartnerDetails:
 *                           type: object
 *       404:
 *         description: Site not found
 *       401:
 *         description: Not authorized
 *   put:
 *     summary: Update Site (auto-creates city/state if needed)
 *     tags: [Site]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Site ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Site'
 *     responses:
 *       200:
 *         description: Site updated successfully
 *       404:
 *         description: Site not found
 *       401:
 *         description: Not authorized
 *   delete:
 *     summary: Delete Site
 *     tags: [Site]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Site ID
 *     responses:
 *       200:
 *         description: Site deleted successfully
 *       404:
 *         description: Site not found
 *       401:
 *         description: Not authorized
 */

// Main CRUD routes
router.route('/').post(protect, manageSites).get(protect, manageSites);
router.route('/:id').get(protect, manageSites).put(protect, manageSites).delete(protect, manageSites);

/**
 * @swagger
 * /api/site/upload-excel:
 *   post:
 *     summary: Upload Sites from Excel file
 *     tags: [Site]
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
 *                 description: Excel file (.xlsx or .xls) containing Site data. Expected columns - Site_Billing_Name, Contact_Person, Mobile_Number, Email_id, Site_Address, Site_city, Site_State, Site_Gstno, Site_Supervisor_name, Site_Supervisor_Number, Other_Numbers, Site_party_id, Site_User_id, Site_cp_id
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
 *                   example: "Excel upload completed. 15/20 Sites processed successfully"
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
router.post('/upload-excel', protect, uploadExcelFile, handleUploadError, uploadSitesFromExcel);

/**
 * @swagger
 * /api/site/export-pdf:
 *   get:
 *     summary: Generate and download Sites PDF report
 *     tags: [Site]
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
 *       - in: query
 *         name: party_id
 *         schema:
 *           type: string
 *         description: Filter by party ID
 *     responses:
 *       200:
 *         description: PDF file generated and downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: No Sites found to export
 *       401:
 *         description: Not authorized
 */
router.get('/export-pdf', protect, generateSitesPDF);

// ========== Party Relationship Routes ==========

/**
 * @swagger
 * /api/site/party/{partyId}:
 *   get:
 *     summary: Get all Sites belonging to a specific Party
 *     tags: [Site]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Party ID
 *       - in: query
 *         name: include_details
 *         schema:
 *           type: boolean
 *         description: Include related entity details
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
 *         description: Sites retrieved successfully for party
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
 *                 party_id:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Site'
 *       400:
 *         description: Party ID is required
 *       401:
 *         description: Not authorized
 */
router.get('/party/:partyId', protect, getSitesByParty);

// ========== Dropdown Management Routes ==========

/**
 * @swagger
 * /api/site/dropdown/{type}:
 *   get:
 *     summary: Get site dropdown data (cities or states)
 *     tags: [Site]
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
 *         description: Site dropdown data retrieved successfully
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
 *                       - $ref: '#/components/schemas/SiteCity'
 *                       - $ref: '#/components/schemas/SiteState'
 *       400:
 *         description: Invalid dropdown type
 *       401:
 *         description: Not authorized
 *   post:
 *     summary: Create new site dropdown item (city or state)
 *     tags: [Site]
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
 *               - $ref: '#/components/schemas/SiteCity'
 *               - $ref: '#/components/schemas/SiteState'
 *     responses:
 *       201:
 *         description: Site dropdown item created successfully
 *       400:
 *         description: Invalid data or item already exists
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/site/dropdown/{type}/{id}:
 *   put:
 *     summary: Update site dropdown item
 *     tags: [Site]
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
 *               - $ref: '#/components/schemas/SiteCity'
 *               - $ref: '#/components/schemas/SiteState'
 *     responses:
 *       200:
 *         description: Site dropdown item updated successfully
 *       404:
 *         description: Item not found
 *       401:
 *         description: Not authorized
 *   delete:
 *     summary: Delete site dropdown item (with usage validation)
 *     tags: [Site]
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
 *         description: Site dropdown item deleted successfully
 *       400:
 *         description: Item cannot be deleted as it is in use
 *       404:
 *         description: Item not found
 *       401:
 *         description: Not authorized
 */

// Dropdown management routes
router.route('/dropdown/:type').get(protect, manageSiteDropdownData).post(protect, manageSiteDropdownData);
router.route('/dropdown/:type/:id').put(protect, manageSiteDropdownData).delete(protect, manageSiteDropdownData);

// ========== Analytics Routes ==========

/**
 * @swagger
 * /api/site/analytics:
 *   get:
 *     summary: Get Site analytics and reports
 *     tags: [Site]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [summary, detailed, party]
 *           default: summary
 *         description: Type of analytics report
 *       - in: query
 *         name: party_id
 *         schema:
 *           type: string
 *         description: Filter analytics by party ID (required for type=party)
 *     responses:
 *       200:
 *         description: Site analytics retrieved successfully
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
 *         description: Invalid analytics type or missing party_id
 *       401:
 *         description: Not authorized
 */
router.get('/analytics', protect, getSiteAnalytics);

// OTP Routes (Public - No authentication required)
router.post('/send-otp', sendSiteOTP);
router.post('/verify-otp', verifySiteOTP);

export default router;
