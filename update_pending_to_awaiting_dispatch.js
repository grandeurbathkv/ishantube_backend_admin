// Script to update order status from 'pending' to 'awaiting dispatch'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

async function updateOrderStatus() {
    try {
        // Connect to MongoDB
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/ishantube';
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Get specific order ID from command line args, or update all pending orders
        const specificOrderId = process.argv[2];

        if (specificOrderId) {
            // Update specific order
            console.log(`\n🔍 Updating specific order: ${specificOrderId}`);
            const order = await Order.findById(specificOrderId);
            
            if (!order) {
                console.log('❌ Order not found');
                return;
            }

            console.log(`Current status: ${order.status}`);
            
            if (order.status === 'pending') {
                order.status = 'awaiting_dispatch';
                await order.save();
                console.log(`✅ Order ${specificOrderId} updated to 'awaiting_dispatch'`);
            } else {
                console.log(`ℹ️ Order is already in '${order.status}' status. No update needed.`);
            }
        } else {
            // Update all pending orders with PI_Received = true
            console.log('\n🔍 Finding all pending orders with PI_Received = true...');
            const pendingOrders = await Order.find({
                status: 'pending',
                PI_Received: true
            });

            console.log(`Found ${pendingOrders.length} pending orders`);

            if (pendingOrders.length === 0) {
                console.log('No pending orders to update');
                return;
            }

            // Update all found orders
            const result = await Order.updateMany(
                { 
                    status: 'pending',
                    PI_Received: true
                },
                { 
                    $set: { status: 'awaiting_dispatch' }
                }
            );

            console.log(`\n✅ Updated ${result.modifiedCount} orders to 'awaiting_dispatch'`);
            
            // Display updated orders
            const updatedOrders = await Order.find({ status: 'awaiting_dispatch' }).select('_id status Company_Name PR_Number');
            console.log('\nUpdated Orders:');
            updatedOrders.forEach((order, index) => {
                console.log(`${index + 1}. ID: ${order._id}, Company: ${order.Company_Name}, PR: ${order.PR_Number}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
updateOrderStatus();
