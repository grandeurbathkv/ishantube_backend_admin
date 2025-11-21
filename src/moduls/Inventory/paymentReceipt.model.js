import mongoose from 'mongoose';

// Payment Receipt Schema
const paymentReceiptSchema = new mongoose.Schema({
    receipt_no: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    receipt_date: {
        type: Date,
        required: true,
        default: Date.now
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
    company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company'
    },
    company_name: {
        type: String
    },
    party_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Party'
    },
    party_name: {
        type: String
    },
    amount_received: {
        type: Number,
        required: true,
        min: 0
    },
    payment_mode: {
        type: String,
        required: true,
        enum: ['Cash', 'Cheque', 'Online Transfer', 'UPI', 'Card', 'NEFT/RTGS', 'Other']
    },
    bank_name: {
        type: String,
        trim: true
    },
    transaction_reference: {
        type: String,
        trim: true
    },
    cheque_number: {
        type: String,
        trim: true
    },
    cheque_date: {
        type: Date
    },
    remarks: {
        type: String,
        trim: true
    },
    order_total: {
        type: Number,
        default: 0
    },
    amount_paid_before: {
        type: Number,
        default: 0
    },
    balance_before: {
        type: Number,
        default: 0
    },
    balance_after: {
        type: Number,
        default: 0
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    created_by_name: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'cleared', 'bounced', 'cancelled'],
        default: 'cleared'
    }
}, {
    timestamps: true
});

// Generate receipt number
paymentReceiptSchema.pre('save', async function(next) {
    if (this.isNew && !this.receipt_no) {
        const count = await mongoose.model('PaymentReceipt').countDocuments();
        const receiptNumber = `RCP${String(count + 1).padStart(6, '0')}`;
        this.receipt_no = receiptNumber;
    }
    next();
});

// Index for faster queries
paymentReceiptSchema.index({ receipt_no: 1 });
paymentReceiptSchema.index({ order_id: 1 });
paymentReceiptSchema.index({ receipt_date: -1 });
paymentReceiptSchema.index({ company_id: 1 });
paymentReceiptSchema.index({ party_id: 1 });

const PaymentReceipt = mongoose.model('PaymentReceipt', paymentReceiptSchema);

export default PaymentReceipt;
