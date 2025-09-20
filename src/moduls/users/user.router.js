import express from 'express';
import { registerUser, loginUser, logoutUser, getUserProfile } from './user.controller.js';
import { protect, superAdminAuth } from '../../middleware/user.middleware.js';
import { uploadUserImage, handleUploadError, processUploadedFile } from '../../middleware/upload.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and authentication
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - Mobile Number
 *         - Email id
 *         - User Name
 *         - Password
 *         - Role
 *       properties:
 *         User_id:
 *           type: string
 *           description: Auto-generated unique user ID
 *           example: "user001"
 *         Mobile Number:
 *           type: string
 *           pattern: '^[0-9]{10}$'
 *           description: 10-digit mobile number
 *           example: "9876543210"
 *         Email id:
 *           type: string
 *           format: email
 *           description: Unique email address
 *           example: "user@example.com"
 *         User Name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: Full name of the user
 *           example: "John Doe"
 *         Password:
 *           type: string
 *           minLength: 6
 *           description: User password (hashed in database)
 *           example: "password123"
 *         Role:
 *           type: string
 *           enum: [Admin, Manager, Staff]
 *           description: User role
 *           example: "Admin"
 *         Image:
 *           type: string
 *           description: Path to user profile image
 *           example: "uploads/users/user-1234567890.jpg"
 *         isSuperAdmin:
 *           type: boolean
 *           default: false
 *           description: Super admin privileges
 *           example: false
 *         status:
 *           type: boolean
 *           default: true
 *           description: Account status (active/inactive)
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Record creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Record last update timestamp
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - Mobile Number
 *               - Email id
 *               - User Name
 *               - Password
 *               - Role
 *             properties:
 *               Mobile Number:
 *                 type: string
 *                 pattern: '^[0-9]{10}$'
 *                 description: 10-digit mobile number
 *                 example: "9876543210"
 *               Email id:
 *                 type: string
 *                 format: email
 *                 description: Unique email address
 *                 example: "user@example.com"
 *               User Name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Full name of the user
 *                 example: "John Doe"
 *               Password:
 *                 type: string
 *                 minLength: 6
 *                 description: User password
 *                 example: "password123"
 *               Role:
 *                 type: string
 *                 enum: [Admin, Manager, Staff]
 *                 description: User role
 *                 example: "Admin"
 *               Image:
 *                 type: string
 *                 format: binary
 *                 description: User profile image file
 *               isSuperAdmin:
 *                 type: boolean
 *                 default: false
 *                 description: Super admin privileges
 *                 example: false
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User with this email already exists"
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not authorized, no token"
 *       403:
 *         description: Not authorized as a Super Admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not authorized as a Super Admin"
 */
router.post('/register', protect, superAdminAuth, uploadUserImage, handleUploadError, processUploadedFile, registerUser);

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
 *                 description: User email address
 *                 example: "user@example.com"
 *               Password:
 *                 type: string
 *                 format: password
 *                 description: User password
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     User_id:
 *                       type: string
 *                       example: "user001"
 *                     "Mobile Number":
 *                       type: string
 *                       example: "9876543210"
 *                     "Email id":
 *                       type: string
 *                       example: "user@example.com"
 *                     "User Name":
 *                       type: string
 *                       example: "John Doe"
 *                     Role:
 *                       type: string
 *                       example: "Admin"
 *                     Image:
 *                       type: string
 *                       example: "uploads/users/user-1234567890.jpg"
 *                     isSuperAdmin:
 *                       type: boolean
 *                       example: false
 *                     status:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid email or password"
 */
router.post('/login', loginUser);

/**
 * @swagger
 * /api/user/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logout successful"
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Not authorized, token failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not authorized, token failed"
 */
router.post('/logout', protect, logoutUser);

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User profile retrieved successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     User_id:
 *                       type: string
 *                       example: "user001"
 *                     "Mobile Number":
 *                       type: string
 *                       example: "9876543210"
 *                     "Email id":
 *                       type: string
 *                       example: "user@example.com"
 *                     "User Name":
 *                       type: string
 *                       example: "John Doe"
 *                     Role:
 *                       type: string
 *                       example: "Admin"
 *                     Image:
 *                       type: string
 *                       example: "uploads/users/user-1234567890.jpg"
 *                     isSuperAdmin:
 *                       type: boolean
 *                       example: false
 *                     status:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-20T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-20T10:30:00.000Z"
 *       401:
 *         description: Not authorized, token failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not authorized, token failed"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 */
router.get('/profile', protect, getUserProfile);

export default router;