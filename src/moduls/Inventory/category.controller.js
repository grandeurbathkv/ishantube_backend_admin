/**
 * Category Controller
 * @module controllers/Category
 */
import Category from './category.model.js';

/**
 * Create a new category
 * @param {Request} req
 * @param {Response} res
 */
const createCategory = async (req, res) => {
	try {
		const { name, subcategories } = req.body;
		const category = new Category({ name, subcategories });
		await category.save();
		res.status(201).json(category);
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
};

/**
 * Get all categories
 * @param {Request} req
 * @param {Response} res
 */
const getCategories = async (req, res) => {
	try {
		const categories = await Category.find();
		res.json(categories);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

/**
 * Get a single category by ID
 * @param {Request} req
 * @param {Response} res
 */
const getCategoryById = async (req, res) => {
	try {
		const category = await Category.findById(req.params.id);
		if (!category) return res.status(404).json({ error: 'Category not found' });
		res.json(category);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

/**
 * Get subcategories by category ID
 * @param {Request} req
 * @param {Response} res
 */
const getSubcategoriesByCategory = async (req, res) => {
	try {
		const category = await Category.findById(req.params.id);
		if (!category) return res.status(404).json({ error: 'Category not found' });
		res.json(category.subcategories);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

/**
 * Update a category by ID
 * @param {Request} req
 * @param {Response} res
 */
const updateCategory = async (req, res) => {
	try {
		const { name, subcategories } = req.body;
		const category = await Category.findByIdAndUpdate(
			req.params.id,
			{ name, subcategories },
			{ new: true }
		);
		if (!category) return res.status(404).json({ error: 'Category not found' });
		res.json(category);
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
};

/**
 * Delete a category by ID
 * @param {Request} req
 * @param {Response} res
 */
const deleteCategory = async (req, res) => {
	try {
		const category = await Category.findByIdAndDelete(req.params.id);
		if (!category) return res.status(404).json({ error: 'Category not found' });
		res.json({ message: 'Category deleted' });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

/**
 * Add a subcategory to a category
 * @param {Request} req
 * @param {Response} res
 */
const addSubcategory = async (req, res) => {
	try {
		const { name } = req.body;
		const category = await Category.findById(req.params.id);
		if (!category) return res.status(404).json({ error: 'Category not found' });
		category.subcategories.push({ name });
		await category.save();
		res.json(category);
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
};

/**
 * Update a subcategory by subcategory ID
 * @param {Request} req
 * @param {Response} res
 */
const updateSubcategory = async (req, res) => {
	try {
		const { name } = req.body;
		const category = await Category.findById(req.params.id);
		if (!category) return res.status(404).json({ error: 'Category not found' });
		const subcategory = category.subcategories.id(req.params.subId);
		if (!subcategory) return res.status(404).json({ error: 'Subcategory not found' });
		subcategory.name = name;
		await category.save();
		res.json(category);
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
};

/**
 * Delete a subcategory by subcategory ID
 * @param {Request} req
 * @param {Response} res
 */
const deleteSubcategory = async (req, res) => {
	try {
		const category = await Category.findById(req.params.id);
		if (!category) return res.status(404).json({ error: 'Category not found' });
		const subcategory = category.subcategories.id(req.params.subId);
		if (!subcategory) return res.status(404).json({ error: 'Subcategory not found' });
		subcategory.remove();
		await category.save();
		res.json(category);
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
};

/**
 * Add multiple subcategories to a category
 * @param {Request} req
 * @param {Response} res
 */
const addMultipleSubcategories = async (req, res) => {
	try {
		const { subcategories } = req.body;
		const category = await Category.findById(req.params.id);
		if (!category) return res.status(404).json({ error: 'Category not found' });
		if (!Array.isArray(subcategories) || subcategories.length === 0) {
			return res.status(400).json({ error: 'Subcategories must be a non-empty array' });
		}
		category.subcategories.push(...subcategories.map(sub => ({ name: sub.name })));
		await category.save();
		res.json(category);
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
};

export default {
	createCategory,
	getCategories,
	getCategoryById,
	getSubcategoriesByCategory,
	updateCategory,
	deleteCategory,
	addSubcategory,
	updateSubcategory,
	deleteSubcategory,
	addMultipleSubcategories
};
