import express from 'express';
import {
  manageChannelPartners,
  manageIncentives,
} from './channelPartner.controller.js';
import { protect } from '../../middleware/user.middleware.js';

const router = express.Router();

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
 *         - CP_id
 *         - CP_Name
 *         - Mobile Number
 *         - CP_Address
 *       properties:
 *         CP_id:
 *           type: string
 *           description: Channel Partner Unique ID
 *           example: "CP001"
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
 *     ChannelPartnerIncentive:
 *       type: object
 *       required:
 *         - CP_id
 *         - Brand
 *         - Incentive_type
 *         - Incentive_factor
 *       properties:
 *         CP_id:
 *           type: string
 *           description: Channel Partner Unique ID (Reference)
 *           example: "CP001"
 *         Brand:
 *           type: string
 *           description: Brand Name
 *           example: "Samsung"
 *         Incentive_type:
 *           type: string
 *           enum: [Percentage, Amount]
 *           description: Incentive Type - Percentage or Fixed Amount
 *           example: "Percentage"
 *         Incentive_factor:
 *           type: number
 *           description: Incentive Factor (0.00-99.99 for Percentage, >=0.00 for Amount)
 *           example: 5.50
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
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChannelPartner'
 *     responses:
 *       201:
 *         description: Channel Partner created successfully
 *       400:
 *         description: Channel Partner with this ID already exists or invalid data
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
 *       - in: query
 *         name: include_incentives
 *         schema:
 *           type: boolean
 *         description: Include incentives data for each partner
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
 *     summary: Get Channel Partner by ID with incentives
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
 *         description: Channel Partner retrieved successfully with incentives
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
 *                     incentives:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ChannelPartnerIncentive'
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
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChannelPartner'
 *     responses:
 *       200:
 *         description: Channel Partner updated successfully
 *       404:
 *         description: Channel Partner not found
 *       401:
 *         description: Not authorized
 *   delete:
 *     summary: Delete Channel Partner and associated incentives
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
 *         description: Channel Partner and associated incentives deleted successfully
 *       404:
 *         description: Channel Partner not found
 *       401:
 *         description: Not authorized
 */

// Main CRUD routes
router.route('/').post(protect, manageChannelPartners).get(protect, manageChannelPartners);
router.route('/:id').get(protect, manageChannelPartners).put(protect, manageChannelPartners).delete(protect, manageChannelPartners);

// ========== Incentive Management Routes ==========

/**
 * @swagger
 * /api/channelpartner/{id}/incentives:
 *   post:
 *     summary: Create a new Channel Partner Incentive
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Brand
 *               - Incentive_type
 *               - Incentive_factor
 *             properties:
 *               Brand:
 *                 type: string
 *                 example: "Samsung"
 *               Incentive_type:
 *                 type: string
 *                 enum: [Percentage, Amount]
 *                 example: "Percentage"
 *               Incentive_factor:
 *                 type: number
 *                 example: 5.50
 *     responses:
 *       201:
 *         description: Channel Partner Incentive created successfully
 *       400:
 *         description: Incentive for this brand already exists or invalid data
 *       404:
 *         description: Channel Partner not found
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/channelpartner/incentives:
 *   get:
 *     summary: Get all Channel Partner Incentives with filters
 *     tags: [Channel Partner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in brand name or CP_id
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
 *                 count:
 *                   type: number
 *                 filters:
 *                   type: object
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     allOf:
 *                       - $ref: '#/components/schemas/ChannelPartnerIncentive'
 *                       - type: object
 *                         properties:
 *                           partner_name:
 *                             type: string
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/channelpartner/incentives/{incentiveId}:
 *   put:
 *     summary: Update Channel Partner Incentive
 *     tags: [Channel Partner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: incentiveId
 *         required: true
 *         schema:
 *           type: string
 *         description: Incentive ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Brand:
 *                 type: string
 *                 example: "Samsung"
 *               Incentive_type:
 *                 type: string
 *                 enum: [Percentage, Amount]
 *                 example: "Percentage"
 *               Incentive_factor:
 *                 type: number
 *                 example: 5.50
 *     responses:
 *       200:
 *         description: Channel Partner Incentive updated successfully
 *       404:
 *         description: Channel Partner Incentive not found
 *       401:
 *         description: Not authorized
 *   delete:
 *     summary: Delete Channel Partner Incentive
 *     tags: [Channel Partner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: incentiveId
 *         required: true
 *         schema:
 *           type: string
 *         description: Incentive ID
 *     responses:
 *       200:
 *         description: Channel Partner Incentive deleted successfully
 *       404:
 *         description: Channel Partner Incentive not found
 *       401:
 *         description: Not authorized
 */

// Incentive management routes
router.post('/:id/incentives', protect, manageIncentives);
router.route('/incentives').get(protect, manageIncentives);
router.route('/incentives/:incentiveId').put(protect, manageIncentives).delete(protect, manageIncentives);

export default router;
