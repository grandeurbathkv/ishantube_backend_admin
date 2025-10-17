import Series from './series.model.js';

/**
 * Create a new series
 * @param {Request} req
 * @param {Response} res
 */
const createSeries = async (req, res) => {
    try {
        const { name } = req.body;
        const series = new Series({ name });
        await series.save();
        res.status(201).json(series);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Get all series
 * @param {Request} req
 * @param {Response} res
 */
const getAllSeries = async (req, res) => {
    try {
        const series = await Series.find();
        res.json(series);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export default {
    createSeries,
    getAllSeries
};
