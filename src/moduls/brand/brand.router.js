import express from 'express';
import {
  manageBrands,
  getBrandAnalytics,
  getAllBrandsDropdown
} from './brand.controller.js';
import { protect } from '../../middleware/user.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Brand
 *   description: Brand management with comprehensive CRUD operations and analytics
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Brand:
 *       type: object
 *       required:
 *         - Brand_Name
 *         - Supplier_Name
 *       properties:
 *         Brand_Code:
 *           type: string
 *           description: Brand Unique Code (auto-generated)
 *           readOnly: true
 *           example: "BRD001"
 *         Brand_Name:
 *           type: string
 *           description: Brand Name (must be unique)
 *           example: "Apple"
 *         Supplier_Name:
 *           type: string
 *           description: Supplier Name
 *           example: "Apple Inc."
 *         created_by:
 *           type: string
 *           description: User ID who created the brand
 *           readOnly: true
 *           example: "60d21b4667d0d8992e610c85"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Brand creation timestamp
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Brand last update timestamp
 *           readOnly: true
 */

// ========== Main Brand Management Routes ==========

/**
 * @swagger
 * /api/brand:
 *   post:
 *     summary: Create a new Brand (Super Admin Only)
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Brand_Name
 *               - Supplier_Name
 *             properties:
 *               Brand_Name:
 *                 type: string
 *                 example: "Apple"
 *               Supplier_Name:
 *                 type: string
 *                 example: "Apple Inc."
 *           examples:
 *             technology_brand:
 *               summary: Technology Brand Example
 *               value:
 *                 Brand_Name: "Apple"
 *                 Supplier_Name: "Apple Inc."
 *             other_brand:
 *               summary: Other Brand Example
 *               value:
 *                 Brand_Name: "Nike"
 *                 Supplier_Name: "Nike Inc."
 *     responses:
 *       201:
 *         description: Brand created successfully
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
 *                   example: "Brand created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Brand'
 *       400:
 *         description: Brand with this Code/Name already exists or validation error
 *       403:
 *         description: Access denied - Super Admin only
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/brand:
 *   get:
 *     summary: Get all Brands with search and filters (Super Admin Only)
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in code, name, supplier
 *         example: "Apple"
 *       - in: query
 *         name: supplier
 *         schema:
 *           type: string
 *         description: Filter by supplier name
 *         example: "Apple Inc."
 *       - in: query
 *         name: include_details
 *         schema:
 *           type: boolean
 *         description: Include created by user details
 *         example: true
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Brands retrieved successfully
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
 *                   example: "Brands retrieved successfully"
 *                 count:
 *                   type: number
 *                   example: 10
 *                 total:
 *                   type: number
 *                   example: 50
 *                 page:
 *                   type: number
 *                   example: 1
 *                 totalPages:
 *                   type: number
 *                   example: 5
 *                 filters:
 *                   type: object
 *                   properties:
 *                     search:
 *                       type: string
 *                     supplier:
 *                       type: string
 *                     include_details:
 *                       type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Brand'
 *       403:
 *         description: Access denied - Super Admin only
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/brand/{id}:
 *   get:
 *     summary: Get Brand by Code (Super Admin Only)
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand Code
 *         example: "BRD001"
 *     responses:
 *       200:
 *         description: Brand retrieved successfully
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
 *                   example: "Brand retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Brand'
 *       404:
 *         description: Brand not found
 *       403:
 *         description: Access denied - Super Admin only
 *       401:
 *         description: Not authorized
 *   put:
 *     summary: Update Brand (Super Admin Only)
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand Code
 *         example: "BRD001"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Brand_Name:
 *                 type: string
 *                 example: "Apple Updated"
 *               Supplier_Name:
 *                 type: string
 *                 example: "Apple Inc. Updated"
 *           examples:
 *             update_name:
 *               summary: Update Brand Name
 *               value:
 *                 Brand_Name: "Apple Updated"
 *             update_supplier:
 *               summary: Update Supplier Name
 *               value:
 *                 Supplier_Name: "Apple Inc. Updated"
 *             update_both:
 *               summary: Update Both Fields
 *               value:
 *                 Brand_Name: "Apple Updated"
 *                 Supplier_Name: "Apple Inc. Updated"
 *     responses:
 *       200:
 *         description: Brand updated successfully
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
 *                   example: "Brand updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Brand'
 *       400:
 *         description: Brand with this name already exists or validation error
 *       404:
 *         description: Brand not found
 *       403:
 *         description: Access denied - Super Admin only
 *       401:
 *         description: Not authorized
 *   delete:
 *     summary: Delete Brand (Super Admin Only)
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand Code
 *         example: "BRD001"
 *     responses:
 *       200:
 *         description: Brand deleted successfully
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
 *                   example: "Brand deleted successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Brand'
 *       404:
 *         description: Brand not found
 *       403:
 *         description: Access denied - Super Admin only
 *       401:
 *         description: Not authorized
 */

// Main CRUD routes
router.route('/').post(protect, manageBrands).get(protect, manageBrands);
router.route('/:id').get(protect, manageBrands).put(protect, manageBrands).delete(protect, manageBrands);

// ========== Analytics Routes ==========

/**
 * @swagger
 * /api/brand/analytics:
 *   get:
 *     summary: Get Brand analytics and insights
 *     tags: [Brand]
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
 *         example: "summary"
 *     responses:
 *       200:
 *         description: Brand analytics retrieved successfully
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
 *                   example: "Brand analytics retrieved successfully"
 *                 data:
 *                   type: object
 *                   description: Analytics data based on type
 *                   properties:
 *                     totalBrands:
 *                       type: number
 *                       example: 150
 *                     byCategory:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "Technology"
 *                           count:
 *                             type: number
 *                             example: 45
 *                     byStatus:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "Active"
 *                           count:
 *                             type: number
 *                             example: 120
 *                     byCountry:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "USA"
 *                           count:
 *                             type: number
 *                             example: 50
 *                     recentBrands:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           Brand_id:
 *                             type: string
 *                             example: "BRD001"
 *                           Brand_Name:
 *                             type: string
 *                             example: "Apple Inc."
 *                           Brand_Category:
 *                             type: string
 *                             example: "Technology"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       400:
 *         description: Invalid analytics type
 *       401:
 *         description: Not authorized
 */
router.get('/analytics', protect, getBrandAnalytics);

// ========== Dropdown Routes ==========

/**
 * @swagger
 * /api/brand/dropdown:
 *   get:
 *     summary: Get all Brands for dropdown/select components
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in brand ID and name
 *         example: "Apple"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Electronics, Clothing, Food & Beverage, Automotive, Healthcare, Beauty & Personal Care, Home & Garden, Sports & Fitness, Technology, Other]
 *         description: Filter by brand category
 *         example: "Technology"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive, Pending]
 *         description: Filter by brand status
 *         example: "Active"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of brands to return
 *         example: 50
 *     responses:
 *       200:
 *         description: Brand dropdown data retrieved successfully
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
 *                   example: "All Brand dropdown data retrieved successfully"
 *                 count:
 *                   type: number
 *                   example: 25
 *                 filters:
 *                   type: object
 *                   properties:
 *                     search:
 *                       type: string
 *                     category:
 *                       type: string
 *                     status:
 *                       type: string
 *                     limit:
 *                       type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "BRD001"
 *                       name:
 *                         type: string
 *                         example: "Apple Inc."
 *                       category:
 *                         type: string
 *                         example: "Technology"
 *                       status:
 *                         type: string
 *                         example: "Active"
 *                       label:
 *                         type: string
 *                         example: "BRD001 - Apple Inc."
 *       401:
 *         description: Not authorized
 */
router.get('/dropdown', protect, getAllBrandsDropdown);

export default router;
