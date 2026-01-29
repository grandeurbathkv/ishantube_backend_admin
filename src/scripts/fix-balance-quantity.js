import mongoose from 'mongoose';
import Order from '../moduls/Inventory/order.model.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ Error: MONGO_URI not found in .env file');
    process.exit(1);
}

/**
 * Script to fix:
 * 1. balance_quantity for all orders (quantity - dispatched_quantity)
 * 2. order status based on dispatch quantities
 */
async function fixOrdersData() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n📊 Fetching all orders...');
        const orders = await Order.find({});
        console.log(`✅ Found ${orders.length} orders\n`);

        let updatedOrderCount = 0;
        let balanceQtyFixedCount = 0;
        let statusChangedCount = 0;

        for (const order of orders) {
            let orderModified = false;
            let balanceQtyChanged = false;
            let statusChanged = false;

            console.log('='.repeat(80));
            console.log(`📦 Order: ${order.order_no} | Current Status: ${order.status}`);
            console.log('='.repeat(80));

            // Step 1: Fix balance_quantity for all items
            for (const group of order.groups) {
                for (const item of group.items) {
                    const dispatchedQty = item.dispatched_quantity || 0;
                    const orderQty = item.quantity || 0;
                    const correctBalanceQty = orderQty - dispatchedQty;
                    const currentBalanceQty = item.balance_quantity;

                    // Only update if balance_quantity is incorrect
                    if (currentBalanceQty !== correctBalanceQty) {
                        console.log(`  📝 ${item.product_name} (${item.product_code})`);
                        console.log(`     Order Qty: ${orderQty} | Dispatched: ${dispatchedQty}`);
                        console.log(`     ❌ Current Balance: ${currentBalanceQty}`);
                        console.log(`     ✅ Correct Balance: ${correctBalanceQty}`);

                        item.balance_quantity = correctBalanceQty;
                        orderModified = true;
                        balanceQtyChanged = true;
                        balanceQtyFixedCount++;
                    }
                }
            }

            // Step 2: Determine correct order status based on dispatch quantities
            let allItemsFullyDispatched = true;
            let anyItemPartiallyDispatched = false;
            let totalItems = 0;
            let fullyDispatchedItems = 0;
            let partiallyDispatchedItems = 0;
            let notDispatchedItems = 0;

            for (const group of order.groups) {
                for (const item of group.items) {
                    totalItems++;
                    const dispatchedQty = item.dispatched_quantity || 0;
                    const orderQty = item.quantity || 0;

                    if (dispatchedQty >= orderQty && orderQty > 0) {
                        fullyDispatchedItems++;
                    } else if (dispatchedQty > 0 && dispatchedQty < orderQty) {
                        partiallyDispatchedItems++;
                        anyItemPartiallyDispatched = true;
                        allItemsFullyDispatched = false;
                    } else {
                        notDispatchedItems++;
                        allItemsFullyDispatched = false;
                    }
                }
            }

            // Determine what the status should be
            let correctStatus = order.status;

            if (allItemsFullyDispatched && totalItems > 0 && fullyDispatchedItems > 0) {
                correctStatus = 'dispatching';
            } else if (anyItemPartiallyDispatched) {
                correctStatus = 'partially dispatched';
            }
            // Note: We don't change status if it's already 'pending', 'cancelled', 'completed', etc.
            // unless there's dispatch activity

            // Only update status if there's dispatch activity and status needs correction
            const hasDispatchActivity = fullyDispatchedItems > 0 || partiallyDispatchedItems > 0;

            if (hasDispatchActivity && correctStatus !== order.status) {
                console.log(`\n  📊 Dispatch Summary:`);
                console.log(`     Total Items: ${totalItems}`);
                console.log(`     Fully Dispatched: ${fullyDispatchedItems}`);
                console.log(`     Partially Dispatched: ${partiallyDispatchedItems}`);
                console.log(`     Not Dispatched: ${notDispatchedItems}`);
                console.log(`\n  🔄 Status Change:`);
                console.log(`     ❌ Current: "${order.status}"`);
                console.log(`     ✅ Correct: "${correctStatus}"`);

                order.status = correctStatus;
                orderModified = true;
                statusChanged = true;
                statusChangedCount++;
            }

            // Save if modified
            if (orderModified) {
                await order.save();
                updatedOrderCount++;

                if (balanceQtyChanged && statusChanged) {
                    console.log(`\n  ✅ Updated: Balance Qty + Status`);
                } else if (balanceQtyChanged) {
                    console.log(`\n  ✅ Updated: Balance Qty`);
                } else if (statusChanged) {
                    console.log(`\n  ✅ Updated: Status`);
                }
            } else {
                console.log(`  ✅ No changes needed - Data is correct`);
            }
            console.log('');
        }

        console.log('\n' + '='.repeat(80));
        console.log('📊 FINAL SUMMARY:');
        console.log('='.repeat(80));
        console.log(`Total Orders Scanned: ${orders.length}`);
        console.log(`Orders Updated: ${updatedOrderCount}`);
        console.log(`  - Balance Qty Fixed: ${balanceQtyFixedCount} items`);
        console.log(`  - Status Changed: ${statusChangedCount} orders`);
        console.log('='.repeat(80));

        if (updatedOrderCount === 0) {
            console.log('\n✅ All data is already correct!');
        } else {
            console.log('\n✅ Data fixed successfully!');
        }

    } catch (error) {
        console.error('\n❌ Error fixing order data:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        console.log('\n🔌 Closing MongoDB connection...');
        await mongoose.connection.close();
        console.log('✅ Connection closed');
        process.exit(0);
    }
}

// Run the script
console.log('🚀 Starting Order Data Fix Script...');
console.log('    - Fixing balance_quantity (quantity - dispatched_quantity)');
console.log('    - Fixing order status based on dispatch quantities');
console.log('='.repeat(80) + '\n');
fixOrdersData();
