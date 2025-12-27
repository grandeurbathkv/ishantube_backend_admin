// Record Dispatch Details and update status
export const recordDispatch = async (req, res) => {
    try {
        console.log('\n');
        console.log('========================================');
        console.log('🟢 BACKEND DISPATCH Step 1: Record Dispatch API called');
        console.log('========================================');

        const { id } = req.params;
        console.log('🟢 BACKEND Step 2: Order ID from params:', id);
        console.log('🟢 BACKEND Step 3: Order ID type:', typeof id);
        console.log('🟢 BACKEND Step 4: Order ID length:', id?.length);

        const userId = req.user?._id || req.user?.id;
        const userName = req.user?.User_Name || 'Unknown User';
        console.log('🟢 BACKEND Step 5: User ID:', userId);
        console.log('🟢 BACKEND Step 6: User Name:', userName);
        console.log('🟢 BACKEND Step 7: Full req.user:', req.user);

        console.log('🟢 BACKEND Step 8: Searching for Order in database...');
        const order = await Order.findById(id);
        console.log('🟢 BACKEND Step 9: Order found:', !!order);

        if (!order) {
            console.log('🔴 BACKEND ERROR: Order not found in database');
            console.log('🔴 Searched for ID:', id);
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        console.log('🟢 BACKEND Step 10: Order details:');
        console.log('   - Order No:', order.order_no);
        console.log('   - Order Date:', order.order_date);
        console.log('   - Party Name:', order.party_name);
        console.log('   - Current Status:', order.status);
        console.log('   - Status Type:', typeof order.status);
        console.log('   - Full Order Object:', JSON.stringify(order, null, 2));

        // Only allow if current status is 'awaiting_dispatch'
        console.log('🟢 BACKEND Step 11: Checking if status is awaiting_dispatch');
        console.log('🟢 BACKEND Step 12: order.status === "awaiting_dispatch":', order.status === 'awaiting_dispatch');
        console.log('🟢 BACKEND Step 13: Comparison details:');
        console.log('   - order.status:', `"${order.status}"`);
        console.log('   - Expected:', `"awaiting_dispatch"`);
        console.log('   - Match:', order.status === 'awaiting_dispatch');

        if (order.status !== 'awaiting_dispatch') {
            console.log('🔴 BACKEND ERROR: Order is not in awaiting_dispatch status');
            console.log('🔴 Current status:', order.status);
            console.log('🔴 Required status: awaiting_dispatch');
            return res.status(400).json({
                success: false,
                message: `Order is not in awaiting_dispatch status. Current status: ${order.status}`
            });
        }

        // Log incoming dispatch details
        console.log('🟢 BACKEND Step 14: Dispatch details from request body:', req.body);
        console.log('🟢 BACKEND Step 15: vendor_bill_number:', req.body.vendor_bill_number);
        console.log('🟢 BACKEND Step 16: vendor_bill_date:', req.body.vendor_bill_date);
        console.log('🟢 BACKEND Step 17: dispatch_through:', req.body.dispatch_through);
        console.log('🟢 BACKEND Step 18: docket_number:', req.body.docket_number);

        // Update dispatch details and status
        console.log('🟢 BACKEND Step 19: Updating order dispatch details...');
        order.dispatch_details = {
            vendor_bill_number: req.body.vendor_bill_number,
            vendor_bill_date: req.body.vendor_bill_date,
            dispatch_through: req.body.dispatch_through,
            docket_number: req.body.docket_number
        };
        console.log('🟢 BACKEND Step 20: Setting status from "awaiting_dispatch" to "intrasite"');
        order.status = 'intrasite';
        order.updated_by = userId;
        order.updated_by_name = userName;

        console.log('🟢 BACKEND Step 21: Saving order to database...');
        await order.save();
        console.log('✅ BACKEND Step 22: Order updated and saved successfully!');
        console.log('✅ BACKEND Step 23: New status:', order.status);

        // Update related Purchase Request status to intrasite as well
        console.log('🟢 BACKEND Step 24: Updating related Purchase Request status...');
        try {
            const PurchaseRequest = mongoose.model('PurchaseRequest');
            const pr = await PurchaseRequest.findOne({ 'items.order_id': id });
            if (pr) {
                console.log('✅ Found PR:', pr.PR_Number, 'Current status:', pr.status);
                pr.status = 'intrasite';
                await pr.save();
                console.log('✅ PR status updated to intrasite');

                // Update Product Inventory: Add to In-Transit and subtract from Ordered
                console.log('🟢 BACKEND Step 25: Updating Product Inventory Quantities...');
                try {
                    const Product = mongoose.model('Product');
                    for (const item of pr.items) {
                        if (item.product_id && item.order_id.toString() === id) {
                            const product = await Product.findById(item.product_id);
                            if (product) {
                                const quantity = item.pi_received_quantity || item.quantity || 0;

                                // Add to in-transit quantity
                                product.Product_In_Transit_Quantity = (product.Product_In_Transit_Quantity || 0) + quantity;

                                // Subtract from ordered quantity
                                product.Product_Ordered_Quantity = Math.max(0, (product.Product_Ordered_Quantity || 0) - quantity);

                                await product.save();
                                console.log(`✅ Updated ${product.Prod_Name} (${product.Prod_Code}):`);
                                console.log(`   - Added ${quantity} to in-transit qty. New: ${product.Product_In_Transit_Quantity}`);
                                console.log(`   - Subtracted ${quantity} from ordered qty. New: ${product.Product_Ordered_Quantity}`);
                            }
                        }
                    }
                } catch (inventoryUpdateError) {
                    console.error('⚠️ Error updating Product Inventory:', inventoryUpdateError.message);
                    // Don't fail dispatch if inventory update fails
                }
            } else {
                console.log('⚠️ No Purchase Request found for this order');
            }
        } catch (prUpdateError) {
            console.error('⚠️ Error updating PR status:', prUpdateError.message);
            // Don't fail if PR update fails
        }

        console.log('========================================\n');

        res.status(200).json({
            success: true,
            message: 'Dispatch details recorded and status updated to intrasite',
            data: order
        });
    } catch (error) {
        console.log('🔴 BACKEND EXCEPTION in recordDispatch:');
        console.error('🔴 Error:', error);
        console.error('🔴 Error message:', error.message);
        console.error('🔴 Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to record dispatch',
            error: error.message
        });
    }
};
import Order from './order.model.js';
import mongoose from 'mongoose';
import { Product } from '../Inventory/product.model.js';
import { sendOrderApprovalNotification, sendOrderRejectionNotification, sendNewOrderNotification } from '../../utils/notificationHelper.js';

// Create a new order
export const createOrder = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const userName = req.user?.User_Name || 'Unknown User';
        const userRole = req.user?.Role;

        console.log('Creating order with data:', req.body);
        console.log('User Role:', userRole);

        // Validate required fields
        if (!req.body.company_id) {
            return res.status(400).json({
                success: false,
                message: 'Company ID is required'
            });
        }

        if (!req.body.party_id) {
            return res.status(400).json({
                success: false,
                message: 'Party ID is required'
            });
        }

        if (!req.body.groups || !Array.isArray(req.body.groups) || req.body.groups.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one group with items is required'
            });
        }

        // Determine approval status based on user role
        let approvalStatus = 'not_required';
        if (userRole === 'Marketing') {
            approvalStatus = 'pending_approval';
        }

        // Create order data
        const orderData = {
            ...req.body,
            created_by: userId,
            created_by_name: userName,
            status: req.body.status || 'pending',
            payment_status: req.body.payment_status || 'pending',
            balance_amount: req.body.net_amount_payable - (req.body.amount_paid || 0),
            approval_status: approvalStatus
        };

        // Create new order
        const order = new Order(orderData);
        await order.save();

        console.log('✅ Order created successfully:', order.order_no);
        console.log('📋 Order payment_status:', order.payment_status);
        console.log('💰 Order balance_amount:', order.balance_amount);
        console.log('🏢 Order company_id:', order.company_id);
        console.log('👥 Order party_id:', order.party_id);
        console.log('✔️ Approval status:', order.approval_status);

        // If Marketing role created the order, send notification to Admin/Super Admin
        if (userRole === 'Marketing' && approvalStatus === 'pending_approval') {
            console.log('🔔 Sending notifications to Admin/Super Admin users...');
            const io = req.app.get('io');

            // Send notifications in background (non-blocking)
            sendNewOrderNotification({
                order: order,
                createdByName: userName,
                io: io
            }).catch(error => {
                console.error('❌ Failed to send new order notifications:', error);
            });
        }

        res.status(201).json({
            success: true,
            message: userRole === 'Marketing'
                ? 'Order created successfully. Pending approval from Admin/Super Admin.'
                : 'Order created successfully',
            data: order
        });

    } catch (error) {
        console.error('Error creating order:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        if (error.name === 'ValidationError') {
            console.error('Validation errors:', error.errors);
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message,
            details: error.name === 'ValidationError' ? error.errors : undefined
        });
    }
};

// Get all orders with filters and pagination
export const getAllOrders = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            payment_status,
            party_id,
            company_id,
            site_id,
            from_date,
            to_date,
            search,
            sort_by = 'order_date',
            sort_order = 'desc'
        } = req.query;

        console.log('Fetching orders with filters:', req.query);

        // Build filter query
        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (payment_status) {
            // Handle comma-separated payment statuses
            const statusArray = payment_status.split(',').map(s => s.trim());
            filter.payment_status = { $in: statusArray };
            console.log('Payment status filter:', filter.payment_status);
        }

        if (party_id) {
            filter.party_id = party_id;
        }

        if (company_id) {
            filter.company_id = company_id;
        }

        if (site_id) {
            filter.site_id = site_id;
        }

        // Date range filter
        if (from_date || to_date) {
            filter.order_date = {};
            if (from_date) {
                filter.order_date.$gte = new Date(from_date);
            }
            if (to_date) {
                filter.order_date.$lte = new Date(to_date);
            }
        }

        // Search filter
        if (search) {
            filter.$or = [
                { order_no: { $regex: search, $options: 'i' } },
                { party_name: { $regex: search, $options: 'i' } },
                { party_billing_name: { $regex: search, $options: 'i' } },
                { quotation_no: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOrder = sort_order === 'asc' ? 1 : -1;
        const sortObj = { [sort_by]: sortOrder };

        console.log('📊 Final filter object:', JSON.stringify(filter, null, 2));
        console.log('📄 Pagination:', { page, limit, skip });

        // Execute query
        const orders = await Order.find(filter)
            .populate('company_id', 'Company_Name Company_Short_Code')
            .populate('party_id', 'Party_Billing_Name Party_id')
            .populate('site_id', 'Site_Billing_Name Site_id')
            .populate('created_by', 'User_Name User_Email')
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count
        const total = await Order.countDocuments(filter);

        console.log(`✅ Found ${orders.length} orders out of ${total} total`);

        res.status(200).json({
            success: true,
            message: 'Orders retrieved successfully',
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / parseInt(limit))
            },
            filters: {
                status,
                payment_status,
                party_id,
                company_id,
                from_date,
                to_date,
                search
            }
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// Get order by ID
export const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id)
            .populate('company_id')
            .populate('party_id')
            .populate('site_id')
            .populate('quotation_id')
            .populate('created_by', 'User_Name User_Email')
            .populate('updated_by', 'User_Name User_Email');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Calculate inventory availability for each item
        const orderWithInventory = order.toObject();

        // First, calculate consolidated quantities for each product code
        const consolidatedQuantities = {};
        for (const group of orderWithInventory.groups) {
            for (const item of group.items) {
                const productCode = item.product_code;
                if (!consolidatedQuantities[productCode]) {
                    consolidatedQuantities[productCode] = 0;
                }
                // Sum up balance quantities for same product across all groups
                const balanceQty = item.balance_quantity || (item.quantity - (item.dispatched_quantity || 0));
                consolidatedQuantities[productCode] += balanceQty;
            }
        }

        for (let groupIndex = 0; groupIndex < orderWithInventory.groups.length; groupIndex++) {
            const group = orderWithInventory.groups[groupIndex];

            for (let itemIndex = 0; itemIndex < group.items.length; itemIndex++) {
                const item = group.items[itemIndex];

                try {
                    // Get product from inventory
                    const product = await Product.findById(item.product_id);

                    if (product) {
                        // Calculate available stock (Fresh Stock + Opening Stock - Damage Stock)
                        // Sample stock is NOT deducted as it's tracked separately
                        const totalAvailableStock =
                            (product.Product_Fresh_Stock || 0) +
                            (product.Product_opening_stock || 0) -
                            (product.Product_Damage_stock || 0);

                        // Update item with inventory data
                        item.available_quantity = Math.max(0, totalAvailableStock);
                        item.consolidated_quantity = consolidatedQuantities[item.product_code] || 0;
                        item.dispatched_quantity = item.dispatched_quantity || 0;
                        item.balance_quantity = item.quantity - item.dispatched_quantity;

                        // Add product type for filtering
                        item.product_type = product.Product_Type; // 'Rough' or 'Trim'

                        // Stock breakdown by type
                        item.fresh_stock = product.Product_Fresh_Stock || 0;
                        item.sample_stock = product.Product_sample_stock || 0;
                        item.raf_stock = product.Prod_Showroom_stock || 0; // RAF = Showroom stock
                        item.trim_stock = 0; // Will be set based on product type below

                        // Set trim_stock only for products with Product_Type = 'Trim'
                        if (product.Product_Type === 'Trim') {
                            item.trim_stock = product.Product_Fresh_Stock || 0;
                        }

                        // Determine availability status based on consolidated quantity vs available quantity
                        // Logic: If consolidated_quantity > available_quantity, status is 'partial'
                        if (item.consolidated_quantity > item.available_quantity) {
                            item.availability_status = 'partial';
                        } else if (item.available_quantity >= item.balance_quantity) {
                            item.availability_status = 'available';
                        } else if (item.available_quantity > 0) {
                            item.availability_status = 'partial';
                        } else {
                            item.availability_status = 'non-available';
                        }
                    } else {
                        // Product not found in inventory
                        item.available_quantity = 0;
                        item.consolidated_quantity = consolidatedQuantities[item.product_code] || 0;
                        item.dispatched_quantity = item.dispatched_quantity || 0;
                        item.balance_quantity = item.quantity - item.dispatched_quantity;
                        item.availability_status = 'non-available';
                        item.product_type = null;
                        item.fresh_stock = 0;
                        item.sample_stock = 0;
                        item.raf_stock = 0;
                        item.trim_stock = 0;
                    }
                } catch (productError) {
                    console.error(`Error fetching product ${item.product_id}:`, productError);
                    // Set default values on error
                    item.available_quantity = 0;
                    item.consolidated_quantity = consolidatedQuantities[item.product_code] || 0;
                    item.dispatched_quantity = item.dispatched_quantity || 0;
                    item.balance_quantity = item.quantity - item.dispatched_quantity;
                    item.availability_status = 'non-available';
                    item.product_type = null;
                    item.fresh_stock = 0;
                    item.sample_stock = 0;
                    item.raf_stock = 0;
                    item.trim_stock = 0;
                }
            }
        }

        res.status(200).json({
            success: true,
            message: 'Order retrieved successfully',
            data: orderWithInventory
        });

    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order',
            error: error.message
        });
    }
};

// Update order
export const updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id || req.user?.id;
        const userName = req.user?.User_Name || 'Unknown User';

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Update order data
        const updateData = {
            ...req.body,
            updated_by: userId,
            updated_by_name: userName
        };

        // Recalculate balance if amount_paid is updated
        if (req.body.amount_paid !== undefined) {
            updateData.balance_amount = order.net_amount_payable - req.body.amount_paid;

            // Update payment status
            if (updateData.balance_amount <= 0) {
                updateData.payment_status = 'paid';
            } else if (req.body.amount_paid > 0) {
                updateData.payment_status = 'partial';
            }
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Order updated successfully',
            data: updatedOrder
        });

    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order',
            error: error.message
        });
    }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const validStatuses = ['pending', 'partially pending', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const order = await Order.findByIdAndUpdate(
            id,
            {
                status,
                updated_by: req.user?._id || req.user?.id,
                updated_by_name: req.user?.User_Name || 'Unknown User'
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            data: order
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
};

// Update payment status
export const updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_status, amount_paid, payment_method } = req.body;

        if (!payment_status) {
            return res.status(400).json({
                success: false,
                message: 'Payment status is required'
            });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const updateData = {
            payment_status,
            updated_by: req.user?._id || req.user?.id,
            updated_by_name: req.user?.User_Name || 'Unknown User'
        };

        if (amount_paid !== undefined) {
            updateData.amount_paid = amount_paid;
            updateData.balance_amount = order.net_amount_payable - amount_paid;
        }

        if (payment_method) {
            updateData.payment_method = payment_method;
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Payment status updated successfully',
            data: updatedOrder
        });

    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment status',
            error: error.message
        });
    }
};

// Delete order
export const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findByIdAndDelete(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete order',
            error: error.message
        });
    }
};

// Get order statistics
export const getOrderStats = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'pending' });
        const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
        const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
        const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

        const totalRevenue = await Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$net_amount_payable' } } }
        ]);

        const pendingPayments = await Order.aggregate([
            { $match: { payment_status: { $in: ['pending', 'partial'] } } },
            { $group: { _id: null, total: { $sum: '$balance_amount' } } }
        ]);

        res.status(200).json({
            success: true,
            message: 'Order statistics retrieved successfully',
            data: {
                total_orders: totalOrders,
                pending_orders: pendingOrders,
                confirmed_orders: confirmedOrders,
                delivered_orders: deliveredOrders,
                cancelled_orders: cancelledOrders,
                total_revenue: totalRevenue[0]?.total || 0,
                pending_payments: pendingPayments[0]?.total || 0
            }
        });

    } catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order statistics',
            error: error.message
        });
    }
};

// Cancel order
export const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id || req.user?.id;
        const userName = req.user?.User_Name || 'Unknown User';
        const { cancellation_reason, payment_adjustment } = req.body;

        console.log('🔴 ===== ORDER CANCELLATION REQUEST =====');
        console.log('📋 Order ID:', id);
        console.log('👤 User:', userName);
        console.log('📝 Reason:', cancellation_reason);
        console.log('💰 Payment Adjustment:', payment_adjustment);

        const order = await Order.findById(id);

        if (!order) {
            console.log('❌ Order not found');
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        console.log('📦 Order Found:', order.order_no);
        console.log('📊 Current Status:', order.status);

        // Check if order is already cancelled
        if (order.status === 'cancelled') {
            console.log('⚠️ Order already cancelled');
            return res.status(400).json({
                success: false,
                message: 'Order is already cancelled'
            });
        }

        // Check if order can be cancelled
        if (order.status === 'delivered') {
            console.log('⚠️ Cannot cancel delivered order');
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a delivered order'
            });
        }

        // CONDITION 1: Check if any items are dispatched
        let totalOrderQty = 0;
        let totalDispatchedQty = 0;

        order.groups.forEach(group => {
            group.items.forEach(item => {
                totalOrderQty += item.quantity;
                totalDispatchedQty += (item.dispatched_quantity || 0);
            });
        });

        console.log('📊 Total Order Quantity:', totalOrderQty);
        console.log('🚚 Total Dispatched Quantity:', totalDispatchedQty);
        console.log('⏳ Pending Quantity:', totalOrderQty - totalDispatchedQty);

        const hasDispatchedItems = totalDispatchedQty > 0;
        const isPartialCancellation = hasDispatchedItems;

        // CONDITION 2: Check if payment is received or pending
        const paymentReceived = order.amount_paid || 0;
        const balancePayment = order.balance_amount || 0;
        const hasPayment = paymentReceived > 0;

        console.log('💵 Payment Received:', paymentReceived);
        console.log('💳 Balance Payment:', balancePayment);
        console.log('💰 Has Payment:', hasPayment);

        // If payment exists, payment adjustment is required
        if (hasPayment && !payment_adjustment) {
            console.log('⚠️ Payment adjustment required but not provided');
            return res.status(400).json({
                success: false,
                message: 'Payment adjustment is required for orders with received payments',
                requiresPaymentAdjustment: true,
                paymentAmount: paymentReceived
            });
        }

        // Handle payment adjustment if provided
        let paymentAdjustmentResult = null;
        if (hasPayment && payment_adjustment) {
            console.log('💰 Processing payment adjustment:', payment_adjustment.action);

            if (payment_adjustment.action === 'adjust') {
                // Validate adjust_to_order_id is provided
                if (!payment_adjustment.adjust_to_order_id) {
                    console.log('❌ Target order ID not provided for adjustment');
                    return res.status(400).json({
                        success: false,
                        message: 'Target order ID is required for payment adjustment'
                    });
                }

                // Find target order
                const targetOrder = await Order.findById(payment_adjustment.adjust_to_order_id);
                if (!targetOrder) {
                    console.log('❌ Target order not found');
                    return res.status(404).json({
                        success: false,
                        message: 'Target order for payment adjustment not found'
                    });
                }

                console.log('🎯 Target Order:', targetOrder.order_no);
                console.log('💰 Target Balance Before:', targetOrder.balance_amount);

                // Adjust payment to target order
                const adjustmentAmount = paymentReceived;
                targetOrder.amount_paid = (targetOrder.amount_paid || 0) + adjustmentAmount;
                targetOrder.balance_amount = Math.max(0, targetOrder.net_amount_payable - targetOrder.amount_paid);

                // Update payment status of target order
                if (targetOrder.balance_amount === 0) {
                    targetOrder.payment_status = 'paid';
                } else if (targetOrder.amount_paid > 0) {
                    targetOrder.payment_status = 'partial';
                }

                await targetOrder.save();
                console.log('✅ Payment adjusted to target order');
                console.log('💰 Target Balance After:', targetOrder.balance_amount);

                paymentAdjustmentResult = {
                    action: 'adjust',
                    amount: adjustmentAmount,
                    target_order_no: targetOrder.order_no
                };
            } else if (payment_adjustment.action === 'refund') {
                console.log('💸 Payment marked for refund');
                paymentAdjustmentResult = {
                    action: 'refund',
                    amount: paymentReceived
                };
            } else if (payment_adjustment.action === 'forfeit') {
                console.log('💰 Payment forfeited');
                paymentAdjustmentResult = {
                    action: 'forfeit',
                    amount: paymentReceived
                };
            }

            // Reset payment in cancelled order
            order.amount_paid = 0;
            order.balance_amount = 0;
            order.payment_status = 'refunded';
        }

        // Handle partial cancellation if items are dispatched
        if (isPartialCancellation) {
            console.log('⚠️ Partial cancellation - recalculating order values');

            // Update balance quantities to 0 for all items (cancel pending items)
            let newGrandTotal = 0;
            let newGstAmount = 0;

            order.groups.forEach(group => {
                let groupTotal = 0;
                group.items.forEach(item => {
                    // Only keep dispatched items in calculation
                    const dispatchedQty = item.dispatched_quantity || 0;

                    if (dispatchedQty > 0) {
                        // Recalculate based on dispatched quantity
                        const itemTotal = dispatchedQty * item.net_rate;
                        groupTotal += itemTotal;
                        item.total_amount = itemTotal;
                        item.quantity = dispatchedQty;
                        item.balance_quantity = 0;
                    } else {
                        // No items dispatched, set to 0
                        item.total_amount = 0;
                        item.balance_quantity = 0;
                    }
                });
                group.total_amount = groupTotal;
                newGrandTotal += groupTotal;
            });

            // Recalculate GST
            newGstAmount = (newGrandTotal * (order.gst_percentage || 18)) / 100;

            // Update order totals
            order.grand_total = newGrandTotal;
            order.gst_amount = newGstAmount;
            order.net_amount_payable = newGrandTotal + newGstAmount + (order.freight_charges || 0) - (order.additional_discount || 0);

            console.log('📊 Recalculated Grand Total:', order.grand_total);
            console.log('📊 Recalculated Net Amount:', order.net_amount_payable);
        } else {
            // Full cancellation - set all quantities and amounts to 0
            console.log('🔴 Full cancellation - zeroing all values');

            order.groups.forEach(group => {
                group.items.forEach(item => {
                    item.balance_quantity = 0;
                    item.total_amount = 0;
                });
                group.total_amount = 0;
            });

            order.grand_total = 0;
            order.gst_amount = 0;
            order.net_amount_payable = 0;
        }

        // Update order status to cancelled
        order.status = 'cancelled';
        order.cancellation_reason = cancellation_reason || 'No reason provided';
        order.cancelled_by = userId;
        order.cancelled_by_name = userName;
        order.cancelled_at = new Date();
        order.updated_by = userId;
        order.updated_by_name = userName;

        if (paymentAdjustmentResult) {
            order.payment_adjustment_details = paymentAdjustmentResult;
        }

        await order.save();

        console.log('✅ Order cancelled successfully');
        console.log('📊 Cancellation Type:', isPartialCancellation ? 'PARTIAL' : 'FULL');
        console.log('💰 Payment Adjustment:', paymentAdjustmentResult?.action || 'NONE');

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            data: order,
            cancellationDetails: {
                type: isPartialCancellation ? 'partial' : 'full',
                totalOrderQty: totalOrderQty,
                dispatchedQty: totalDispatchedQty,
                cancelledQty: totalOrderQty - totalDispatchedQty,
                paymentAdjustment: paymentAdjustmentResult
            }
        });

    } catch (error) {
        console.error('❌ Error cancelling order:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order',
            error: error.message
        });
    }
};

// Get pending orders by party ID
export const getPendingOrdersByParty = async (req, res) => {
    try {
        const { partyId } = req.params;

        console.log('🔍 Fetching pending orders for party:', partyId);

        const orders = await Order.find({
            party_id: partyId,
            status: { $ne: 'cancelled' },
            balance_amount: { $gt: 0 }
        }).select('_id order_no order_date net_amount_payable amount_paid balance_amount status');

        console.log('📋 Found', orders.length, 'pending orders');

        res.status(200).json({
            success: true,
            data: orders
        });

    } catch (error) {
        console.error('❌ Error fetching pending orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending orders',
            error: error.message
        });
    }
};

// Get orders with partial or unavailable items (for Purchase Management)
export const getPartialUnavailableOrders = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            brand,
            party_id,
            order_id,
            search,
            sort_by = 'order_date',
            sort_order = 'desc'
        } = req.query;

        console.log('\n🔍 ==================== BACKEND REQUEST START ====================');
        console.log('🔍 Backend - Fetching partial/unavailable orders with filters:', req.query);
        console.log('🔍 Backend - Brand filter:', brand, '| Type:', typeof brand, '| Length:', brand?.length, '| isEmpty:', brand === '' || brand === undefined);
        console.log('🔍 Backend - Party filter (raw):', party_id, '(empty means ALL parties)');
        console.log('🔍 Backend - Order filter (raw):', order_id, '(empty means ALL orders)');

        // Build filter query
        const filter = {
            status: { $ne: 'cancelled' }
        };

        // Handle multiple party_id values (comma-separated string or array)
        if (party_id && party_id !== 'all' && party_id !== '') {
            if (typeof party_id === 'string' && party_id.includes(',')) {
                // Comma-separated string: "id1,id2,id3"
                const partyIds = party_id.split(',').map(id => id.trim()).filter(id => id);
                console.log('🔍 Backend - Parsed party_ids (multiple):', partyIds);
                filter.party_id = { $in: partyIds };
            } else if (Array.isArray(party_id)) {
                // Already an array
                console.log('🔍 Backend - Party_ids (array):', party_id);
                filter.party_id = { $in: party_id };
            } else {
                // Single value
                console.log('🔍 Backend - Party_id (single):', party_id);
                filter.party_id = party_id;
            }
        } else {
            console.log('🔍 Backend - No party filter applied (showing ALL parties)');
        }

        // Handle multiple order_id values (comma-separated string or array)
        if (order_id && order_id !== 'all' && order_id !== '') {
            if (typeof order_id === 'string' && order_id.includes(',')) {
                // Comma-separated string: "id1,id2,id3"
                const orderIds = order_id.split(',').map(id => id.trim()).filter(id => id);
                console.log('🔍 Backend - Parsed order_ids (multiple):', orderIds);
                filter._id = { $in: orderIds };
            } else if (Array.isArray(order_id)) {
                // Already an array
                console.log('🔍 Backend - Order_ids (array):', order_id);
                filter._id = { $in: order_id };
            } else {
                // Single value
                console.log('🔍 Backend - Order_id (single):', order_id);
                filter._id = order_id;
            }
        } else {
            console.log('🔍 Backend - No order filter applied (showing ALL orders)');
        }

        // Search filter
        if (search) {
            filter.$or = [
                { order_no: { $regex: search, $options: 'i' } },
                { party_name: { $regex: search, $options: 'i' } },
                { party_billing_name: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOrder = sort_order === 'asc' ? 1 : -1;
        const sortObj = { [sort_by]: sortOrder };

        // Get all orders matching filter
        const allOrders = await Order.find(filter)
            .populate('company_id', 'Company_Name Company_Short_Code')
            .populate('party_id', 'Party_Billing_Name Party_id')
            .populate('site_id', 'Site_Billing_Name Site_id')
            .populate('created_by', 'User_Name User_Email')
            .sort(sortObj);

        console.log(`\n📊 ==================== STEP 1: DATABASE QUERY ====================`);
        console.log(`📊 Found ${allOrders.length} total orders before filtering`);
        console.log(`📊 MongoDB filter used:`, JSON.stringify(filter, null, 2));

        // Filter orders with partial or unavailable items
        const ordersWithPartialUnavailable = [];
        let orderCounter = 0;

        console.log(`\n📊 ==================== STEP 2: PROCESSING ORDERS ====================`);

        // Calculate consolidated quantities for each product code across ALL filtered orders
        // This ensures we sum balance quantities from all selected parties/orders
        const consolidatedQuantities = {};
        for (const order of allOrders) {
            const orderObj = order.toObject();
            for (const group of orderObj.groups) {
                for (const item of group.items) {
                    const productCode = item.product_code;
                    if (!consolidatedQuantities[productCode]) {
                        consolidatedQuantities[productCode] = 0;
                    }
                    const balanceQty = item.balance_quantity || (item.quantity - (item.dispatched_quantity || 0));
                    consolidatedQuantities[productCode] += balanceQty;
                }
            }
        }

        console.log('\n📊 Consolidated Quantities across all filtered orders:', consolidatedQuantities);

        for (const order of allOrders) {
            orderCounter++;
            const orderObj = order.toObject();
            console.log(`\n🔷 Processing Order ${orderCounter}/${allOrders.length}: ${orderObj.order_no} (ID: ${orderObj._id})`);


            let hasPartialOrUnavailable = false;
            let orderPartialItems = [];
            let orderUnavailableItems = [];

            for (let groupIndex = 0; groupIndex < orderObj.groups.length; groupIndex++) {
                const group = orderObj.groups[groupIndex];

                for (let itemIndex = 0; itemIndex < group.items.length; itemIndex++) {
                    const item = group.items[itemIndex];

                    try {
                        // Get product from inventory
                        const product = await Product.findById(item.product_id);

                        if (product) {
                            console.log(`  🔸 Product found: ${item.product_code} | Product Brand: '${product.Product_Brand}' | Filter Brand: '${brand}'`);
                            console.log(`  🔸 Brand check: brand='${brand}' | trim='${brand?.trim()}' | isEmpty=${!brand || brand.trim() === ''}`);

                            // Apply brand filter if specified (and not empty string)
                            if (brand && brand.trim() !== '' && product.Product_Brand !== brand) {
                                console.log(`  ❌ SKIPPING - Brand mismatch: Product='${product.Product_Brand}' vs Filter='${brand}'`);
                                continue;
                            }

                            if (brand && brand.trim() !== '') {
                                console.log(`  ✅ INCLUDED - Brand match: Product='${product.Product_Brand}' matches Filter='${brand}'`);
                            } else {
                                console.log(`  ✅ INCLUDED - No brand filter (showing ALL brands)`);
                            }

                            // Calculate available stock (Fresh Stock)
                            const freshStock = product.Product_Fresh_Stock || 0;

                            // Get consolidated quantity from ALL filtered orders for this product code
                            const consolidatedQty = consolidatedQuantities[item.product_code] || 0;

                            // Calculate unavailable quantity using the formula:
                            // unavailable_qty = Sum of all balance quantities for this product code (from filtered orders) - fresh stock
                            const unavailableQty = Math.max(0, consolidatedQty - freshStock);

                            // Update item with inventory data
                            item.fresh_stock = freshStock;
                            item.consolidated_quantity = consolidatedQty;
                            item.unavailable_quantity = unavailableQty;
                            item.dispatched_quantity = item.dispatched_quantity || 0;
                            item.balance_quantity = item.quantity - item.dispatched_quantity;
                            item.product_brand = product.Product_Brand;

                            console.log(`    📊 Product: ${item.product_code} | Consolidated Qty (all filtered orders): ${consolidatedQty} | Fresh Stock: ${freshStock} | Unavailable: ${unavailableQty}`);

                            // Determine availability status
                            if (unavailableQty > 0) {
                                if (freshStock > 0) {
                                    item.availability_status = 'partial';
                                    hasPartialOrUnavailable = true;
                                    orderPartialItems.push({
                                        product_code: item.product_code,
                                        product_name: item.product_name,
                                        brand: product.Product_Brand,
                                        consolidated_qty: consolidatedQty,
                                        fresh_stock: freshStock,
                                        unavailable_qty: unavailableQty
                                    });
                                } else {
                                    item.availability_status = 'unavailable';
                                    hasPartialOrUnavailable = true;
                                    orderUnavailableItems.push({
                                        product_code: item.product_code,
                                        product_name: item.product_name,
                                        brand: product.Product_Brand,
                                        consolidated_qty: consolidatedQty,
                                        fresh_stock: freshStock,
                                        unavailable_qty: unavailableQty
                                    });
                                }
                            } else {
                                item.availability_status = 'available';
                            }
                        }
                    } catch (productError) {
                        console.error(`Error fetching product ${item.product_id}:`, productError);
                    }
                }
            }

            // Only include orders with partial or unavailable items
            if (hasPartialOrUnavailable) {
                orderObj.partial_items = orderPartialItems;
                orderObj.unavailable_items = orderUnavailableItems;
                orderObj.total_partial_items = orderPartialItems.length;
                orderObj.total_unavailable_items = orderUnavailableItems.length;
                ordersWithPartialUnavailable.push(orderObj);
                console.log(`  ✅ Order ${orderObj.order_no} ADDED to results (${orderPartialItems.length} partial, ${orderUnavailableItems.length} unavailable)`);
            } else {
                console.log(`  ⏭️ Order ${orderObj.order_no} SKIPPED (no partial/unavailable items matching filter)`);
            }
        }

        console.log(`\n📊 ==================== STEP 3: FILTERING COMPLETE ====================`);
        console.log(`✅ Total orders with partial/unavailable items: ${ordersWithPartialUnavailable.length}`);
        console.log(`📄 Applying pagination: page ${page}, limit ${limit}, skip ${skip}`);

        // Apply pagination to filtered results
        const paginatedOrders = ordersWithPartialUnavailable.slice(skip, skip + parseInt(limit));

        console.log(`📦 Returning ${paginatedOrders.length} orders for current page`);
        console.log(`📦 Order IDs being returned:`, paginatedOrders.map(o => `${o.order_no} (${o._id})`));
        console.log('🔍 ==================== BACKEND REQUEST END ====================\n');

        res.status(200).json({
            success: true,
            message: 'Orders with partial/unavailable items retrieved successfully',
            data: paginatedOrders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: ordersWithPartialUnavailable.length,
                totalPages: Math.ceil(ordersWithPartialUnavailable.length / parseInt(limit))
            },
            filters: {
                brand,
                party_id,
                order_id,
                search
            }
        });

    } catch (error) {
        console.error('❌ Error fetching partial/unavailable orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// Export orders to Excel
export const exportOrdersToExcel = async (req, res) => {
    try {
        const { order_ids } = req.body;

        if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order IDs are required'
            });
        }

        console.log('📊 Exporting orders to Excel:', order_ids);

        // Fetch orders with populated data
        const orders = await Order.find({ _id: { $in: order_ids } })
            .populate('company_id', 'Company_Name')
            .populate('party_id', 'Billing_Name Contact_Person_Name Mobile_No Email')
            .lean();

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No orders found'
            });
        }

        // Create Excel workbook data
        const excelData = [];

        orders.forEach(order => {
            // Add order header
            excelData.push({
                'Order No': order.order_no,
                'Party Name': order.party_id?.Billing_Name || 'N/A',
                'Contact Person': order.party_id?.Contact_Person_Name || 'N/A',
                'Mobile': order.party_id?.Mobile_No || 'N/A',
                'Email': order.party_id?.Email || 'N/A',
                'Order Date': new Date(order.order_date).toLocaleDateString(),
                'Status': order.status,
                'Payment Status': order.payment_status,
                'Total Amount': order.net_amount_payable,
                'Partial Items': order.total_partial_items || 0,
                'Unavailable Items': order.total_unavailable_items || 0
            });

            // Add items details
            if (order.groups && order.groups.length > 0) {
                order.groups.forEach(group => {
                    if (group.items && group.items.length > 0) {
                        group.items.forEach(item => {
                            const unavailableQty = Math.max(0, (item.consolidated_quantity || 0) - (item.fresh_stock || 0));
                            if (unavailableQty > 0 || (item.consolidated_quantity || 0) > 0) {
                                excelData.push({
                                    'Order No': '',
                                    'Party Name': '',
                                    'Product Name': item.product_name || 'N/A',
                                    'Brand': item.brand || 'N/A',
                                    'Quantity': item.quantity || 0,
                                    'Consolidated Stock': item.consolidated_quantity || 0,
                                    'Fresh Stock': item.fresh_stock || 0,
                                    'Unavailable Qty': unavailableQty,
                                    'Price': item.price || 0,
                                    'Total': item.total || 0
                                });
                            }
                        });
                    }
                });
            }

            // Add empty row between orders
            excelData.push({});
        });

        // Return data for Excel generation (frontend will handle actual Excel creation)
        res.status(200).json({
            success: true,
            message: 'Export data prepared successfully',
            data: excelData,
            orders: orders
        });

    } catch (error) {
        console.error('❌ Error exporting orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export orders',
            error: error.message
        });
    }
};

// Send email to vendor
export const sendEmailToVendor = async (req, res) => {
    try {
        const { order_ids, message, subject } = req.body;

        if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order IDs are required'
            });
        }

        console.log('📧 Sending email to vendor for orders:', order_ids);

        // Fetch orders with populated data
        const orders = await Order.find({ _id: { $in: order_ids } })
            .populate('company_id', 'Company_Name Email Mobile_No')
            .populate('party_id', 'Billing_Name Contact_Person_Name Mobile_No Email')
            .lean();

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No orders found'
            });
        }

        // Prepare email data
        const emailData = {
            orders: orders.map(order => ({
                order_no: order.order_no,
                party_name: order.party_id?.Billing_Name || 'N/A',
                party_email: order.party_id?.Email || '',
                party_mobile: order.party_id?.Mobile_No || '',
                order_date: new Date(order.order_date).toLocaleDateString(),
                total_amount: order.net_amount_payable,
                partial_items: order.total_partial_items || 0,
                unavailable_items: order.total_unavailable_items || 0,
                items: []
            })),
            subject: subject || `Purchase Order - Partial/Unavailable Items Alert`,
            message: message || `Dear Vendor,\n\nThe following orders have partial or unavailable items. Please review and update stock availability.\n\nBest regards,\nPurchase Team`
        };

        // Extract items with stock issues
        orders.forEach((order, idx) => {
            if (order.groups && order.groups.length > 0) {
                order.groups.forEach(group => {
                    if (group.items && group.items.length > 0) {
                        group.items.forEach(item => {
                            const unavailableQty = Math.max(0, (item.consolidated_quantity || 0) - (item.fresh_stock || 0));
                            if (unavailableQty > 0 || (item.consolidated_quantity || 0) > 0) {
                                emailData.orders[idx].items.push({
                                    product_name: item.product_name || 'N/A',
                                    brand: item.brand || 'N/A',
                                    quantity: item.quantity || 0,
                                    consolidated_stock: item.consolidated_quantity || 0,
                                    fresh_stock: item.fresh_stock || 0,
                                    unavailable_qty: unavailableQty
                                });
                            }
                        });
                    }
                });
            }
        });

        // TODO: Implement actual email sending logic using nodemailer or similar service
        // For now, return email data
        console.log('✅ Email data prepared for:', emailData.orders.length, 'orders');

        res.status(200).json({
            success: true,
            message: 'Email sent successfully to vendor',
            data: emailData,
            info: 'Email functionality requires email service configuration'
        });

    } catch (error) {
        console.error('❌ Error sending vendor email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send email to vendor',
            error: error.message
        });
    }
};

// Approve order (Admin/Super Admin only)
export const approveOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { approval_remarks } = req.body;
        const userId = req.user?._id || req.user?.id;
        const userName = req.user?.User_Name || 'Unknown User';
        const userRole = req.user?.Role;

        console.log('Approving order:', id);
        console.log('User Role:', userRole);
        console.log('User Name:', userName);

        // Check if user has permission to approve
        if (userRole !== 'Admin' && userRole !== 'Super Admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Admin or Super Admin can approve orders'
            });
        }

        // Find the order
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order is pending approval
        if (order.approval_status !== 'pending_approval') {
            return res.status(400).json({
                success: false,
                message: `Order is not pending approval. Current status: ${order.approval_status}`
            });
        }

        // Update approval status
        order.approval_status = 'approved';
        order.approved_by = userId;
        order.approved_by_name = userName;
        order.approved_at = new Date();
        if (approval_remarks) {
            order.approval_remarks = approval_remarks;
        }

        await order.save();

        console.log('✅ Order approved successfully:', order.order_no);
        console.log('✔️ Approved by:', userName);

        // Send notifications (chat + WhatsApp) - Non-blocking
        const io = req.app.get('io');
        if (io) {
            sendOrderApprovalNotification({
                order,
                approvedBy: userName,
                io
            }).then(result => {
                if (result.success) {
                    console.log('✅ Approval notifications sent successfully');
                } else {
                    console.log('⚠️ Failed to send notifications:', result.message);
                }
            }).catch(error => {
                console.error('❌ Error in notification process:', error);
            });
        } else {
            console.log('⚠️ Socket.IO not available, skipping real-time notifications');
        }

        res.status(200).json({
            success: true,
            message: 'Order approved successfully',
            data: order
        });

    } catch (error) {
        console.error('❌ Error approving order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve order',
            error: error.message
        });
    }
};

// Reject order (Admin/Super Admin only)
export const rejectOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { approval_remarks } = req.body;
        const userId = req.user?._id || req.user?.id;
        const userName = req.user?.User_Name || 'Unknown User';
        const userRole = req.user?.Role;

        console.log('Rejecting order:', id);
        console.log('User Role:', userRole);

        // Check if user has permission to reject
        if (userRole !== 'Admin' && userRole !== 'Super Admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Admin or Super Admin can reject orders'
            });
        }

        // Find the order
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order is pending approval
        if (order.approval_status !== 'pending_approval') {
            return res.status(400).json({
                success: false,
                message: `Order is not pending approval. Current status: ${order.approval_status}`
            });
        }

        // Update approval status
        order.approval_status = 'rejected';
        order.approved_by = userId;
        order.approved_by_name = userName;
        order.approved_at = new Date();
        if (approval_remarks) {
            order.approval_remarks = approval_remarks;
        }

        await order.save();

        console.log('✅ Order rejected successfully:', order.order_no);
        console.log('❌ Rejected by:', userName);

        // Send notifications (chat + WhatsApp) - Non-blocking
        const io = req.app.get('io');
        if (io) {
            sendOrderRejectionNotification({
                order,
                rejectedBy: userName,
                remarks: approval_remarks,
                io
            }).then(result => {
                if (result.success) {
                    console.log('✅ Rejection notifications sent successfully');
                } else {
                    console.log('⚠️ Failed to send notifications:', result.message);
                }
            }).catch(error => {
                console.error('❌ Error in notification process:', error);
            });
        } else {
            console.log('⚠️ Socket.IO not available, skipping real-time notifications');
        }

        res.status(200).json({
            success: true,
            message: 'Order rejected successfully',
            data: order
        });

    } catch (error) {
        console.error('❌ Error rejecting order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject order',
            error: error.message
        });
    }
};

