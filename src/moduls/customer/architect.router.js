
import express from 'express';
import {
  manageArchitects,
  manageDropdownData,
  manageArchTypes,
  manageCities,
  manageStates,
  manageArchitectCategories,
} from './architect.controller.js';
import { protect } from '../../middleware/user.middleware.js';
import { uploadArchitectImage, processUploadedFile } from '../../middleware/upload.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Architect
 *   description: Architect management and operations (Optimized with fewer endpoints)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Architect:
 *       type: object
 *       required:
 *         - Arch_Name
 *         - Mobile Number
 *         - Arch_type
 *         - Arch_category
 *         - Arch_Address
 *         - Arch_city
 *         - Arch_state
 *       properties:
 *         Arch_id:
 *           type: string
 *           description: Architect Unique ID (auto-generated)
 *           readOnly: true
 *           example: "ARCH001"
 *         Arch_Name:
 *           type: string
 *           description: Architect Name
 *           example: "John Smith"
 *         "Mobile Number":
 *           type: string
 *           description: Mobile number used for WhatsApp notification (10 digits)
 *           example: "9876543210"
 *         "Email id":
 *           type: string
 *           format: email
 *           description: Architect email id (can be blank)
 *           example: "john.smith@example.com"
 *         Arch_type:
 *           type: string
 *           description: Architect Type (dropdown from database)
 *           example: "Residential"
 *         Arch_category:
 *           type: string
 *           description: Architect Category
 *           example: "Premium"
 *         Image:
 *           type: string
 *           description: Architect image (not required, can be blank)
 *           example: "http://example.com/image.png"
 *         Arch_Address:
 *           type: string
 *           description: Architect Address
 *           example: "123 Main Street, Building A"
 *         Arch_city:
 *           type: string
 *           description: Architect City (dropdown from database)
 *           example: "Mumbai"
 *         Arch_state:
 *           type: string
 *           description: Architect State (dropdown from database)
 *           example: "Maharashtra"
 */

// ========== Main Architect Management Route ==========

/**
 * @swagger
 * /api/architect:
 *   post:
 *     summary: Create a new Architect
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - Arch_Name
 *               - Mobile Number
 *               - Arch_type
 *               - Arch_category
 *               - Arch_Address
 *               - Arch_city
 *               - Arch_state
 *             properties:
 *               Arch_Name:
 *                 type: string
 *                 description: Architect Name
 *                 example: "John Smith"
 *               Mobile Number:
 *                 type: string
 *                 description: Mobile number (10 digits)
 *                 example: "9876543210"
 *               Email id:
 *                 type: string
 *                 format: email
 *                 description: Architect email id (optional)
 *                 example: "john.smith@example.com"
 *               Arch_type:
 *                 type: string
 *                 description: Architect Type
 *                 example: "Residential"
 *               Arch_category:
 *                 type: string
 *                 enum: [A, B, C, D]
 *                 description: Architect Category
 *                 example: "A"
 *               Image:
 *                 type: string
 *                 format: binary
 *                 description: Architect image (optional)
 *               Arch_Address:
 *                 type: string
 *                 description: Architect Address
 *                 example: "123 Main Street, Building A"
 *               Arch_city:
 *                 type: string
 *                 description: Architect City
 *                 example: "Mumbai"
 *               Arch_state:
 *                 type: string
 *                 description: Architect State
 *                 example: "Maharashtra"
 *     responses:
 *       201:
 *         description: Architect created successfully
 *       400:
 *         description: Architect with this ID already exists or invalid data
 *       401:
 *         description: Not authorized
 *   get:
 *     summary: Get all Architects with optional filters
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by architect type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [A, B, C, D]
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, ID, email, or address
 *     responses:
 *       200:
 *         description: Architects retrieved successfully
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
 *                     $ref: '#/components/schemas/Architect'
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/architect/{id}:
 *   get:
 *     summary: Get Architect by ID
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Architect ID
 *     responses:
 *       200:
 *         description: Architect retrieved successfully
 *       404:
 *         description: Architect not found
 *       401:
 *         description: Not authorized
 *   put:
 *     summary: Update Architect
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Architect ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               Arch_Name:
 *                 type: string
 *                 description: Architect Name
 *                 example: "John Smith"
 *               Mobile Number:
 *                 type: string
 *                 description: Mobile number (10 digits)
 *                 example: "9876543210"
 *               Email id:
 *                 type: string
 *                 format: email
 *                 description: Architect email id (optional)
 *                 example: "john.smith@example.com"
 *               Arch_type:
 *                 type: string
 *                 description: Architect Type
 *                 example: "Residential"
 *               Arch_category:
 *                 type: string
 *                 enum: [A, B, C, D]
 *                 description: Architect Category
 *                 example: "A"
 *               Image:
 *                 type: string
 *                 format: binary
 *                 description: Architect image (optional)
 *               Arch_Address:
 *                 type: string
 *                 description: Architect Address
 *                 example: "123 Main Street, Building A"
 *               Arch_city:
 *                 type: string
 *                 description: Architect City
 *                 example: "Mumbai"
 *               Arch_state:
 *                 type: string
 *                 description: Architect State
 *                 example: "Maharashtra"
 *     responses:
 *       200:
 *         description: Architect updated successfully
 *       404:
 *         description: Architect not found
 *       401:
 *         description: Not authorized
 *   delete:
 *     summary: Delete Architect
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Architect ID
 *     responses:
 *       200:
 *         description: Architect deleted successfully
 *       404:
 *         description: Architect not found
 *       401:
 *         description: Not authorized
 */

// ========== Individual Management Routes (MUST come before /:id route) ==========
// Individual management routes (Create and Get All only)
router.route('/arch-types').post(protect, manageArchTypes).get(protect, manageArchTypes);
router.route('/cities').post(protect, manageCities).get(protect, manageCities);
router.route('/states').post(protect, manageStates).get(protect, manageStates);
router.route('/categories').post(protect, manageArchitectCategories).get(protect, manageArchitectCategories);

// Main CRUD routes (with image upload for create/update)
router.route('/').post(protect, uploadArchitectImage, processUploadedFile, manageArchitects).get(protect, manageArchitects);
router.route('/:id').get(protect, manageArchitects).put(protect, uploadArchitectImage, processUploadedFile, manageArchitects).delete(protect, manageArchitects);

// ========== Dropdown Management Route ==========

/**
 * @swagger
 * /api/architect/dropdown:
 *   get:
 *     summary: Get dropdown data for Architect forms
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [arch-types, cities, states, categories]
 *         description: Specific dropdown type to fetch (optional - if not provided, returns all)
 *     responses:
 *       200:
 *         description: Dropdown data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 type:
 *                   type: string
 *                 count:
 *                   type: number
 *                 data:
 *                   oneOf:
 *                     - type: array
 *                       items:
 *                         type: object
 *                     - type: object
 *                       properties:
 *                         arch_types:
 *                           type: array
 *                         cities:
 *                           type: array
 *                         states:
 *                           type: array
 *                         categories:
 *                           type: array
 *       401:
 *         description: Not authorized
 *   post:
 *     summary: Add new dropdown item
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dropdown_type
 *               - name
 *             properties:
 *               dropdown_type:
 *                 type: string
 *                 enum: [arch-type, city, state]
 *                 description: Type of dropdown item to add
 *                 example: "arch-type"
 *               name:
 *                 type: string
 *                 description: Name of the item to add
 *                 example: "Commercial"
 *               description:
 *                 type: string
 *                 description: Description (for arch-type only)
 *                 example: "Specializes in commercial buildings"
 *               state_code:
 *                 type: string
 *                 description: State code (for city/state)
 *                 example: "MH"
 *     responses:
 *       201:
 *         description: Dropdown item added successfully
 *       400:
 *         description: Item already exists or invalid dropdown_type
 *       401:
 *         description: Not authorized
 */

// Dropdown management routes
router.route('/dropdown').get(protect, manageDropdownData).post(protect, manageDropdownData);

// ========== Individual Management Routes ==========

/**
 * @swagger
 * /api/architect/arch-types:
 *   post:
 *     summary: Create a new Architect Type
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type_name
 *             properties:
 *               type_name:
 *                 type: string
 *                 description: Architect type name
 *                 example: "Commercial"
 *               description:
 *                 type: string
 *                 description: Type description (optional)
 *                 example: "Specializes in commercial buildings"
 *     responses:
 *       201:
 *         description: Architect type created successfully
 *       400:
 *         description: Architect type already exists or invalid data
 *       401:
 *         description: Not authorized
 *   get:
 *     summary: Get all Architect Types
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Architect types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       type_name:
 *                         type: string
 *                       description:
 *                         type: string
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/architect/cities:
 *   post:
 *     summary: Create a new City
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - city_name
 *             properties:
 *               city_name:
 *                 type: string
 *                 description: City name
 *                 example: "Mumbai"
 *               state_code:
 *                 type: string
 *                 description: State code (optional)
 *                 example: "MH"
 *     responses:
 *       201:
 *         description: City created successfully
 *       400:
 *         description: City already exists or invalid data
 *       401:
 *         description: Not authorized
 *   get:
 *     summary: Get all Cities
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cities retrieved successfully
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/architect/states:
 *   post:
 *     summary: Create a new State
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - state_name
 *             properties:
 *               state_name:
 *                 type: string
 *                 description: State name
 *                 example: "Maharashtra"
 *               state_code:
 *                 type: string
 *                 description: State code (optional)
 *                 example: "MH"
 *     responses:
 *       201:
 *         description: State created successfully
 *       400:
 *         description: State already exists or invalid data
 *       401:
 *         description: Not authorized
 *   get:
 *     summary: Get all States
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: States retrieved successfully
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/architect/categories:
 *   post:
 *     summary: Create/Validate a new Architect Category
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_name
 *             properties:
 *               category_name:
 *                 type: string
 *                 description: Category name (can be any string value)
 *                 example: "Premium"
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Category name required
 *       401:
 *         description: Not authorized
 *   get:
 *     summary: Get all Architect Categories
 *     tags: [Architect]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Architect categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                         enum: [A, B, C, D]
 *       401:
 *         description: Not authorized
 */

export default router;
