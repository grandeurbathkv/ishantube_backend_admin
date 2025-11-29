import Order from './order.model.js';
import mongoose from 'mongoose';
import { Product } from '../Inventory/product.model.js';

// Create a new order
export const createOrder = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const userName = req.user?.User_Name || 'Unknown User';

        console.log('Creating order with data:', req.body);

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

        // Create order data
        const orderData = {
            ...req.body,
            created_by: userId,
            created_by_name: userName,
            status: req.body.status || 'pending',
            payment_status: req.body.payment_status || 'pending',
            balance_amount: req.body.net_amount_payable - (req.body.amount_paid || 0)
        };

        // Create new order
        const order = new Order(orderData);
        await order.save();

        console.log('✅ Order created successfully:', order.order_no);
        console.log('📋 Order payment_status:', order.payment_status);
        console.log('💰 Order balance_amount:', order.balance_amount);
        console.log('🏢 Order company_id:', order.company_id);
        console.log('👥 Order party_id:', order.party_id);

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
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
