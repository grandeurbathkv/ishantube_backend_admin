import Color from './color.model.js';

/**
 * Create a new color
 * @param {Request} req
 * @param {Response} res
 */
const createColor = async (req, res) => {
	try {
		const { name } = req.body;
		const color = new Color({ name });
		await color.save();
		res.status(201).json(color);
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
};

/**
 * Get all colors
 * @param {Request} req
 * @param {Response} res
 */
const getColors = async (req, res) => {
	try {
		const colors = await Color.find();
		res.json(colors);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

/**
 * Get a color by ID
 * @param {Request} req
 * @param {Response} res
 */
const getColorById = async (req, res) => {
	try {
		const color = await Color.findById(req.params.id);
		if (!color) return res.status(404).json({ error: 'Color not found' });
		res.json(color);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

/**
 * Update a color by ID
 * @param {Request} req
 * @param {Response} res
 */
const updateColor = async (req, res) => {
	try {
		const { name } = req.body;
		const color = await Color.findByIdAndUpdate(req.params.id, { name }, { new: true });
		if (!color) return res.status(404).json({ error: 'Color not found' });
		res.json(color);
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
};

/**
 * Delete a color by ID
 * @param {Request} req
 * @param {Response} res
 */
const deleteColor = async (req, res) => {
	try {
		const color = await Color.findByIdAndDelete(req.params.id);
		if (!color) return res.status(404).json({ error: 'Color not found' });
		res.json({ message: 'Color deleted' });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

export default {
	createColor,
	getColors,
	getColorById,
	updateColor,
	deleteColor
};