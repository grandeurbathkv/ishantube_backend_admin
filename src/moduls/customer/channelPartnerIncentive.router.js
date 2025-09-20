import express from 'express';
import {
  manageIncentives,
  getIncentivesByPartnerId,
  deleteIncentivesByPartnerId,
} from './channelPartnerIncentive.controller.js';
import { protect } from '../../middleware/user.middleware.js';

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
 *         Incentive_type:
 *           type: string
 *           enum: [Percentage, Amount]
 *           description: Incentive Type - Percentage or Fixed Amount
 *           example: "Percentage"
 *         Incentive_factor:
 *           type: number
 *           description: Incentive Factor (0.00-99.99 for Percentage, >=0.00 for Amount)
 *           example: 5.50
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     IncentiveWithPartner:
 *       allOf:
 *         - $ref: '#/components/schemas/ChannelPartnerIncentive'
 *         - type: object
 *           properties:
 *             partner_name:
 *               type: string
 *               description: Channel Partner Name
 *               example: "ABC Electronics"
 *             partner_details:
 *               $ref: '#/components/schemas/ChannelPartner'
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - CP_id
 *               - Brand
 *               - Incentive_type
 *               - Incentive_factor
 *             properties:
 *               CP_id:
 *                 type: string
 *                 example: "CP001"
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/ChannelPartnerIncentive'
 *       400:
 *         description: Incentive for this brand already exists or invalid data
 *       404:
 *         description: Channel Partner not found
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
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand name (case-insensitive)
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
 *                     $ref: '#/components/schemas/IncentiveWithPartner'
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     incentive:
 *                       $ref: '#/components/schemas/ChannelPartnerIncentive'
 *                     partner:
 *                       $ref: '#/components/schemas/ChannelPartner'
 *       404:
 *         description: Channel Partner Incentive not found
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               CP_id:
 *                 type: string
 *                 example: "CP001"
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/ChannelPartnerIncentive'
 *       400:
 *         description: Incentive for this brand already exists or invalid data
 *       404:
 *         description: Channel Partner Incentive not found
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
 *                 data:
 *                   $ref: '#/components/schemas/ChannelPartnerIncentive'
 *       404:
 *         description: Channel Partner Incentive not found
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
 *                 partner:
 *                   $ref: '#/components/schemas/ChannelPartner'
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChannelPartnerIncentive'
 *       404:
 *         description: Channel Partner not found
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
 *                 deletedCount:
 *                   type: number
 *                 partner:
 *                   $ref: '#/components/schemas/ChannelPartner'
 *       404:
 *         description: Channel Partner not found
 *       401:
 *         description: Not authorized
 */

// Main CRUD routes for incentives
router.route('/').post(protect, manageIncentives).get(protect, manageIncentives);
router.route('/:id').get(protect, manageIncentives).put(protect, manageIncentives).delete(protect, manageIncentives);

// Routes for managing incentives by Channel Partner ID
router.route('/partner/:cpId').get(protect, getIncentivesByPartnerId).delete(protect, deleteIncentivesByPartnerId);

export default router;