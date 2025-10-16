import express from 'express';
import colorController from './color.controller.js';
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Colors
 *   description: Color management
 */

/**
 * @swagger
 * /api/colors:
 *   post:
 *     summary: Create a new color
 *     tags: [Colors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Color created
 *       400:
 *         description: Bad request
 */
router.post('/colors', colorController.createColor);

/**
 * @swagger
 * /api/colors:
 *   get:
 *     summary: Get all colors
 *     tags: [Colors]
 *     responses:
 *       200:
 *         description: List of colors
 *       500:
 *         description: Server error
 */
router.get('/colors', colorController.getColors);

/**
 * @swagger
 * /api/colors/{id}:
 *   get:
 *     summary: Get a color by ID
 *     tags: [Colors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Color ID
 *     responses:
 *       200:
 *         description: Color found
 *       404:
 *         description: Color not found
 *       500:
 *         description: Server error
 */
router.get('/colors/:id', colorController.getColorById);

/**
 * @swagger
 * /api/colors/{id}:
 *   put:
 *     summary: Update a color by ID
 *     tags: [Colors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Color ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Color updated
 *       400:
 *         description: Bad request
 *       404:
 *         description: Color not found
 */
router.put('/colors/:id', colorController.updateColor);

/**
 * @swagger
 * /api/colors/{id}:
 *   delete:
 *     summary: Delete a color by ID
 *     tags: [Colors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Color ID
 *     responses:
 *       200:
 *         description: Color deleted
 *       404:
 *         description: Color not found
 *       500:
 *         description: Server error
 */
router.delete('/colors/:id', colorController.deleteColor);

export default router;