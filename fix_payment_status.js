import mongoose from 'mongoose';
import PurchaseRequest from './src/moduls/Inventory/purchaseRequest.model.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI;

async function fixPaymentStatus() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully\n');

        // Find all PRs with payment_done = true
        const prsWithPayment = await PurchaseRequest.find({ 
            payment_done: true,
            PI_Received: true 
        });

        console.log(`📊 Found ${prsWithPayment.length} Purchase Requests with payment done\n`);

        let fullPaymentCount = 0;
        let partialPaymentCount = 0;
        let skippedCount = 0;

        for (const pr of prsWithPayment) {
            const piAmount = pr.pi_amount || 0;
            const paymentAmount = pr.payment_amount || 0;

            console.log(`\n📋 Processing PR: ${pr.PR_Number}`);
            console.log(`   PI Amount: ₹${piAmount}`);
            console.log(`   Payment Amount: ₹${paymentAmount}`);
            console.log(`   Current Status: ${pr.status}`);

            // Determine if payment is full or partial
            let newStatus = null;
            
            if (piAmount === 0) {
                console.log(`   ⚠️ Skipping - PI amount is 0`);
                skippedCount++;
                continue;
            }

            if (paymentAmount >= piAmount) {
                // Full payment
                if (pr.status === 'intrasite' || pr.status === 'completed') {
                    console.log(`   ⏭️ Skipping - Already dispatched/completed`);
                    skippedCount++;
                    continue;
                }
                newStatus = 'awaiting_dispatch';
                fullPaymentCount++;
                console.log(`   ✅ Full payment detected → awaiting_dispatch`);
            } else {
                // Partial payment
                newStatus = 'partial_payment';
                partialPaymentCount++;
                console.log(`   ⚠️ Partial payment detected (${((paymentAmount/piAmount)*100).toFixed(1)}%) → partial_payment`);
            }

            // Update status
            if (newStatus && pr.status !== newStatus) {
                pr.status = newStatus;
                await pr.save();
                console.log(`   ✅ Updated to: ${newStatus}`);
            } else {
                console.log(`   ⏭️ No update needed`);
                skippedCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Summary:');
        console.log('='.repeat(60));
        console.log(`✅ Full Payment (awaiting_dispatch): ${fullPaymentCount}`);
        console.log(`⚠️ Partial Payment (partial_payment): ${partialPaymentCount}`);
        console.log(`⏭️ Skipped (already correct/dispatched): ${skippedCount}`);
        console.log(`📝 Total Processed: ${prsWithPayment.length}`);
        console.log('='.repeat(60) + '\n');

        console.log('✅ Payment status fix completed successfully!');

    } catch (error) {
        console.error('❌ Error fixing payment status:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Run the fix
fixPaymentStatus();
