import express from 'express';
import { registerUser, loginUser } from './user.controller.js';
import { protect, superAdminAuth } from '../../middleware/user.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and authentication
 */

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Register a new user (Super Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - User_id
 *               - Password
 *               - Mobile Number
 *               - Email id
 *               - User Name
 *               - Role
 *             properties:
 *               User_id:
 *                 type: string
 *                 example: "user001"
 *               Password:
 *                 type: string
 *                 format: password
 *                 example: "password123"
 *               "Mobile Number":
 *                 type: string
 *                 example: "9876543210"
 *               "Email id":
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               Image:
 *                 type: string
 *                 example: "http://example.com/image.png"
 *               "User Name":
 *                 type: string
 *                 example: "Test User"
 *               Role:
 *                 type: string
 *                 enum: ['Super Admin', 'Admin', 'Marketing', 'Dispatch head', 'Store Head', 'Transport Manager', 'Accountant', 'Document Manager', 'Guest']
 *                 example: "Admin"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid user data or user with this email already exists
 *       401:
 *         description: Not authorized, token failed
 *       403:
 *         description: Not authorized as a Super Admin
 */
router.post('/register', protect, superAdminAuth, registerUser);

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Authenticate user and get token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Email id
 *               - Password
 *             properties:
 *               "Email id":
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               Password:
 *                 type: string
 *                 format: password
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid email or password
 */
router.post('/login', loginUser);

export default router;