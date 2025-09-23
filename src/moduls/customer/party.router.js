import express from 'express';
import {
  manageParties,
  manageDropdownData,
  getPartyAnalytics
} from './party.controller.js';
import { protect } from '../../middleware/user.middleware.js';

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
router.route('/dropdown/:type').get(protect, manageDropdownData).post(protect, manageDropdownData);
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

export default router;
