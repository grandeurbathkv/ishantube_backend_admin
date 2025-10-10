
/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category and Subcategory management
 */
import express from 'express';
import categoryController from './category.controller.js';
const router = express.Router();

/**
 * @swagger
 * /api/category/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               subcategories:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *     responses:
 *       201:
 *         description: Category created
 *       400:
 *         description: Bad request
 */
router.post('/categories', categoryController.createCategory);

/**
 * @swagger
 * /api/category/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of categories
 *       500:
 *         description: Server error
 */
router.get('/categories', categoryController.getCategories);

/**
 * @swagger
 * /api/category/categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category found
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.get('/categories/:id', categoryController.getCategoryById);

/**
 * @swagger
 * /api/category/categories/{id}/subcategories:
 *   get:
 *     summary: Get subcategories by category ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: List of subcategories for the category
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.get('/categories/:id/subcategories', categoryController.getSubcategoriesByCategory);

/**
 * @swagger
 * /api/category/categories/{id}:
 *   put:
 *     summary: Update a category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               subcategories:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *     responses:
 *       200:
 *         description: Category updated
 *       400:
 *         description: Bad request
 *       404:
 *         description: Category not found
 */
router.put('/categories/:id', categoryController.updateCategory);

/**
 * @swagger
 * /api/category/categories/{id}:
 *   delete:
 *     summary: Delete a category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.delete('/categories/:id', categoryController.deleteCategory);

/**
 * @swagger
 * /api/category/categories/{id}/subcategories:
 *   post:
 *     summary: Add a subcategory to a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
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
 *         description: Subcategory added
 *       400:
 *         description: Bad request
 *       404:
 *         description: Category not found
 */
router.post('/categories/:id/subcategories', categoryController.addSubcategory);

/**
 * @swagger
 * /api/category/categories/{id}/subcategories/{subId}:
 *   put:
 *     summary: Update a subcategory by subcategory ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *       - in: path
 *         name: subId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subcategory ID
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
 *         description: Subcategory updated
 *       400:
 *         description: Bad request
 *       404:
 *         description: Category or subcategory not found
 */
router.put('/categories/:id/subcategories/:subId', categoryController.updateSubcategory);

/**
 * @swagger
 * /api/category/categories/{id}/subcategories/{subId}:
 *   delete:
 *     summary: Delete a subcategory by subcategory ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *       - in: path
 *         name: subId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subcategory ID
 *     responses:
 *       200:
 *         description: Subcategory deleted
 *       400:
 *         description: Bad request
 *       404:
 *         description: Category or subcategory not found
 */
router.delete('/categories/:id/subcategories/:subId', categoryController.deleteSubcategory);

export default router;
