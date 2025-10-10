
/**
 * Category Schema
 * @module models/Category
 */
import mongoose from 'mongoose';

/**
 * Subcategory Schema
 * @typedef {Object} Subcategory
 * @property {string} name - Name of the subcategory
 */
const subcategorySchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true
	}
});

/**
 * Category Schema
 * @typedef {Object} Category
 * @property {string} name - Name of the category
 * @property {Subcategory[]} subcategories - List of subcategories
 */
const categorySchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	subcategories: [subcategorySchema]
});

const Category = mongoose.model('Category', categorySchema);
export default Category;
