import mongoose from "mongoose";

const sellRecordItemSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    product_name: {
        type: String,
        required: false,
    },
    product_code: {
        type: String,
        required: false,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    rate: {
        type: Number,
        required: true,
        min: 0,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
});

const sellRecordSchema = new mongoose.Schema(
    {
        bill_number: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        bill_date: {
            type: Date,
            required: true,
        },
        bill_amount: {
            type: Number,
            required: true,
            min: 0,
        },
        customer_name: {
            type: String,
            trim: true,
        },
        customer_phone: {
            type: String,
            trim: true,
        },
        customer_address: {
            type: String,
            trim: true,
        },
        items: [sellRecordItemSchema],
        status: {
            type: String,
            enum: ["pending", "completed", "cancelled"],
            default: "completed",
        },
        payment_status: {
            type: String,
            enum: ["pending", "partial", "paid"],
            default: "pending",
        },
        payment_method: {
            type: String,
            enum: ["cash", "card", "upi", "bank_transfer", "cheque"],
            default: "cash",
        },
        discount_amount: {
            type: Number,
            default: 0,
            min: 0,
        },
        tax_amount: {
            type: Number,
            default: 0,
            min: 0,
        },
        notes: {
            type: String,
            trim: true,
        },
        // Transport Details
        mode_of_transport: {
            type: String,
            trim: true,
        },
        vehicle_number: {
            type: String,
            trim: true,
        },
        freight_remarks: {
            type: String,
            trim: true,
        },
        transport_incharge_number: {
            type: String,
            trim: true,
        },
        // Dispatch Reference
        dispatch_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Dispatch",
        },
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

// Index for faster queries
sellRecordSchema.index({ bill_number: 1 });
sellRecordSchema.index({ bill_date: -1 });
sellRecordSchema.index({ created_by: 1 });
sellRecordSchema.index({ status: 1 });

export default mongoose.model("SellRecord", sellRecordSchema);