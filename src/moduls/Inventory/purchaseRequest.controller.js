import PurchaseRequest from './purchaseRequest.model.js';
import mongoose from 'mongoose';
import { Product } from './product.model.js';

// Create a new Purchase Request
export const createPurchaseRequest = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const userName = req.user?.User_Name || 'Unknown User';

        console.log('\n🔷 ==================== CREATE PR REQUEST START ====================');
        console.log('🔷 User ID:', userId);
        console.log('🔷 User Name:', userName);
        console.log('🔷 Request body:', JSON.stringify(req.body, null, 2));

        // Validate user authentication
        if (!userId) {
            console.error('❌ User not authenticated');
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        // Validate required fields
        if (!req.body.PR_Vendor || req.body.PR_Vendor.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'PR Vendor is required'
            });
        }

        if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one item is required'
            });
        }

        // Create PR data
        const prData = {
            PR_Date: req.body.PR_Date || new Date(),
            PR_Vendor: req.body.PR_Vendor,
            PI_Received: req.body.PI_Received || false,
            items: req.body.items,
            status: req.body.status || 'pending',
            remarks: req.body.remarks || '',
            created_by: userId,
            created_by_name: userName
        };

        console.log('🔷 Creating PR with data:', {
            ...prData,
            items: `${prData.items.length} items`,
            created_by: userId
        });

        // Create new Purchase Request
        const purchaseRequest = new PurchaseRequest(prData);
        await purchaseRequest.save();

        console.log('✅ Purchase Request created successfully:', purchaseRequest.PR_Number);
        console.log('📋 PR Items count:', purchaseRequest.items.length);
        console.log('🏢 PR Vendor:', purchaseRequest.PR_Vendor);
        console.log('📅 PR Date:', purchaseRequest.PR_Date);
        console.log('🔷 ==================== CREATE PR REQUEST END ====================\n');

        res.status(201).json({
            success: true,
            message: 'Purchase Request created successfully',
            data: purchaseRequest
        });

    } catch (error) {
        console.error('Error creating Purchase Request:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Purchase Request with this PR Number already exists',
                error: error.message
            });
        }

        if (error.name === 'ValidationError') {
            console.error('Validation errors:', error.errors);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: error.message,
                details: error.errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create Purchase Request',
            error: error.message
        });
    }
};

// Get all Purchase Requests with filters and pagination
export const getAllPurchaseRequests = async (req, res) => {
    try {
        console.log('\n');
        console.log('========================================');
        console.log('🔵 BACKEND PR FETCH Step 1: getAllPurchaseRequests API called');
        console.log('========================================');

        const {
            page = 1,
            limit = 10,
            status,
            PR_Vendor,
            PI_Received,
            from_date,
            to_date,
            search,
            sort_by = 'PR_Date',
            sort_order = 'desc'
        } = req.query;

        console.log('🔵 BACKEND PR FETCH Step 2: Query parameters:', req.query);
        console.log('🔵 BACKEND PR FETCH Step 3: Parsed parameters:');
        console.log('   - page:', page);
        console.log('   - limit:', limit);
        console.log('   - status:', status);
        console.log('   - PR_Vendor:', PR_Vendor);
        console.log('   - PI_Received:', PI_Received);
        console.log('   - search:', search);
        console.log('   - sort_by:', sort_by);
        console.log('   - sort_order:', sort_order);

        // Build filter query
        const filter = {};

        if (status) {
            console.log('🔵 BACKEND PR FETCH Step 4: Adding status filter:', status);
            // Handle comma-separated status values (e.g., "intrasite,completed")
            if (status.includes(',')) {
                const statusArray = status.split(',').map(s => s.trim());
                console.log('🔵 BACKEND PR FETCH Step 4.1: Multiple statuses:', statusArray);
                filter.status = { $in: statusArray };
            } else {
                filter.status = status;
            }
        }

        if (PR_Vendor) {
            console.log('🔵 BACKEND PR FETCH Step 5: Adding PR_Vendor filter:', PR_Vendor);
            filter.PR_Vendor = { $regex: PR_Vendor, $options: 'i' };
        }

        if (PI_Received !== undefined && PI_Received !== '') {
            const piReceivedBool = PI_Received === 'true' || PI_Received === true;
            console.log('🔵 BACKEND PR FETCH Step 6: Adding PI_Received filter:', PI_Received, '→', piReceivedBool);
            filter.PI_Received = piReceivedBool;
        }

        // Material Received filter
        if (req.query.material_received !== undefined && req.query.material_received !== '') {
            const materialReceivedBool = req.query.material_received === 'true' || req.query.material_received === true;
            console.log('🔵 BACKEND PR FETCH Step 6.1: Adding material_received filter:', req.query.material_received, '→', materialReceivedBool);
            filter.material_received = materialReceivedBool;
        }

        // Date range filter
        if (from_date || to_date) {
            filter.PR_Date = {};
            if (from_date) {
                console.log('🔵 BACKEND PR FETCH Step 7: Adding from_date filter:', from_date);
                filter.PR_Date.$gte = new Date(from_date);
            }
            if (to_date) {
                const toDate = new Date(to_date);
                toDate.setHours(23, 59, 59, 999);
                console.log('🔵 BACKEND PR FETCH Step 8: Adding to_date filter:', to_date);
                filter.PR_Date.$lte = toDate;
            }
        }

        // Search filter
        if (search) {
            console.log('🔵 BACKEND PR FETCH Step 9: Adding search filter:', search);
            filter.$or = [
                { PR_Number: { $regex: search, $options: 'i' } },
                { PR_Vendor: { $regex: search, $options: 'i' } },
                { 'items.product_name': { $regex: search, $options: 'i' } },
                { 'items.product_code': { $regex: search, $options: 'i' } }
            ];
        }

        console.log('🔵 BACKEND PR FETCH Step 10: Final filter object:', JSON.stringify(filter, null, 2));

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOrder = sort_order === 'asc' ? 1 : -1;
        const sortObj = { [sort_by]: sortOrder };

        console.log('🔵 BACKEND PR FETCH Step 11: Pagination - skip:', skip, 'limit:', parseInt(limit));
        console.log('🔵 BACKEND PR FETCH Step 12: Sort object:', sortObj);

        // Get total count
        console.log('🔵 BACKEND PR FETCH Step 13: Counting documents with filter...');
        const total = await PurchaseRequest.countDocuments(filter);
        console.log('🔵 BACKEND PR FETCH Step 14: Total documents found:', total);

        // Get Purchase Requests
        console.log('🔵 BACKEND PR FETCH Step 15: Fetching Purchase Requests from database...');
        const purchaseRequests = await PurchaseRequest.find(filter)
            .populate('created_by', 'User_Name User_Email')
            .populate('approved_by', 'User_Name User_Email')
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit));

        console.log('🔵 BACKEND PR FETCH Step 16: Found', purchaseRequests.length, 'Purchase Requests');

        // Log each PR's details
        purchaseRequests.forEach((pr, index) => {
            console.log(`🔵 BACKEND PR FETCH Step 17.${index}: PR #${index + 1}`);
            console.log(`   - PR Number: ${pr.PR_Number}`);
            console.log(`   - PR Status: "${pr.status}"`);
            console.log(`   - PR Vendor: ${pr.PR_Vendor}`);
            console.log(`   - PI Received: ${pr.PI_Received}`);
            console.log(`   - Order ID: ${pr.order_id}`);
            console.log(`   - Items count: ${pr.items?.length}`);
            if (pr.items && pr.items.length > 0) {
                pr.items.forEach((item, itemIndex) => {
                    console.log(`   - Item ${itemIndex + 1} order_id: ${item.order_id}`);
                });
            }
        });

        console.log('🔵 BACKEND PR FETCH Step 18: Preparing response...');
        console.log('========================================\n');

        res.status(200).json({
            success: true,
            message: 'Purchase Requests retrieved successfully',
            data: purchaseRequests,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('🔴 BACKEND PR FETCH ERROR:', error);
        console.error('🔴 Error message:', error.message);
        console.error('🔴 Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Purchase Requests',
            error: error.message
        });
    }
};

// Get Purchase Request by ID
export const getPurchaseRequestById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Purchase Request ID'
            });
        }

        const purchaseRequest = await PurchaseRequest.findById(id)
            .populate('created_by', 'User_Name User_Email')
            .populate('approved_by', 'User_Name User_Email')
            .populate('items.order_id')
            .populate('items.product_id');

        if (!purchaseRequest) {
            return res.status(404).json({
                success: false,
                message: 'Purchase Request not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Purchase Request retrieved successfully',
            data: purchaseRequest
        });

    } catch (error) {
        console.error('Error fetching Purchase Request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Purchase Request',
            error: error.message
        });
    }
};

// Update Purchase Request
export const updatePurchaseRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id || req.user?.id;
        const userName = req.user?.User_Name || 'Unknown User';

        console.log('\n🔷 ==================== UPDATE PR REQUEST START ====================');
        console.log('🔷 PR ID:', id);
        console.log('🔷 User ID:', userId);
        console.log('🔷 User Name:', userName);
        console.log('🔷 Update data:', JSON.stringify(req.body, null, 2));

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Purchase Request ID'
            });
        }

        const purchaseRequest = await PurchaseRequest.findById(id);

        if (!purchaseRequest) {
            return res.status(404).json({
                success: false,
                message: 'Purchase Request not found'
            });
        }

        // Update fields
        const allowedUpdates = ['PR_Vendor', 'PI_Received', 'status', 'remarks', 'pi_number', 'pi_date', 'pi_amount', 'items',
            'payment_done', 'payment_amount', 'payment_utr', 'payment_mode', 'payment_reference', 'payment_bank', 'payment_date', 'payment_remarks'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // If PI is received, ensure PI details are provided and set status to awaiting_payment
        if (req.body.PI_Received === true) {
            if (!req.body.pi_number || !req.body.pi_date) {
                return res.status(400).json({
                    success: false,
                    message: 'PI Number and PI Date are required when marking PR as received'
                });
            }
            // Auto set status to awaiting_payment when PI is received
            if (!req.body.status) {
                updates.status = 'awaiting_payment';
            }
            console.log('✅ PI Details:', {
                pi_number: req.body.pi_number,
                pi_date: req.body.pi_date,
                pi_amount: req.body.pi_amount,
                status: updates.status
            });
        }

        // If payment is done, ensure payment details are provided and change status based on payment amount
        if (req.body.payment_done === true) {
            if (!req.body.payment_amount || req.body.payment_amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment Amount is required when recording payment'
                });
            }
            if (!req.body.payment_utr || !req.body.payment_mode) {
                return res.status(400).json({
                    success: false,
                    message: 'UTR Code and Payment Mode are required when recording payment'
                });
            }

            // Check if payment is full or partial by comparing with PI amount
            const piAmount = purchaseRequest.pi_amount || 0;
            const paymentAmount = req.body.payment_amount || 0;

            console.log('💰 Payment Comparison:', {
                pi_amount: piAmount,
                payment_amount: paymentAmount,
                is_full_payment: paymentAmount >= piAmount
            });

            // Set status based on full or partial payment
            if (paymentAmount >= piAmount && piAmount > 0) {
                // Full payment - set to awaiting_dispatch
                updates.status = 'awaiting_dispatch';
                console.log('✅ Full payment detected - Status set to awaiting_dispatch');

                // Update Product Ordered Quantity for all items in the PI
                console.log('📦 Updating Product Ordered Quantities...');
                try {
                    const Product = mongoose.model('Product');
                    for (const item of purchaseRequest.items) {
                        if (item.product_id) {
                            const product = await Product.findById(item.product_id);
                            if (product) {
                                const quantityToAdd = item.pi_received_quantity || item.quantity || 0;
                                product.Product_Ordered_Quantity = (product.Product_Ordered_Quantity || 0) + quantityToAdd;
                                await product.save();
                                console.log(`✅ Added ${quantityToAdd} to ordered quantity of ${product.Prod_Name} (${product.Prod_Code}). New ordered qty: ${product.Product_Ordered_Quantity}`);
                            }
                        }
                    }
                } catch (productUpdateError) {
                    console.error('⚠️ Error updating Product Ordered Quantities:', productUpdateError.message);
                    // Don't fail payment if product update fails
                }
            } else {
                // Partial payment - set to partial_payment
                updates.status = 'partial_payment';
                console.log('⚠️ Partial payment detected - Status set to partial_payment');
            }

            updates.payment_date = req.body.payment_date || new Date();
            console.log('✅ Payment Details:', {
                payment_amount: req.body.payment_amount,
                payment_utr: req.body.payment_utr,
                payment_mode: req.body.payment_mode,
                payment_reference: req.body.payment_reference,
                payment_bank: req.body.payment_bank,
                status: updates.status
            });
        }

        // ✅ UPDATE RELATED ORDERS TO 'awaiting_dispatch' STATUS when PR status changes
        // This happens when payment is done OR status is manually set to awaiting_dispatch
        if (updates.status === 'awaiting_dispatch' && purchaseRequest.status !== 'awaiting_dispatch') {
            console.log('🔄 PR Status changing to awaiting_dispatch - Updating related Order statuses...');
            try {
                const Order = mongoose.model('Order');
                const orderIds = purchaseRequest.items.map(item => item.order_id).filter(Boolean);
                const uniqueOrderIds = [...new Set(orderIds.map(id => id.toString()))];

                console.log('📦 Found', uniqueOrderIds.length, 'unique orders to update:', uniqueOrderIds);

                for (const orderId of uniqueOrderIds) {
                    console.log('🔍 Processing order ID:', orderId);
                    const order = await Order.findById(orderId);
                    if (order) {
                        console.log('📋 Found Order:', order.order_no, 'Current status:', order.status);
                        if (order.status !== 'awaiting_dispatch') {
                            console.log('🔄 Updating Order:', order.order_no, 'from', order.status, 'to awaiting_dispatch');
                            order.status = 'awaiting_dispatch';
                            order.updated_by = userId;
                            order.updated_by_name = userName;
                            await order.save();
                            console.log('✅ Order', order.order_no, 'updated successfully to awaiting_dispatch');
                        } else {
                            console.log('⏭️ Order', order.order_no, 'already in awaiting_dispatch status');
                        }
                    } else {
                        console.log('⚠️ Order not found for ID:', orderId);
                    }
                }
            } catch (orderUpdateError) {
                console.error('⚠️ Error updating Order statuses:', orderUpdateError.message);
                console.error('⚠️ Error stack:', orderUpdateError.stack);
                // Don't fail the PR update if order update fails
            }
        }

        // If status is being approved, add approval details
        if (req.body.status === 'approved' && purchaseRequest.status !== 'approved') {
            updates.approved_by = userId;
            updates.approved_date = new Date();
            console.log('✅ PR approved by user:', userId);
        }

        Object.assign(purchaseRequest, updates);
        await purchaseRequest.save();

        console.log('✅ Purchase Request updated successfully:', purchaseRequest.PR_Number);
        console.log('📋 Status:', purchaseRequest.status);
        console.log('📦 PI Received:', purchaseRequest.PI_Received);
        if (purchaseRequest.pi_number) {
            console.log('📄 PI Number:', purchaseRequest.pi_number);
        }
        console.log('🔷 ==================== UPDATE PR REQUEST END ====================\n');

        res.status(200).json({
            success: true,
            message: 'Purchase Request updated successfully',
            data: purchaseRequest
        });

    } catch (error) {
        console.error('❌ Error updating Purchase Request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update Purchase Request',
            error: error.message
        });
    }
};

// Delete Purchase Request
export const deletePurchaseRequest = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Purchase Request ID'
            });
        }

        const purchaseRequest = await PurchaseRequest.findByIdAndDelete(id);

        if (!purchaseRequest) {
            return res.status(404).json({
                success: false,
                message: 'Purchase Request not found'
            });
        }

        console.log('✅ Purchase Request deleted successfully:', purchaseRequest.PR_Number);

        res.status(200).json({
            success: true,
            message: 'Purchase Request deleted successfully',
            data: purchaseRequest
        });

    } catch (error) {
        console.error('Error deleting Purchase Request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete Purchase Request',
            error: error.message
        });
    }
};

// Record Material Received
export const recordMaterialReceived = async (req, res) => {
    try {
        const { id } = req.params;
        const { vendor_invoice_number, invoice_date, material_received_date, items } = req.body;

        console.log('\n🔷 ==================== RECORD MATERIAL RECEIVED ====================');
        console.log('🔷 Purchase Request ID:', id);
        console.log('🔷 Request body:', JSON.stringify(req.body, null, 2));

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Purchase Request ID'
            });
        }

        // Validate required fields
        if (!vendor_invoice_number || !invoice_date || !material_received_date) {
            return res.status(400).json({
                success: false,
                message: 'Vendor Invoice Number, Invoice Date, and Material Received Date are required'
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Items data is required'
            });
        }

        // Find the purchase request
        const purchaseRequest = await PurchaseRequest.findById(id);

        if (!purchaseRequest) {
            return res.status(404).json({
                success: false,
                message: 'Purchase Request not found'
            });
        }

        // Validate quantities for each item
        for (const itemData of items) {
            const item = purchaseRequest.items.find(i => i.item_id === itemData.item_id);
            if (!item) {
                return res.status(400).json({
                    success: false,
                    message: `Item with item_id ${itemData.item_id} not found in Purchase Request`
                });
            }

            const freshStockReceived = itemData.fresh_stock_received || 0;
            const damagedStockReceived = itemData.damaged_stock_received || 0;
            const shortQtyReceived = itemData.short_qty_received || 0;
            const totalReceived = freshStockReceived + damagedStockReceived + shortQtyReceived;

            // Get the order quantity - use pi_received_quantity (PI order qty)
            const orderQty = item.pi_received_quantity || 0;

            console.log(`📦 Validating Item ${item.item_id}:`, {
                freshStockReceived,
                damagedStockReceived,
                shortQtyReceived,
                totalReceived,
                orderQty
            });

            // Validation: Total received quantity should not exceed order quantity
            if (totalReceived > orderQty) {
                return res.status(400).json({
                    success: false,
                    message: `Total received quantity (${totalReceived}) for item ${item.product_code} cannot exceed order quantity (${orderQty}). Please check: Fresh Stock (${freshStockReceived}) + Damaged Stock (${damagedStockReceived}) + Short Qty (${shortQtyReceived}).`
                });
            }
        }

        // All validations passed, now update the purchase request and products
        console.log('✅ All validations passed. Updating Purchase Request and Products...');

        // Update material received details
        purchaseRequest.material_received = true;
        purchaseRequest.material_received_date = material_received_date;
        purchaseRequest.vendor_invoice_number = vendor_invoice_number;
        purchaseRequest.invoice_date = invoice_date;
        // Note: Status remains 'intrasite' - only material_received flag changes

        // Update items and product stocks
        for (const itemData of items) {
            const item = purchaseRequest.items.find(i => i.item_id === itemData.item_id);
            if (item) {
                const freshStockReceived = itemData.fresh_stock_received || 0;
                const damagedStockReceived = itemData.damaged_stock_received || 0;
                const shortQtyReceived = itemData.short_qty_received || 0;
                const totalReceived = freshStockReceived + damagedStockReceived + shortQtyReceived;

                // Update item quantities in PR
                item.fresh_stock_received = freshStockReceived;
                item.damaged_stock_received = damagedStockReceived;
                item.short_qty_received = shortQtyReceived;

                console.log(`📝 Updated PR Item ${item.item_id}:`, {
                    freshStockReceived,
                    damagedStockReceived,
                    shortQtyReceived
                });

                // Update Product stock if product_id exists
                if (item.product_id) {
                    try {
                        const product = await Product.findById(item.product_id);

                        if (product) {
                            // Add fresh stock to Product_Fresh_Stock
                            product.Product_Fresh_Stock = (product.Product_Fresh_Stock || 0) + freshStockReceived;

                            // Add damaged stock to Product_Damage_stock
                            product.Product_Damage_stock = (product.Product_Damage_stock || 0) + damagedStockReceived;

                            // Reduce in-transit quantity (intrasite quantity)
                            const currentInTransit = product.Product_In_Transit_Quantity || 0;
                            const newInTransit = Math.max(0, currentInTransit - totalReceived);
                            product.Product_In_Transit_Quantity = newInTransit;

                            await product.save();

                            console.log(`✅ Updated Product ${product.Product_code}:`, {
                                fresh_stock_added: freshStockReceived,
                                new_fresh_stock: product.Product_Fresh_Stock,
                                damaged_stock_added: damagedStockReceived,
                                new_damaged_stock: product.Product_Damage_stock,
                                old_in_transit: currentInTransit,
                                new_in_transit: product.Product_In_Transit_Quantity,
                                reduced_by: totalReceived
                            });
                        } else {
                            console.warn(`⚠️ Product not found for ID: ${item.product_id}`);
                        }
                    } catch (productError) {
                        console.error(`❌ Error updating product ${item.product_id}:`, productError);
                        // Continue with other items even if one fails
                    }
                }
            }
        }

        await purchaseRequest.save();

        console.log('✅ Material Received recorded successfully for PR:', purchaseRequest.PR_Number);

        res.status(200).json({
            success: true,
            message: 'Material Received recorded successfully',
            data: purchaseRequest
        });

    } catch (error) {
        console.error('❌ Error recording Material Received:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record Material Received',
            error: error.message
        });
    }
};
