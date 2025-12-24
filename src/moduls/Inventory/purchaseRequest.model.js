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
    // Material Received Details
    material_received: {
        type: Boolean,
        default: false
    },
    material_received_date: {
        type: Date
    },
    vendor_invoice_number: {
        type: String,
        trim: true
    },
    invoice_date: {
        type: Date
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
        // Material Received quantities
        fresh_stock_received: {
            type: Number,
            default: 0
        },
        damaged_stock_received: {
            type: Number,
            default: 0
        },
        short_qty_received: {
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

// Add indexes for better performance
purchaseRequestSchema.index({ PR_Number: 1 }, { unique: true });
purchaseRequestSchema.index({ created_by: 1 });
purchaseRequestSchema.index({ status: 1 });
purchaseRequestSchema.index({ PR_Date: -1 });

// Generate unique PR Number before saving
purchaseRequestSchema.pre('save', async function (next) {
    try {
        if (this.isNew && !this.PR_Number) {
            let prNumber;
            let attempts = 0;
            const maxAttempts = 10;

            while (attempts < maxAttempts) {
                // Get the last PR by sorting in descending order
                const lastPR = await this.constructor
                    .findOne({})
                    .sort({ PR_Number: -1 })
                    .select('PR_Number')
                    .lean();

                let nextNumber = 1;

                if (lastPR && lastPR.PR_Number) {
                    // Extract the numeric part from PR_Number (e.g., "PR000004" -> 4)
                    const currentNumber = parseInt(lastPR.PR_Number.replace('PR', ''));
                    nextNumber = currentNumber + 1;
                    console.log('🔷 Last PR_Number:', lastPR.PR_Number, '| Next Number:', nextNumber);
                }

                // Generate new PR_Number with leading zeros
                prNumber = `PR${String(nextNumber).padStart(6, '0')}`;

                // Check if this PR_Number already exists
                const existingPR = await this.constructor.findOne({ PR_Number: prNumber });

                if (!existingPR) {
                    // PR_Number is unique, use it
                    this.PR_Number = prNumber;
                    console.log('✅ Generated unique PR_Number:', prNumber, `(attempt ${attempts + 1})`);
                    break;
                } else {
                    console.log('⚠️ PR_Number', prNumber, 'already exists, retrying...', `(attempt ${attempts + 1})`);
                    attempts++;
                }
            }

            if (attempts >= maxAttempts) {
                throw new Error('Failed to generate unique PR_Number after ' + maxAttempts + ' attempts');
            }
        }
        next();
    } catch (error) {
        console.error('❌ Error generating PR_Number:', error);
        next(error);
    }
});

const PurchaseRequest = mongoose.model('PurchaseRequest', purchaseRequestSchema);

export default PurchaseRequest;
