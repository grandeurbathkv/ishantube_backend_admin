import mongoose from 'mongoose';

const quotationItemSchema = new mongoose.Schema({
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
    minimum_sale: Number,
    maximum_sale: Number,
    schema_enabled: {
        type: Boolean,
        default: false
    }
});

const quotationGroupSchema = new mongoose.Schema({
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
    items: [quotationItemSchema],
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

const quotationSchema = new mongoose.Schema({
    quotation_no: {
        type: String,
        required: true,
        unique: true
    },
    quotation_date: {
        type: Date,
        default: Date.now
    },
    valid_until: {
        type: Date,
        default: function() {
            const date = new Date();
            date.setDate(date.getDate() + 30);
            return date;
        }
    },
    status: {
        type: String,
        enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
        default: 'draft'
    },
    
    // Company Information
    company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    company_name: String,
    company_address: String,
    company_gst: String,
    company_contact: String,
    
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
    
    // Groups and Items
    groups: [quotationGroupSchema],
    
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
    
    // Additional Charges/Discounts
    additional_discount: {
        type: Number,
        default: 0
    },
    coupon_discount: {
        type: Number,
        default: 0
    },
    roundoff_amount: {
        type: Number,
        default: 0
    },
    
    // Terms and Conditions
    payment_terms: {
        type: String,
        default: '30 days from invoice date'
    },
    delivery_terms: {
        type: String,
        default: '7-10 working days from order confirmation'
    },
    notes: String,
    
    // Order Reference
    order_id: String,
    
    // User tracking
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
    
    // Quotation sent details
    sent_at: Date,
    sent_via: {
        type: String,
        enum: ['email', 'whatsapp', 'print', 'manual'],
    },
    
    // Response tracking
    responded_at: Date,
    response_notes: String
}, {
    timestamps: true
});

// Generate unique quotation number
quotationSchema.pre('save', async function(next) {
    if (!this.quotation_no) {
        const prefix = 'QS';
        const timestamp = Date.now().toString().slice(-6);
        const year = String(new Date().getFullYear()).slice(-2);
        this.quotation_no = `${prefix}-${timestamp}/${year}`;
    }
    next();
});

// Virtual for total items count
quotationSchema.virtual('total_items').get(function() {
    return this.groups.reduce((total, group) => total + group.items.length, 0);
});

// Virtual for total quantity
quotationSchema.virtual('total_quantity').get(function() {
    return this.groups.reduce((total, group) => {
        return total + group.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);
});

// Ensure virtuals are included in JSON output
quotationSchema.set('toJSON', { virtuals: true });
quotationSchema.set('toObject', { virtuals: true });

// Indexes for better query performance
quotationSchema.index({ quotation_no: 1 });
quotationSchema.index({ quotation_date: -1 });
quotationSchema.index({ party_id: 1 });
quotationSchema.index({ company_id: 1 });
quotationSchema.index({ status: 1 });
quotationSchema.index({ created_by: 1 });

const Quotation = mongoose.model('Quotation', quotationSchema);

export default Quotation;
