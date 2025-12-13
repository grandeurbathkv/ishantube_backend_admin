// Script to update all Orders to 'awaiting dispatch' if their related PR/PI is 'awaiting_dispatch'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './src/moduls/Inventory/order.model.js';
import PurchaseRequest from './src/moduls/Inventory/purchaseRequest.model.js';

dotenv.config();

async function updateOrdersToAwaitingDispatch() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all PRs with status 'awaiting_dispatch'
    const awaitingDispatchPRs = await PurchaseRequest.find({ status: 'awaiting_dispatch' });
    console.log(`🔎 Found ${awaitingDispatchPRs.length} PRs with status 'awaiting_dispatch'`);

    let updatedCount = 0;
    for (const pr of awaitingDispatchPRs) {
      // Try to get order_id from PR or from first item
      const orderId = pr.order_id || (pr.items && pr.items[0]?.order_id);
      if (!orderId) {
        console.log(`❌ No order_id found for PR: ${pr.PR_Number}`);
        continue;
      }
      const order = await Order.findById(orderId);
      if (!order) {
        console.log(`❌ Order not found for PR: ${pr.PR_Number}`);
        continue;
      }
      if (order.status !== 'awaiting_dispatch') {
        console.log(`🔄 Updating Order ${order._id} (${order.order_no}) from '${order.status}' to 'awaiting_dispatch'`);
        order.status = 'awaiting_dispatch';
        await order.save();
        updatedCount++;
      } else {
        console.log(`⏭️  Order ${order._id} already in 'awaiting_dispatch'`);
      }
    }
    console.log(`\n✅ Updated ${updatedCount} Orders to 'awaiting dispatch'`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

updateOrdersToAwaitingDispatch();
