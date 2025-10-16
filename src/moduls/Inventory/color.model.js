import mongoose from 'mongoose';

/**
 * Color Schema
 * @typedef {Object} Color
 * @property {string} name - Name of the color
 */
const colorSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true
	}
});

const Color = mongoose.model('Color', colorSchema);
export default Color;