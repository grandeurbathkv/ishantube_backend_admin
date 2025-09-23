
import express from 'express';
import {
  manageChannelPartners,
  getChannelPartnerDropdown
} from './channelPartner.controller.js';
import { protect } from '../../middleware/user.middleware.js';
import { 
  uploadChannelPartnerImage, 
  handleUploadError, 
  processUploadedFile 
} from '../../middleware/upload.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/channelpartner/dropdown:
 *   get:
 *     summary: Get all Channel Partner IDs and Names for dropdown
 *     tags: [Channel Partner]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Channel Partner dropdown data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       CP_id:
 *                         type: string
 *                         description: Channel Partner Unique ID
 *                         example: "CP001"
 *                       CP_Name:
 *                         type: string
 *                         description: Channel Partner Name
 *                         example: "ABC Electronics"
 *       401:
 *         description: Not authorized
 */
router.get('/dropdown', protect, getChannelPartnerDropdown);

/**
 * @swagger
 * tags:
 *   name: Channel Partner
 *   description: Channel Partner management and operations (Optimized with fewer endpoints)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ChannelPartner:
 *       type: object
 *       required:
 *         - CP_Name
 *         - Mobile Number
 *         - CP_Address
 *       properties:
 *         CP_id:
 *           type: string
 *           description: Channel Partner Unique ID (Auto-generated)
 *           example: "CP001"
 *           readOnly: true
 *         CP_Name:
 *           type: string
 *           description: Channel Partner Name
 *           example: "ABC Electronics"
 *         "Mobile Number":
 *           type: string
 *           description: User Mobile number used for whatsapp notification (10 digits)
 *           example: "9876543210"
 *         "Email id":
 *           type: string
 *           format: email
 *           description: Channel Partner mail id (can be blank)
 *           example: "contact@abcelectronics.com"
 *         Image:
 *           type: string
 *           description: Channel Partner image (not required, can be blank)
 *           example: "http://example.com/image.png"
 *         CP_Address:
 *           type: string
 *           description: Channel Partner Address
 *           example: "123 Main Street, City, State - 123456"
 *         status:
 *           type: boolean
 *           description: Channel Partner active status
 *           example: true
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           readOnly: true
 */

// ========== Main Channel Partner Management Route ==========

/**
 * @swagger
 * /api/channelpartner:
 *   post:
 *     summary: Create a new Channel Partner
 *     tags: [Channel Partner]
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
 *               - Mobile Number
 *               - CP_Address
 *             properties:
 *               CP_Name:
 *                 type: string
 *                 description: Channel Partner Name
 *                 example: "ABC Electronics"
 *               "Mobile Number":
 *                 type: string
 *                 description: Mobile number (10 digits)
 *                 example: "9876543210"
 *               "Email id":
 *                 type: string
 *                 format: email
 *                 description: Email address (optional)
 *                 example: "contact@abcelectronics.com"
 *               Image:
 *                 type: string
 *                 format: binary
 *                 description: Channel Partner image file (JPEG, PNG, max 2MB)
 *               CP_Address:
 *                 type: string
 *                 description: Complete address
 *                 example: "123 Main Street, City, State - 123456"
 *               status:
 *                 type: boolean
 *                 description: Active status
 *                 example: true
 *                 default: true
 *     responses:
 *       201:
 *         description: Channel Partner created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/ChannelPartner'
 *       400:
 *         description: Invalid data, validation error, or file upload error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "File too large. Maximum size is 2MB."
 *       401:
 *         description: Not authorized
 *   get:
 *     summary: Get all Channel Partners with optional filters
 *     tags: [Channel Partner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, ID, email, address, or mobile
 *     responses:
 *       200:
 *         description: Channel Partners retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: number
 *                 filters:
 *                   type: object
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChannelPartner'
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/channelpartner/{id}:
 *   get:
 *     summary: Get Channel Partner by ID
 *     tags: [Channel Partner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel Partner ID
 *     responses:
 *       200:
 *         description: Channel Partner retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     partner:
 *                       $ref: '#/components/schemas/ChannelPartner'
 *       404:
 *         description: Channel Partner not found
 *       401:
 *         description: Not authorized
 *   put:
 *     summary: Update Channel Partner
 *     tags: [Channel Partner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel Partner ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               CP_Name:
 *                 type: string
 *                 description: Channel Partner Name
 *                 example: "ABC Electronics"
 *               "Mobile Number":
 *                 type: string
 *                 description: Mobile number (10 digits)
 *                 example: "9876543210"
 *               "Email id":
 *                 type: string
 *                 format: email
 *                 description: Email address (optional)
 *                 example: "contact@abcelectronics.com"
 *               Image:
 *                 type: string
 *                 format: binary
 *                 description: Channel Partner image file (JPEG, PNG, max 2MB)
 *               CP_Address:
 *                 type: string
 *                 description: Complete address
 *                 example: "123 Main Street, City, State - 123456"
 *               status:
 *                 type: boolean
 *                 description: Active status
 *                 example: true
 *     responses:
 *       200:
 *         description: Channel Partner updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/ChannelPartner'
 *       400:
 *         description: Invalid data, validation error, or file upload error
 *       404:
 *         description: Channel Partner not found
 *       401:
 *         description: Not authorized
 *   delete:
 *     summary: Delete Channel Partner
 *     tags: [Channel Partner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel Partner ID
 *     responses:
 *       200:
 *         description: Channel Partner deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/ChannelPartner'
 *       404:
 *         description: Channel Partner not found
 *       401:
 *         description: Not authorized
 */

// Main CRUD routes
router.route('/')
  .post(protect, uploadChannelPartnerImage, handleUploadError, processUploadedFile, manageChannelPartners)
  .get(protect, manageChannelPartners);
router.route('/:id')
  .get(protect, manageChannelPartners)
  .put(protect, uploadChannelPartnerImage, handleUploadError, processUploadedFile, manageChannelPartners)
  .delete(protect, manageChannelPartners);

export default router;
