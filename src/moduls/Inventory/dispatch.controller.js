import Dispatch from './dispatch.model.js';
import Order from './order.model.js';
import SellRecord from './sellRecord.model.js';
import { Product } from './product.model.js';
import mongoose from 'mongoose';
import { Site } from '../customer/site.model.js';
import { Party } from '../customer/party.model.js';

// Utility function to round to 2 decimal places
const roundTo2Decimals = (num) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Create dispatch note
export const createDispatch = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const userName = req.user?.['User Name'] || 'Unknown User';

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

        // Update product stock: ONLY increase on-hold qty
        // NOTE: Fresh stock stays UNCHANGED at dispatch time.
        // Fresh stock will be reduced only when the Sell Record is created (Step 4).
        for (const dispatchItem of req.body.items) {
            if (dispatchItem.product_id) {
                try {
                    const product = await Product.findById(dispatchItem.product_id);
                    if (product) {
                        // ONLY add to on-hold quantity - DO NOT reduce fresh stock here
                        const prevOnHold = product.Product_On_Hold_Qty || 0;
                        product.Product_On_Hold_Qty = prevOnHold + (dispatchItem.quantity || 0);
                        await product.save();
                        console.log(`✅ Dispatch stock update for ${product.Product_code}: On Hold ${prevOnHold} → ${product.Product_On_Hold_Qty} (+${dispatchItem.quantity}). Fresh Stock UNCHANGED: ${product.Product_Fresh_Stock}`);
                    }
                } catch (error) {
                    console.error(`Error updating product ${dispatchItem.product_id}:`, error);
                }
            }
        }

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

        // Emit socket event for real-time stock update
        const io = req.app.get('io');
        if (io) {
            // Emit product stock updates for each item
            for (const dispatchItem of req.body.items) {
                if (dispatchItem.product_id) {
                    const product = await Product.findById(dispatchItem.product_id);
                    if (product) {
                        io.emit('product_stock_updated', {
                            product_id: product._id,
                            product_code: product.Product_code,
                            fresh_stock: product.Product_Fresh_Stock,
                            on_hold_qty: product.Product_On_Hold_Qty,
                            action: 'dispatch_created',
                            timestamp: new Date()
                        });
                    }
                }
            }
        }

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
            search,
            sell_record_created,
            party_id,
            site_id
        } = req.query;

        const filter = {};

        if (status) filter.status = status;
        if (order_id) filter.order_id = order_id;
        if (party_id) filter.party_id = party_id;
        if (site_id) filter.site_id = site_id;
        if (sell_record_created !== undefined && sell_record_created !== '') {
            filter.sell_record_created = sell_record_created === 'true';
        }

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
            .populate('order_id', 'order_no status net_amount_payable')
            .populate({ path: 'created_by', select: { 'User Name': 1, 'Email id': 1 } })
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
            .populate('site_id')          // populate Site document for fallback
            .populate({ path: 'created_by', select: { 'User Name': 1, 'Email id': 1 } });

        if (!dispatch) {
            return res.status(404).json({
                success: false,
                message: 'Dispatch not found'
            });
        }

        console.log('📤 Sending dispatch to frontend:');
        console.log('Dispatch Items being sent:', JSON.stringify(dispatch.items, null, 2));

        // Convert to plain object so we can enrich with fallback fields
        const dispatchObj = dispatch.toObject();
        const orderData = dispatchObj.order_id || {};
        const siteDoc = dispatchObj.site_id || {};   // populated Site document

        // site_name: dispatch → order → Site collection (Site_Billing_Name)
        dispatchObj.site_name =
            dispatchObj.site_name ||
            orderData.site_name ||
            siteDoc.Site_Billing_Name || '';

        // site_address: dispatch → order → Site collection (Site_Address)
        dispatchObj.site_address =
            dispatchObj.site_address ||
            orderData.site_address ||
            siteDoc.Site_Address || '';

        // site_contact_person: order → Site collection (Contact_Person)
        dispatchObj.site_contact_person =
            orderData.site_contact_person ||
            siteDoc.Contact_Person || '';

        // site_mobile: order → Site collection (Mobile_Number)
        dispatchObj.site_mobile =
            orderData.site_mobile ||
            siteDoc.Mobile_Number || '';

        // ── LAST RESORT: if site_name is still empty, find the first site
        //    linked to the order's party from the Site collection
        if (!dispatchObj.site_name && orderData.party_id) {
            // Site uses Site_party_id (String like 'PTY001'), not ObjectId
            // So we first fetch the Party to get its Party_id string
            const party = await Party.findById(orderData.party_id).lean();
            if (party && party.Party_id) {
                const partySite = await Site.findOne({ Site_party_id: party.Party_id }).lean();
                if (partySite) {
                    dispatchObj.site_name = partySite.Site_Billing_Name || '';
                    dispatchObj.site_address = dispatchObj.site_address || partySite.Site_Address || '';
                    dispatchObj.site_contact_person = dispatchObj.site_contact_person || partySite.Contact_Person || '';
                    dispatchObj.site_mobile = dispatchObj.site_mobile || partySite.Mobile_Number || '';
                    console.log('ℹ️  Site data loaded from party fallback:', partySite.Site_Billing_Name);
                } else {
                    console.log('⚠️  No site found for party:', party.Party_id);
                }
            }
        }

        // ── FINAL JUGAD: if site data is STILL empty after all lookups,
        //    use the party's own billing info from the order as site info.
        //    This handles orders created without a site selection.
        if (!dispatchObj.site_name) {
            dispatchObj.site_name = orderData.party_billing_name || orderData.party_name || '';
            dispatchObj.site_address = dispatchObj.site_address || orderData.party_address || '';
            dispatchObj.site_contact_person = dispatchObj.site_contact_person || orderData.party_contact_person || '';
            dispatchObj.site_mobile = dispatchObj.site_mobile || orderData.party_mobile || '';
            if (dispatchObj.site_name) {
                console.log('ℹ️  Site data filled from party billing info (jugad):', dispatchObj.site_name);
            }
        }

        console.log('Site fields sent:', {
            site_name: dispatchObj.site_name,
            site_address: dispatchObj.site_address,
            site_contact_person: dispatchObj.site_contact_person,
            site_mobile: dispatchObj.site_mobile,
        });

        res.status(200).json({
            success: true,
            data: dispatchObj
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
            document_number,
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
            document_number,
            notes,
            dispatch_id: dispatch._id,
            order_id: dispatch.order_id,
            created_by: userId
        });

        await sellRecord.save({ session });

        // Update dispatch to mark sell record created and set status to delivered (Dispatched)
        dispatch.sell_record_id = sellRecord._id;
        dispatch.sell_record_created = true;
        dispatch.status = 'delivered';
        await dispatch.save({ session });

        // Update order status to 'dispatched' when sell record is created
        if (dispatch.order_id) {
            await Order.findByIdAndUpdate(
                dispatch.order_id,
                { status: 'dispatched' },
                { session }
            );
            console.log(`✅ Order status updated to 'dispatched' for order: ${dispatch.order_id}`);
        }

        // ====== STEP 4 STOCK MOVEMENT ======
        // When sell record is created: reduce BOTH Product_Fresh_Stock AND Product_On_Hold_Qty
        // This reflects that items have been physically sold and handed over.
        console.log('📦 Updating product stock for sell record items...');
        for (const item of sellRecordItems) {
            try {
                const product = await Product.findById(item.product_id).session(session);
                if (product) {
                    const prevFreshStock = product.Product_Fresh_Stock || 0;
                    const prevOnHold = product.Product_On_Hold_Qty || 0;

                    // Reduce fresh stock by sold quantity
                    product.Product_Fresh_Stock = Math.max(0, prevFreshStock - item.quantity);
                    // Reduce on-hold qty by sold quantity (items are no longer on hold)
                    product.Product_On_Hold_Qty = Math.max(0, prevOnHold - item.quantity);

                    await product.save({ session });
                    console.log(`✅ Sell record stock update for ${item.product_code}:`);
                    console.log(`   Fresh Stock: ${prevFreshStock} → ${product.Product_Fresh_Stock} (-${item.quantity})`);
                    console.log(`   On Hold Qty: ${prevOnHold} → ${product.Product_On_Hold_Qty} (-${item.quantity})`);
                } else {
                    console.warn(`⚠️ Product not found for stock update: ${item.product_id}`);
                }
            } catch (productError) {
                console.error(`❌ Error updating product ${item.product_id} stock:`, productError);
                throw productError; // Re-throw to rollback the entire transaction
            }
        }
        console.log('✅ All product stocks updated successfully for sell record');
        // ====== END STOCK MOVEMENT ======

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

// Delete a pending dispatch (only allowed if sell_record_created = false)
export const deleteDispatch = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;

        const dispatch = await Dispatch.findById(id).session(session);
        if (!dispatch) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Dispatch not found'
            });
        }

        // Only allow deletion if sell record has NOT been created
        if (dispatch.sell_record_created) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Cannot delete this dispatch. A sell record has already been created for it.'
            });
        }

        // Get the related order
        const order = await Order.findById(dispatch.order_id).session(session);
        if (!order) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Related order not found'
            });
        }

        // 1. Reverse Product_On_Hold_Qty for each dispatch item
        for (const dispatchItem of dispatch.items) {
            if (dispatchItem.product_id) {
                try {
                    const product = await Product.findById(dispatchItem.product_id).session(session);
                    if (product) {
                        const prevOnHold = product.Product_On_Hold_Qty || 0;
                        product.Product_On_Hold_Qty = Math.max(0, prevOnHold - (dispatchItem.quantity || 0));
                        await product.save({ session });
                        console.log(`✅ Reversed on-hold for ${product.Product_code}: ${prevOnHold} → ${product.Product_On_Hold_Qty}`);
                    }
                } catch (err) {
                    console.error(`Error reversing on-hold for product ${dispatchItem.product_id}:`, err);
                }
            }
        }

        // 2. Reverse dispatched_quantity on order items
        for (const dispatchItem of dispatch.items) {
            for (const group of order.groups) {
                const orderItem = group.items.find(item =>
                    item.product_id && item.product_id.toString() === dispatchItem.product_id?.toString()
                );
                if (orderItem) {
                    orderItem.dispatched_quantity = Math.max(0, (orderItem.dispatched_quantity || 0) - (dispatchItem.quantity || 0));
                    orderItem.balance_quantity = orderItem.quantity - orderItem.dispatched_quantity;
                    console.log(`↩️ Reversed dispatch qty for ${orderItem.product_code}: dispatched=${orderItem.dispatched_quantity}, balance=${orderItem.balance_quantity}`);
                    break;
                }
            }
        }

        // 3. Recalculate order status after reversal
        let allItemsFullyDispatched = true;
        let anyItemPartiallyDispatched = false;
        let totalItems = 0;

        for (const group of order.groups) {
            for (const item of group.items) {
                totalItems++;
                const dispatched = item.dispatched_quantity || 0;
                const ordered = item.quantity || 0;
                if (dispatched >= ordered) {
                    // fully dispatched - do nothing
                } else if (dispatched > 0) {
                    anyItemPartiallyDispatched = true;
                    allItemsFullyDispatched = false;
                } else {
                    allItemsFullyDispatched = false;
                }
            }
        }

        const previousStatus = order.status;
        if (totalItems === 0 || (!allItemsFullyDispatched && !anyItemPartiallyDispatched)) {
            // Nothing dispatched — revert to awaiting_dispatch
            order.status = 'awaiting_dispatch';
        } else if (anyItemPartiallyDispatched) {
            order.status = 'partially dispatched';
        } else if (allItemsFullyDispatched) {
            order.status = 'dispatching';
        }
        console.log(`📋 Order status: "${previousStatus}" → "${order.status}"`);
        await order.save({ session });

        // 4. Delete the dispatch document
        await Dispatch.findByIdAndDelete(id, { session });

        await session.commitTransaction();
        session.endSession();

        console.log(`🗑️ Dispatch ${dispatch.dispatch_no} deleted successfully`);

        res.status(200).json({
            success: true,
            message: `Dispatch ${dispatch.dispatch_no} deleted successfully. Order quantities have been restored.`
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error deleting dispatch:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete dispatch'
        });
    }
};
