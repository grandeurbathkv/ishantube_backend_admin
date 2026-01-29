import Dispatch from './dispatch.model.js';
import Order from './order.model.js';

// Create dispatch note
export const createDispatch = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const userName = req.user?.User_Name || 'Unknown User';

        console.log('Creating dispatch note:', req.body);

        // Validate
        if (!req.body.order_id) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        if (!req.body.items || req.body.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one item is required'
            });
        }

        // Get order details
        const order = await Order.findById(req.body.order_id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Create dispatch
        const dispatchData = {
            ...req.body,
            order_no: order.order_no,
            company_id: order.company_id,
            company_name: order.company_name,
            party_id: order.party_id,
            party_name: order.party_name,
            party_billing_name: order.party_billing_name,
            party_address: order.party_address,
            site_id: order.site_id,
            site_name: order.site_name,
            site_address: order.site_address,
            created_by: userId,
            created_by_name: userName
        };

        const dispatch = new Dispatch(dispatchData);
        await dispatch.save();

        console.log('Dispatch created:', dispatch.dispatch_no);

        // Update order items with dispatched quantities
        for (const dispatchItem of req.body.items) {
            // Find the item in order and update dispatched quantity
            for (const group of order.groups) {
                const orderItem = group.items.find(item =>
                    item.product_id.toString() === dispatchItem.product_id.toString()
                );

                if (orderItem) {
                    // Increment dispatched quantity
                    orderItem.dispatched_quantity = (orderItem.dispatched_quantity || 0) + (dispatchItem.quantity || 0);
                    // Update balance quantity
                    orderItem.balance_quantity = orderItem.quantity - orderItem.dispatched_quantity;
                    console.log(`Updated item ${orderItem.product_code}: dispatched=${orderItem.dispatched_quantity}, balance=${orderItem.balance_quantity}`);
                    break; // Found the item, no need to search further
                }
            }
        }

        // Determine order status based on dispatched quantities
        let allItemsFullyDispatched = true;
        let anyItemPartiallyDispatched = false;

        for (const group of order.groups) {
            for (const item of group.items) {
                const dispatchedQty = item.dispatched_quantity || 0;
                const orderQty = item.quantity || 0;

                if (dispatchedQty >= orderQty) {
                    // This item is fully dispatched
                    continue;
                } else if (dispatchedQty > 0 && dispatchedQty < orderQty) {
                    // This item is partially dispatched
                    anyItemPartiallyDispatched = true;
                    allItemsFullyDispatched = false;
                } else {
                    // This item has not been dispatched yet
                    allItemsFullyDispatched = false;
                }
            }
        }

        // Update order status based on dispatch status
        if (allItemsFullyDispatched) {
            order.status = 'dispatching';
            console.log('✅ All items fully dispatched - Status changed to: dispatching');
        } else if (anyItemPartiallyDispatched) {
            order.status = 'partially dispatched';
            console.log('✅ Some items partially dispatched - Status changed to: partially dispatched');
        }

        // Save updated order
        await order.save();
        console.log('Order updated with dispatched quantities and status');

        res.status(201).json({
            success: true,
            message: 'Dispatch note created successfully',
            data: dispatch
        });

    } catch (error) {
        console.error('Error creating dispatch:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create dispatch note',
            error: error.message
        });
    }
};

// Get all dispatches
export const getAllDispatches = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            order_id,
            from_date,
            to_date,
            search
        } = req.query;

        const filter = {};

        if (status) filter.status = status;
        if (order_id) filter.order_id = order_id;

        if (from_date || to_date) {
            filter.dispatch_date = {};
            if (from_date) filter.dispatch_date.$gte = new Date(from_date);
            if (to_date) filter.dispatch_date.$lte = new Date(to_date);
        }

        if (search) {
            filter.$or = [
                { dispatch_no: { $regex: search, $options: 'i' } },
                { order_no: { $regex: search, $options: 'i' } },
                { party_name: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const dispatches = await Dispatch.find(filter)
            .populate('order_id', 'order_no status')
            .populate('created_by', 'User_Name User_Email')
            .sort({ dispatch_date: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Dispatch.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: dispatches,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching dispatches:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dispatches',
            error: error.message
        });
    }
};

// Get dispatch by ID
export const getDispatchById = async (req, res) => {
    try {
        const dispatch = await Dispatch.findById(req.params.id)
            .populate('order_id')
            .populate('created_by', 'User_Name User_Email');

        if (!dispatch) {
            return res.status(404).json({
                success: false,
                message: 'Dispatch not found'
            });
        }

        res.status(200).json({
            success: true,
            data: dispatch
        });

    } catch (error) {
        console.error('Error fetching dispatch:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dispatch',
            error: error.message
        });
    }
};

// Update dispatch status
export const updateDispatchStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const dispatch = await Dispatch.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!dispatch) {
            return res.status(404).json({
                success: false,
                message: 'Dispatch not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Dispatch status updated',
            data: dispatch
        });

    } catch (error) {
        console.error('Error updating dispatch:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update dispatch',
            error: error.message
        });
    }
};
