import Order from './order.model.js';

// Test endpoint to check database data (no auth required)
export const testDatabaseData = async (req, res) => {
    try {
        console.log('🔍 Testing database data...');

        // Get total orders count
        const totalOrders = await Order.countDocuments();
        console.log('Total orders in database:', totalOrders);

        // Get orders by status
        const awaitingDispatch = await Order.countDocuments({ status: 'awaiting_dispatch' });
        const intrasite = await Order.countDocuments({ status: 'intrasite' });
        const delivered = await Order.countDocuments({ status: 'delivered' });

        // Get all unique statuses in the database
        const allStatuses = await Order.distinct('status');

        console.log('Orders by status:');
        console.log('- awaiting_dispatch:', awaitingDispatch);
        console.log('- intrasite:', intrasite);
        console.log('- delivered:', delivered);
        console.log('All statuses in database:', allStatuses);

        // Get sample orders with any status
        const sampleOrders = await Order.find({}).limit(5).select('order_no status groups');

        console.log('Sample orders:');
        sampleOrders.forEach(order => {
            console.log(`- ${order.order_no} (${order.status}): ${order.groups?.length || 0} groups`);
            order.groups?.forEach(group => {
                console.log(`  - ${group.group_name}: ${group.items?.length || 0} items`);
                group.items?.forEach(item => {
                    const pending = (item.quantity || 0) - (item.dispatched_quantity || 0);
                    if (pending > 0) {
                        console.log(`    - ${item.product_name}: Ordered ${item.quantity}, Dispatched ${item.dispatched_quantity || 0}, Pending ${pending}`);
                    }
                });
            });
        });

        res.status(200).json({
            success: true,
            data: {
                totalOrders,
                statusCounts: { awaitingDispatch, intrasite, delivered },
                allStatuses,
                sampleOrders: sampleOrders.map(order => ({
                    order_no: order.order_no,
                    status: order.status,
                    groups: order.groups?.length || 0
                }))
            },
            message: 'Database test completed - check console for details'
        });

    } catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({
            success: false,
            message: 'Database test failed',
            error: error.message
        });
    }
};

// Get pending dispatch materials
export const getPendingDispatchMaterials = async (req, res) => {
    try {
        const { brand, group, page = 1, limit = 50, search = '' } = req.query;

        // Simple filter - get all orders that might have pending materials
        // Based on your database, the statuses are 'dispatching' and 'pending'
        const filter = {
            status: { $in: ['pending', 'dispatching', 'awaiting_dispatch', 'intrasite', 'delivered'] }
        };

        // Add search filter if provided
        if (search) {
            filter.$and = [
                {
                    $or: [
                        { order_no: { $regex: search, $options: 'i' } },
                        { company_name: { $regex: search, $options: 'i' } },
                        { party_name: { $regex: search, $options: 'i' } },
                        { 'groups.items.product_name': { $regex: search, $options: 'i' } },
                        { 'groups.items.product_code': { $regex: search, $options: 'i' } }
                    ]
                }
            ];
        }

        // Get orders - we'll filter for pending materials in JavaScript
        const orders = await Order.find(filter).sort({ order_date: -1 });

        console.log('📊 Pending Dispatch Debug:');
        console.log('Total orders found:', orders.length);
        console.log('Filter used:', JSON.stringify(filter, null, 2));

        // Process orders to extract pending materials
        const pendingMaterials = [];

        orders.forEach(order => {
            console.log(`Processing order: ${order.order_no} (Status: ${order.status})`);

            order.groups.forEach(orderGroup => {
                // Apply group filter if specified
                if (group && orderGroup.group_name.toLowerCase() !== group.toLowerCase()) {
                    return;
                }

                console.log(`  Group: ${orderGroup.group_name} (Items: ${orderGroup.items.length})`);

                orderGroup.items.forEach(item => {
                    // Apply brand filter if specified
                    if (brand && item.product_brand && item.product_brand.toLowerCase() !== brand.toLowerCase()) {
                        return;
                    }

                    const pendingQuantity = (item.quantity || 0) - (item.dispatched_quantity || 0);

                    console.log(`    Item: ${item.product_name} | Ordered: ${item.quantity} | Dispatched: ${item.dispatched_quantity || 0} | Pending: ${pendingQuantity}`);

                    if (pendingQuantity > 0) {
                        pendingMaterials.push({
                            _id: `${order._id}_${orderGroup._id}_${item._id}`,
                            order_id: order._id,
                            order_no: order.order_no,
                            order_date: order.order_date,
                            company_id: order.company_id,
                            company_name: order.company_name,
                            party_id: order.party_id,
                            party_name: order.party_name,
                            party_billing_name: order.party_billing_name,
                            site_id: order.site_id,
                            site_name: order.site_name,
                            group_name: orderGroup.group_name,
                            product_id: item.product_id,
                            product_code: item.product_code,
                            product_name: item.product_name,
                            product_description: item.product_description,
                            product_brand: item.product_brand,
                            ordered_quantity: item.quantity,
                            dispatched_quantity: item.dispatched_quantity || 0,
                            pending_quantity: pendingQuantity,
                            balance_quantity: item.balance_quantity || item.quantity,
                            mrp: item.mrp,
                            discount: item.discount,
                            discount_percentage: item.discount_percentage,
                            net_rate: item.net_rate,
                            gst_percentage: item.gst_percentage,
                            status: order.status,
                            priority: order.priority || 'normal'
                        });
                    }
                });
            });
        });

        // Get unique brands and groups for filters
        const uniqueBrands = [...new Set(pendingMaterials
            .map(item => item.product_brand)
            .filter(brand => brand)
            .sort())
        ];

        const uniqueGroups = [...new Set(pendingMaterials
            .map(item => item.group_name)
            .sort())
        ];

        console.log('📊 Final Results:');
        console.log('Total pending materials found:', pendingMaterials.length);
        console.log('Unique brands:', uniqueBrands.length);
        console.log('Unique groups:', uniqueGroups.length);

        // Apply pagination to the filtered results
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = startIndex + parseInt(limit);
        const paginatedMaterials = pendingMaterials.slice(startIndex, endIndex);

        console.log(`Returning ${paginatedMaterials.length} materials for page ${page} (${startIndex}-${endIndex})`);

        res.status(200).json({
            success: true,
            data: {
                materials: paginatedMaterials,
                filters: {
                    brands: uniqueBrands,
                    groups: uniqueGroups
                },
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: pendingMaterials.length,
                    totalPages: Math.ceil(pendingMaterials.length / parseInt(limit))
                }
            },
            message: 'Pending dispatch materials fetched successfully'
        });

    } catch (error) {
        console.error('Error fetching pending dispatch materials:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending dispatch materials',
            error: error.message
        });
    }
};

// Get pending materials summary
export const getPendingMaterialsSummary = async (req, res) => {
    try {
        // Get all orders that might have pending materials
        const orders = await Order.find({
            status: { $in: ['pending', 'dispatching', 'awaiting_dispatch', 'intrasite', 'delivered'] }
        });

        let totalOrders = 0;
        let totalPendingItems = 0;
        let totalPendingQuantity = 0;
        let totalPendingValue = 0;

        const brandSummary = {};
        const groupSummary = {};

        orders.forEach(order => {
            let orderHasPending = false;

            order.groups.forEach(orderGroup => {
                orderGroup.items.forEach(item => {
                    const pendingQuantity = (item.quantity || 0) - (item.dispatched_quantity || 0);

                    if (pendingQuantity > 0) {
                        orderHasPending = true;
                        totalPendingItems++;
                        totalPendingQuantity += pendingQuantity;
                        totalPendingValue += pendingQuantity * (item.net_rate || 0);

                        // Brand summary
                        if (item.product_brand) {
                            if (!brandSummary[item.product_brand]) {
                                brandSummary[item.product_brand] = {
                                    items: 0,
                                    quantity: 0,
                                    value: 0
                                };
                            }
                            brandSummary[item.product_brand].items++;
                            brandSummary[item.product_brand].quantity += pendingQuantity;
                            brandSummary[item.product_brand].value += pendingQuantity * (item.net_rate || 0);
                        }

                        // Group summary
                        if (!groupSummary[orderGroup.group_name]) {
                            groupSummary[orderGroup.group_name] = {
                                items: 0,
                                quantity: 0,
                                value: 0
                            };
                        }
                        groupSummary[orderGroup.group_name].items++;
                        groupSummary[orderGroup.group_name].quantity += pendingQuantity;
                        groupSummary[orderGroup.group_name].value += pendingQuantity * (item.net_rate || 0);
                    }
                });
            });

            if (orderHasPending) {
                totalOrders++;
            }
        });

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalOrders,
                    totalPendingItems,
                    totalPendingQuantity,
                    totalPendingValue: Math.round(totalPendingValue)
                },
                brandSummary,
                groupSummary
            },
            message: 'Pending materials summary fetched successfully'
        });

    } catch (error) {
        console.error('Error fetching pending materials summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending materials summary',
            error: error.message
        });
    }
};