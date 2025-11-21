import PaymentReceipt from './paymentReceipt.model.js';
import Order from './order.model.js';

// Create payment receipt
export const createPaymentReceipt = async (req, res) => {
    try {
        const {
            receipt_date,
            order_id,
            amount_received,
            payment_mode,
            bank_name,
            transaction_reference,
            cheque_number,
            cheque_date,
            remarks,
            status
        } = req.body;

        // Validate required fields
        if (!order_id || !amount_received || !payment_mode) {
            return res.status(400).json({
                success: false,
                message: 'Order ID, amount received, and payment mode are required'
            });
        }

        // Get order details
        const order = await Order.findById(order_id)
            .populate('company_id', 'Company_Name')
            .populate('party_id', 'Party_Name');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Calculate payment details
        const orderTotal = order.net_amount_payable || order.grand_total;
        const amountPaidBefore = order.amount_paid || 0;
        const balanceBefore = orderTotal - amountPaidBefore;

        // Validate amount
        if (amount_received > balanceBefore) {
            return res.status(400).json({
                success: false,
                message: `Amount received (₹${amount_received}) cannot exceed balance amount (₹${balanceBefore})`
            });
        }

        const balanceAfter = balanceBefore - amount_received;

        // Generate receipt number
        const count = await PaymentReceipt.countDocuments();
        const receiptNo = `RCP${String(count + 1).padStart(6, '0')}`;

        // Create payment receipt
        const paymentReceipt = new PaymentReceipt({
            receipt_no: receiptNo,
            receipt_date: receipt_date || new Date(),
            order_id: order._id,
            order_no: order.order_no,
            company_id: order.company_id?._id,
            company_name: order.company_id?.Company_Name || order.company_name,
            party_id: order.party_id?._id,
            party_name: order.party_id?.Party_Name || order.party_name,
            amount_received,
            payment_mode,
            bank_name,
            transaction_reference,
            cheque_number,
            cheque_date,
            remarks,
            order_total: orderTotal,
            amount_paid_before: amountPaidBefore,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            created_by: req.user?._id,
            created_by_name: req.user?.name || req.user?.User_Name,
            status: status || 'cleared'
        });

        await paymentReceipt.save();

        // Update order payment details
        order.amount_paid = (order.amount_paid || 0) + amount_received;
        order.balance_amount = orderTotal - order.amount_paid;
        
        // Update payment status
        if (order.balance_amount <= 0) {
            order.payment_status = 'paid';
        } else if (order.amount_paid > 0) {
            order.payment_status = 'partial';
        }

        await order.save();

        res.status(201).json({
            success: true,
            message: 'Payment receipt created successfully',
            data: paymentReceipt
        });

    } catch (error) {
        console.error('Error creating payment receipt:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment receipt',
            error: error.message
        });
    }
};

// Get all payment receipts with pagination and filters
export const getAllPaymentReceipts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            payment_mode,
            status,
            company_id,
            party_id,
            from_date,
            to_date
        } = req.query;

        const query = {};

        // Search filter
        if (search) {
            query.$or = [
                { receipt_no: { $regex: search, $options: 'i' } },
                { order_no: { $regex: search, $options: 'i' } },
                { party_name: { $regex: search, $options: 'i' } },
                { company_name: { $regex: search, $options: 'i' } }
            ];
        }

        // Payment mode filter
        if (payment_mode) {
            query.payment_mode = payment_mode;
        }

        // Status filter
        if (status) {
            query.status = status;
        }

        // Company filter
        if (company_id) {
            query.company_id = company_id;
        }

        // Party filter
        if (party_id) {
            query.party_id = party_id;
        }

        // Date range filter
        if (from_date || to_date) {
            query.receipt_date = {};
            if (from_date) {
                query.receipt_date.$gte = new Date(from_date);
            }
            if (to_date) {
                query.receipt_date.$lte = new Date(to_date);
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const receipts = await PaymentReceipt.find(query)
            .populate('order_id', 'order_no order_date status')
            .populate('company_id', 'Company_Name')
            .populate('party_id', 'Party_Name')
            .populate('created_by', 'User_Name name')
            .sort({ receipt_date: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalRecords = await PaymentReceipt.countDocuments(query);

        res.status(200).json({
            success: true,
            message: 'Payment receipts retrieved successfully',
            data: receipts,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalRecords / parseInt(limit)),
                totalRecords,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error fetching payment receipts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment receipts',
            error: error.message
        });
    }
};

// Get payment receipt by ID
export const getPaymentReceiptById = async (req, res) => {
    try {
        const { id } = req.params;

        const receipt = await PaymentReceipt.findById(id)
            .populate('order_id')
            .populate('company_id', 'Company_Name')
            .populate('party_id', 'Party_Name Party_Mobile Party_Email')
            .populate('created_by', 'User_Name name');

        if (!receipt) {
            return res.status(404).json({
                success: false,
                message: 'Payment receipt not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Payment receipt retrieved successfully',
            data: receipt
        });

    } catch (error) {
        console.error('Error fetching payment receipt:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment receipt',
            error: error.message
        });
    }
};

// Get payment receipts by order ID
export const getPaymentReceiptsByOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const receipts = await PaymentReceipt.find({ order_id: orderId })
            .populate('created_by', 'User_Name name')
            .sort({ receipt_date: -1 });

        res.status(200).json({
            success: true,
            message: 'Payment receipts retrieved successfully',
            data: receipts
        });

    } catch (error) {
        console.error('Error fetching payment receipts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment receipts',
            error: error.message
        });
    }
};

// Update payment receipt
export const updatePaymentReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const receipt = await PaymentReceipt.findById(id);
        if (!receipt) {
            return res.status(404).json({
                success: false,
                message: 'Payment receipt not found'
            });
        }

        // Don't allow updating critical fields
        delete updateData.receipt_no;
        delete updateData.order_id;
        delete updateData.amount_received;

        const updatedReceipt = await PaymentReceipt.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Payment receipt updated successfully',
            data: updatedReceipt
        });

    } catch (error) {
        console.error('Error updating payment receipt:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment receipt',
            error: error.message
        });
    }
};

// Delete payment receipt
export const deletePaymentReceipt = async (req, res) => {
    try {
        const { id } = req.params;

        const receipt = await PaymentReceipt.findById(id);
        if (!receipt) {
            return res.status(404).json({
                success: false,
                message: 'Payment receipt not found'
            });
        }

        // Update order payment details when deleting receipt
        const order = await Order.findById(receipt.order_id);
        if (order) {
            order.amount_paid = (order.amount_paid || 0) - receipt.amount_received;
            order.balance_amount = order.net_amount_payable - order.amount_paid;
            
            // Update payment status
            if (order.amount_paid <= 0) {
                order.payment_status = 'pending';
            } else if (order.balance_amount > 0) {
                order.payment_status = 'partial';
            }

            await order.save();
        }

        await PaymentReceipt.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Payment receipt deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting payment receipt:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete payment receipt',
            error: error.message
        });
    }
};

// Get payment summary statistics
export const getPaymentSummary = async (req, res) => {
    try {
        const { from_date, to_date, company_id, party_id } = req.query;

        const query = {};

        if (from_date || to_date) {
            query.receipt_date = {};
            if (from_date) query.receipt_date.$gte = new Date(from_date);
            if (to_date) query.receipt_date.$lte = new Date(to_date);
        }

        if (company_id) query.company_id = company_id;
        if (party_id) query.party_id = party_id;

        const summary = await PaymentReceipt.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount_received' },
                    totalReceipts: { $sum: 1 },
                    cashAmount: {
                        $sum: {
                            $cond: [{ $eq: ['$payment_mode', 'Cash'] }, '$amount_received', 0]
                        }
                    },
                    onlineAmount: {
                        $sum: {
                            $cond: [{ $in: ['$payment_mode', ['Online Transfer', 'UPI', 'NEFT/RTGS']] }, '$amount_received', 0]
                        }
                    },
                    chequeAmount: {
                        $sum: {
                            $cond: [{ $eq: ['$payment_mode', 'Cheque'] }, '$amount_received', 0]
                        }
                    }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: 'Payment summary retrieved successfully',
            data: summary[0] || {
                totalAmount: 0,
                totalReceipts: 0,
                cashAmount: 0,
                onlineAmount: 0,
                chequeAmount: 0
            }
        });

    } catch (error) {
        console.error('Error fetching payment summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment summary',
            error: error.message
        });
    }
};
