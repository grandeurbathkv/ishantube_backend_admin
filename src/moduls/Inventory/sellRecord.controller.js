import SellRecord from "./sellRecord.model.js";
import { Product } from "./product.model.js";
import mongoose from "mongoose";

// Helper function to generate bill number
const generateBillNumber = async () => {
    const currentYear = new Date().getFullYear();
    const prefix = `BILL${currentYear}`;

    const lastRecord = await SellRecord.findOne({
        bill_number: { $regex: `^${prefix}` }
    }).sort({ bill_number: -1 });

    let nextNumber = 1;
    if (lastRecord) {
        const lastNumber = parseInt(lastRecord.bill_number.replace(prefix, ""));
        nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
};

// Create sell record
export const createSellRecord = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            bill_date,
            customer_name,
            customer_phone,
            customer_address,
            items,
            payment_status,
            payment_method,
            discount_amount,
            tax_amount,
            notes
        } = req.body;

        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Items are required",
            });
        }

        // Generate bill number
        const bill_number = await generateBillNumber();

        // Validate products and calculate amounts
        let total_amount = 0;
        const processedItems = [];

        for (const item of items) {
            const product = await Product.findById(item.product_id).session(session);
            if (!product) {
                throw new Error(`Product not found: ${item.product_id}`);
            }

            // Check stock availability
            if (product.Product_Fresh_Stock < item.quantity) {
                throw new Error(`Insufficient stock for ${product.Product_Description}. Available: ${product.Product_Fresh_Stock}, Required: ${item.quantity}`);
            }

            const amount = item.quantity * item.rate;
            total_amount += amount;

            processedItems.push({
                product_id: product._id,
                product_name: item.product_name || product.Product_Description,
                product_code: item.product_code || product.Product_code,
                quantity: item.quantity,
                rate: item.rate,
                amount: amount,
            });

            // Update product stock (Product_Fresh_Stock - sell quantity)
            await Product.findByIdAndUpdate(
                product._id,
                {
                    $inc: {
                        Product_Fresh_Stock: -item.quantity,
                        Product_Total_Sold: item.quantity,
                    },
                },
                { session }
            );
        }

        // Apply discount and tax
        const discount = discount_amount || 0;
        const tax = tax_amount || 0;
        const final_amount = total_amount - discount + tax;

        // Create sell record
        const sellRecord = new SellRecord({
            bill_number,
            bill_date: new Date(bill_date),
            bill_amount: final_amount,
            customer_name,
            customer_phone,
            customer_address,
            items: processedItems,
            payment_status: payment_status || "pending",
            payment_method: payment_method || "cash",
            discount_amount: discount,
            tax_amount: tax,
            notes,
            created_by: req.user.id,
        });

        await sellRecord.save({ session });
        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: "Sell record created successfully",
            data: {
                sellRecord,
            },
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Error creating sell record:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create sell record",
        });
    } finally {
        session.endSession();
    }
};

// Get all sell records with pagination
export const getSellRecords = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            status,
            payment_status,
            start_date,
            end_date,
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build filter
        const filter = {};

        if (search) {
            filter.$or = [
                { bill_number: { $regex: search, $options: "i" } },
                { customer_name: { $regex: search, $options: "i" } },
                { customer_phone: { $regex: search, $options: "i" } },
            ];
        }

        if (status) {
            filter.status = status;
        }

        if (payment_status) {
            filter.payment_status = payment_status;
        }

        if (start_date && end_date) {
            filter.bill_date = {
                $gte: new Date(start_date),
                $lte: new Date(end_date),
            };
        }

        const sellRecords = await SellRecord.find(filter)
            .populate("created_by", "name email")
            .populate("items.product_id", "product_name product_code")
            .sort({ bill_date: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalRecords = await SellRecord.countDocuments(filter);
        const totalPages = Math.ceil(totalRecords / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                sellRecords,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalRecords,
                    hasNext: parseInt(page) < totalPages,
                    hasPrev: parseInt(page) > 1,
                },
            },
        });

    } catch (error) {
        console.error("Error fetching sell records:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch sell records",
        });
    }
};

// Get single sell record
export const getSellRecord = async (req, res) => {
    try {
        const { id } = req.params;

        const sellRecord = await SellRecord.findById(id)
            .populate("created_by", "name email")
            .populate("items.product_id", "product_name product_code brand_name");

        if (!sellRecord) {
            return res.status(404).json({
                success: false,
                message: "Sell record not found",
            });
        }

        res.status(200).json({
            success: true,
            data: {
                sellRecord,
            },
        });

    } catch (error) {
        console.error("Error fetching sell record:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch sell record",
        });
    }
};

// Update sell record status
export const updateSellRecordStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, payment_status } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (payment_status) updateData.payment_status = payment_status;

        const sellRecord = await SellRecord.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!sellRecord) {
            return res.status(404).json({
                success: false,
                message: "Sell record not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Sell record updated successfully",
            data: {
                sellRecord,
            },
        });

    } catch (error) {
        console.error("Error updating sell record:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update sell record",
        });
    }
};

// Get sell summary
export const getSellSummary = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        const matchStage = {};
        if (start_date && end_date) {
            matchStage.bill_date = {
                $gte: new Date(start_date),
                $lte: new Date(end_date),
            };
        }

        const summary = await SellRecord.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$bill_amount" },
                    totalOrders: { $sum: 1 },
                    averageOrderValue: { $avg: "$bill_amount" },
                    totalDiscount: { $sum: "$discount_amount" },
                    totalTax: { $sum: "$tax_amount" },
                },
            },
        ]);

        const statusSummary = await SellRecord.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    amount: { $sum: "$bill_amount" },
                },
            },
        ]);

        const paymentSummary = await SellRecord.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$payment_status",
                    count: { $sum: 1 },
                    amount: { $sum: "$bill_amount" },
                },
            },
        ]);

        res.status(200).json({
            success: true,
            data: {
                summary: summary[0] || {
                    totalSales: 0,
                    totalOrders: 0,
                    averageOrderValue: 0,
                    totalDiscount: 0,
                    totalTax: 0,
                },
                statusSummary,
                paymentSummary,
            },
        });

    } catch (error) {
        console.error("Error fetching sell summary:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch sell summary",
        });
    }
};