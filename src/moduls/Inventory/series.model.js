import mongoose from 'mongoose';

/**
 * Series Schema
 * @typedef {Object} Series
 * @property {string} name - Name of the series
 */
const seriesSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    }
});

const Series = mongoose.model('Series', seriesSchema);
export default Series;
