import Dispatch from './dispatch.model.js';
import Order from './order.model.js';
import SellRecord from './sellRecord.model.js';
import mongoose from 'mongoose';

// Utility function to round to 2 decimal places
const roundTo2Decimals = (num) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Create dispatch note
export const createDispatch = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const userName = req.user?.User_Name || 'Unknown User';

        console.log('Creating dispatch note:', req.body);
        console.log('Dispatch Items received:', JSON.stringify(req.body.items, null, 2));

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
        console.log('Dispatch items saved:', JSON.stringify(dispatch.items, null, 2));

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
        let totalItems = 0;
        let fullyDispatchedItems = 0;
        let partiallyDispatchedItems = 0;

        for (const group of order.groups) {
            for (const item of group.items) {
                totalItems++;
                const dispatchedQty = item.dispatched_quantity || 0;
                const orderQty = item.quantity || 0;

                console.log(`  📦 ${item.product_code}: Order=${orderQty}, Dispatched=${dispatchedQty}`);

                if (dispatchedQty >= orderQty) {
                    // This item is fully dispatched
                    fullyDispatchedItems++;
                    console.log(`     ✅ Fully dispatched`);
                } else if (dispatchedQty > 0 && dispatchedQty < orderQty) {
                    // This item is partially dispatched
                    partiallyDispatchedItems++;
                    anyItemPartiallyDispatched = true;
                    allItemsFullyDispatched = false;
                    console.log(`     🟡 Partially dispatched`);
                } else {
                    // This item has not been dispatched yet
                    allItemsFullyDispatched = false;
                    console.log(`     ⭕ Not dispatched`);
                }
            }
        }

        console.log(`\n📊 Dispatch Summary:`);
        console.log(`   Total Items: ${totalItems}`);
        console.log(`   Fully Dispatched: ${fullyDispatchedItems}`);
        console.log(`   Partially Dispatched: ${partiallyDispatchedItems}`);
        console.log(`   Not Dispatched: ${totalItems - fullyDispatchedItems - partiallyDispatchedItems}`);

        // Update order status based on dispatch status
        const previousStatus = order.status;
        if (allItemsFullyDispatched && totalItems > 0) {
            order.status = 'dispatching';
            console.log(`\n✅ Status Update: "${previousStatus}" → "dispatching" (All items fully dispatched)`);
        } else if (anyItemPartiallyDispatched) {
            order.status = 'partially dispatched';
            console.log(`\n🟡 Status Update: "${previousStatus}" → "partially dispatched" (Some items partially dispatched)`);
        } else {
            console.log(`\n⚪ Status remains: "${previousStatus}" (No change)`);
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

        console.log('📤 Sending dispatch to frontend:');
        console.log('Dispatch Items being sent:', JSON.stringify(dispatch.items, null, 2));

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

// Create sell record from dispatch
export const createSellRecordFromDispatch = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { dispatchId } = req.params;
        const {
            bill_date,
            bill_amount,
            mode_of_transport,
            vehicle_number,
            freight_remarks,
            transport_incharge_number,
            notes
        } = req.body;

        const userId = req.user?._id || req.user?.id;

        // Get dispatch details
        const dispatch = await Dispatch.findById(dispatchId)
            .populate('order_id')
            .session(session);

        if (!dispatch) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Dispatch not found'
            });
        }

        // Check if sell record already created for this dispatch
        if (dispatch.sell_record_created) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Sell record already created for this dispatch'
            });
        }

        // Generate bill number
        const bill_number = await generateBillNumber();

        // Prepare sell record items from dispatch items
        const sellRecordItems = dispatch.items.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            product_code: item.product_code,
            quantity: item.quantity,
            rate: roundTo2Decimals(item.net_rate || item.mrp),
            amount: roundTo2Decimals(item.total_amount || (item.quantity * (item.net_rate || item.mrp)))
        }));

        // Create sell record
        const sellRecord = new SellRecord({
            bill_number,
            bill_date: new Date(bill_date),
            bill_amount: bill_amount,
            customer_name: dispatch.party_billing_name || dispatch.party_name,
            customer_phone: '',
            customer_address: dispatch.site_address || dispatch.party_address,
            items: sellRecordItems,
            status: 'completed',
            payment_status: 'pending',
            mode_of_transport,
            vehicle_number,
            freight_remarks,
            transport_incharge_number,
            notes,
            dispatch_id: dispatch._id,
            order_id: dispatch.order_id,
            created_by: userId
        });

        await sellRecord.save({ session });

        // Update dispatch to mark sell record created
        dispatch.sell_record_id = sellRecord._id;
        dispatch.sell_record_created = true;
        await dispatch.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: 'Sell record created successfully from dispatch',
            data: {
                sellRecord,
                dispatch
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error creating sell record from dispatch:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create sell record from dispatch'
        });
    }
};

// Get dispatches by order ID
export const getDispatchesByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params;

        const dispatches = await Dispatch.find({ order_id: orderId })
            .populate('sell_record_id')
            .sort({ dispatch_date: -1 });

        res.status(200).json({
            success: true,
            data: dispatches
        });

    } catch (error) {
        console.error('Error fetching dispatches by order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dispatches',
            error: error.message
        });
    }
};

