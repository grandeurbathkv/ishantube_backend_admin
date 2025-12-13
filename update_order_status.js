// Script to update an Order's status to 'awaiting dispatch'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './src/moduls/Inventory/order.model.js';

dotenv.config();

const ORDER_ID = '69212a204bf6af7dc0d9b19c'; // Change this to your target Order ID

async function updateOrderStatus() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const order = await Order.findById(ORDER_ID);
    if (!order) {
      console.log('❌ Order not found');
      process.exit(1);
    }
    console.log('🔎 Current status:', order.status);
    order.status = 'awaiting dispatch';
    await order.save();
    console.log('✅ Order status updated to awaiting dispatch');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

updateOrderStatus();
