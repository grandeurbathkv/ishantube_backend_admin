import mongoose from 'mongoose';

// Dispatch Item Schema
const dispatchItemSchema = new mongoose.Schema({
    group_name: {
        type: String,
        required: true
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    product_code: {
        type: String,
        required: true
    },
    product_name: {
        type: String,
        required: true
    },
    product_description: String,
    product_brand: String,
    quantity: {
        type: Number,
        required: true
    },
    net_rate: Number,
    total_amount: Number
});

// Dispatch Note Schema
const dispatchSchema = new mongoose.Schema({
    dispatch_no: {
        type: String,
        unique: true
    },
    dispatch_date: {
        type: Date,
        required: true
    },
    
    // Order Reference
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    order_no: {
        type: String,
        required: true
    },
    
    // Company & Party Info
    company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company'
    },
    company_name: String,
    party_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Party'
    },
    party_name: String,
    party_billing_name: String,
    party_address: String,
    site_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site'
    },
    site_name: String,
    site_address: String,
    
    // Dispatch Items
    items: [dispatchItemSchema],
    
    // Dispatch Details
    notes: {
        type: String,
        required: true
    },
    vehicle_number: String,
    driver_name: String,
    driver_mobile: String,
    
    // Status
    status: {
        type: String,
        enum: ['pending', 'in-transit', 'delivered', 'cancelled'],
        default: 'pending'
    },
    
    // Tracking
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    created_by_name: String
}, {
    timestamps: true
});

// Auto-generate dispatch number
dispatchSchema.pre('save', async function(next) {
    if (!this.dispatch_no) {
        const count = await mongoose.model('Dispatch').countDocuments();
        const dispatchNumber = `DN${String(count + 1).padStart(6, '0')}`;
        this.dispatch_no = dispatchNumber;
    }
    next();
});

// Indexes
dispatchSchema.index({ dispatch_no: 1 });
dispatchSchema.index({ dispatch_date: -1 });
dispatchSchema.index({ order_id: 1 });
dispatchSchema.index({ status: 1 });

const Dispatch = mongoose.model('Dispatch', dispatchSchema);

export default Dispatch;
