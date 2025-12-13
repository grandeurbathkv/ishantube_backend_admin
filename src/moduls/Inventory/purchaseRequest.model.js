import mongoose from 'mongoose';

const purchaseRequestSchema = new mongoose.Schema({
    PR_Number: {
        type: String,
        unique: true,
        trim: true
    },
    PR_Date: {
        type: Date,
        required: true,
        default: Date.now
    },
    PR_Vendor: {
        type: String,
        required: true,
        trim: true
    },
    PI_Received: {
        type: Boolean,
        default: false
    },
    // PI (Purchase Invoice) Details
    pi_number: {
        type: String,
        trim: true
    },
    pi_date: {
        type: Date
    },
    pi_amount: {
        type: Number,
        default: 0
    },
    // Payment Details
    payment_done: {
        type: Boolean,
        default: false
    },
    payment_amount: {
        type: Number,
        default: 0
    },
    payment_utr: {
        type: String,
        trim: true
    },
    payment_mode: {
        type: String,
        enum: ['', 'cheque', 'rtgs', 'neft', 'imps', 'cash', 'upi'],
        default: ''
    },
    payment_reference: {
        type: String,
        trim: true
    },
    payment_bank: {
        type: String,
        trim: true
    },
    payment_date: {
        type: Date
    },
    payment_remarks: {
        type: String,
        trim: true
    },
    items: [{
        item_id: {
            type: String,
            required: true
        },
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true
        },
        order_no: {
            type: String,
            required: true
        },
        party_name: String,
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        product_code: String,
        product_name: String,
        product_description: String,
        brand: String,
        quantity: {
            type: Number,
            default: 0
        },
        consolidated_quantity: {
            type: Number,
            default: 0
        },
        fresh_stock: {
            type: Number,
            default: 0
        },
        unavailable_quantity: {
            type: Number,
            default: 0
        },
        // PI received quantity for this item
        pi_received_quantity: {
            type: Number,
            default: 0
        },
        availability_status: {
            type: String,
            enum: ['available', 'partial', 'unavailable'],
            default: 'unavailable'
        },
        price: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            default: 0
        }
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'awaiting_payment', 'awaiting_dispatch', 'intrasite', 'partial_payment'],
        default: 'pending'
    },
    remarks: {
        type: String,
        trim: true
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    created_by_name: {
        type: String
    },
    approved_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approved_date: {
        type: Date
    }
}, {
    timestamps: true
});

// Generate unique PR Number before saving
purchaseRequestSchema.pre('save', async function(next) {
    try {
        if (this.isNew && !this.PR_Number) {
            const count = await this.constructor.countDocuments();
            const prNumber = `PR${String(count + 1).padStart(6, '0')}`;
            this.PR_Number = prNumber;
            console.log('✅ Generated PR_Number:', prNumber);
        }
        next();
    } catch (error) {
        console.error('❌ Error generating PR_Number:', error);
        next(error);
    }
});

const PurchaseRequest = mongoose.model('PurchaseRequest', purchaseRequestSchema);

export default PurchaseRequest;
