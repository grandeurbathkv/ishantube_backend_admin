import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PurchaseRequest from './src/moduls/Inventory/purchaseRequest.model.js';
import Order from './src/moduls/Inventory/order.model.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected successfully.');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};

// Fix all awaiting_dispatch PRs - update their related Orders
const fixAwaitingDispatchOrders = async () => {
    try {
        console.log('\n========================================');
        console.log('🔧 Starting to fix awaiting_dispatch orders...');
        console.log('========================================\n');

        // Find all PRs with status awaiting_dispatch
        const awaitingDispatchPRs = await PurchaseRequest.find({ 
            status: 'awaiting_dispatch' 
        });

        console.log(`📋 Found ${awaitingDispatchPRs.length} PRs with awaiting_dispatch status\n`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const pr of awaitingDispatchPRs) {
            console.log(`\n🔍 Processing PR: ${pr.PR_Number}`);
            console.log(`   - PR Status: ${pr.status}`);
            console.log(`   - PR Vendor: ${pr.PR_Vendor}`);
            console.log(`   - Items count: ${pr.items?.length || 0}`);

            // Get all unique order IDs from PR items
            const orderIds = pr.items.map(item => item.order_id).filter(Boolean);
            const uniqueOrderIds = [...new Set(orderIds.map(id => id.toString()))];

            console.log(`   - Unique Orders: ${uniqueOrderIds.length}`);

            for (const orderId of uniqueOrderIds) {
                try {
                    const order = await Order.findById(orderId);
                    
                    if (order) {
                        console.log(`\n   📦 Order: ${order.order_no}`);
                        console.log(`      - Current Status: ${order.status}`);
                        
                        if (order.status !== 'awaiting_dispatch') {
                            console.log(`      🔄 Updating from "${order.status}" to "awaiting_dispatch"`);
                            order.status = 'awaiting_dispatch';
                            await order.save();
                            console.log(`      ✅ Updated successfully!`);
                            updatedCount++;
                        } else {
                            console.log(`      ⏭️ Already in awaiting_dispatch status`);
                            skippedCount++;
                        }
                    } else {
                        console.log(`      ⚠️ Order not found for ID: ${orderId}`);
                    }
                } catch (orderError) {
                    console.error(`      ❌ Error updating order ${orderId}:`, orderError.message);
                }
            }
        }

        console.log('\n========================================');
        console.log('✅ Fix completed!');
        console.log(`📊 Summary:`);
        console.log(`   - PRs processed: ${awaitingDispatchPRs.length}`);
        console.log(`   - Orders updated: ${updatedCount}`);
        console.log(`   - Orders skipped (already correct): ${skippedCount}`);
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Error fixing awaiting_dispatch orders:', error);
        console.error('Error details:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
        process.exit(0);
    }
};

// Run the fix
(async () => {
    await connectDB();
    await fixAwaitingDispatchOrders();
})();
