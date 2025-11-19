import mongoose from 'mongoose';

// Order Item Schema - similar to quotation items
const orderItemSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
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
    product_category: String,
    product_subcategory: String,
    product_color: String,
    product_series: String,
    product_image: String,
    mrp: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    discount: {
        type: Number,
        default: 0
    },
    discount_type: {
        type: String,
        enum: ['percentage', 'fixed', 'minSaleDiscount', 'maxSaleDiscount'],
        default: 'percentage'
    },
    net_rate: {
        type: Number,
        required: true
    },
    total_amount: {
        type: Number,
        required: true
    },
    gst_percentage: {
        type: Number,
        default: 0
    },
    gst_paid: {
        type: Boolean,
        default: false
    },
    // Inventory tracking fields
    dispatched_quantity: {
        type: Number,
        default: 0,
        min: 0
    },
    balance_quantity: {
        type: Number,
        default: function() {
            return this.quantity;
        }
    },
    available_quantity: {
        type: Number,
        default: 0
    },
    availability_status: {
        type: String,
        enum: ['available', 'partial', 'non-available'],
        default: 'non-available'
    }
});

// Order Group Schema
const orderGroupSchema = new mongoose.Schema({
    group_id: {
        type: String,
        required: true
    },
    group_name: {
        type: String,
        required: true
    },
    group_category: {
        type: String,
        enum: ['Master Bathroom', 'Guest Bathroom', 'Kitchen Faucet', 'Living Room', 'Bedroom', 'Other'],
        default: 'Other'
    },
    items: [orderItemSchema],
    subtotal: {
        type: Number,
        default: 0
    },
    total_discount: {
        type: Number,
        default: 0
    },
    total_amount: {
        type: Number,
        default: 0
    }
});

// Main Order Schema
const orderSchema = new mongoose.Schema({
    order_no: {
        type: String,
        unique: true
    },
    order_date: {
        type: Date,
        default: Date.now
    },
    expected_delivery_date: {
        type: Date
    },
    
    // Reference to Quotation
    quotation_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quotation'
    },
    quotation_no: String,
    
    // Company Information
    company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    company_name: String,
    company_address: String,
    company_gst: String,
    
    // Party Information
    party_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Party',
        required: true
    },
    party_name: {
        type: String,
        required: true
    },
    party_billing_name: String,
    party_address: String,
    party_city: String,
    party_state: String,
    party_gst: String,
    party_contact_person: String,
    party_mobile: String,
    party_email: String,
    
    // Site Information (Optional)
    site_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site'
    },
    site_name: String,
    site_address: String,
    site_contact_person: String,
    site_mobile: String,
    
    // Order Items
    groups: [orderGroupSchema],
    
    // Financial Details
    grand_total: {
        type: Number,
        required: true,
        default: 0
    },
    freight_charges: {
        type: Number,
        default: 0
    },
    net_amount_before_tax: {
        type: Number,
        default: 0
    },
    gst_amount: {
        type: Number,
        default: 0
    },
    gst_percentage: {
        type: Number,
        default: 18
    },
    net_amount_payable: {
        type: Number,
        required: true,
        default: 0
    },
    additional_discount: {
        type: Number,
        default: 0
    },
    roundoff_amount: {
        type: Number,
        default: 0
    },
    
    // Order Status
    status: {
        type: String,
        enum: ['pending', 'partially pending', 'completed', 'cancelled'],
        default: 'pending'
    },
    
    // Payment Information
    payment_status: {
        type: String,
        enum: ['pending', 'partial', 'paid', 'refunded'],
        default: 'pending'
    },
    payment_method: {
        type: String,
        enum: ['cash', 'card', 'upi', 'netbanking', 'cheque', 'other'],
        default: 'cash'
    },
    amount_paid: {
        type: Number,
        default: 0
    },
    balance_amount: {
        type: Number,
        default: 0
    },
    
    // Notes and Instructions
    notes: String,
    internal_notes: String,
    
    // Tracking
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    created_by_name: String,
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updated_by_name: String
}, {
    timestamps: true
});

// Index for faster queries
orderSchema.index({ order_no: 1 });
orderSchema.index({ order_date: -1 });
orderSchema.index({ company_id: 1, party_id: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ payment_status: 1 });

// Auto-generate order number
orderSchema.pre('save', async function(next) {
    if (!this.order_no) {
        const count = await mongoose.model('Order').countDocuments();
        const orderNumber = `ORD${String(count + 1).padStart(6, '0')}`;
        this.order_no = orderNumber;
    }
    next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
