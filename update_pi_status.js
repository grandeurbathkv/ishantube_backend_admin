/**
 * Script to update existing PI records with correct status
 * Run this once to fix existing data
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PurchaseRequest from './src/moduls/Inventory/purchaseRequest.model.js';

dotenv.config();

const updatePIStatus = async () => {
    try {
        console.log('🔷 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all PRs where PI_Received is true
        const piRecords = await PurchaseRequest.find({ PI_Received: true });
        console.log(`📋 Found ${piRecords.length} PI records to update\n`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const pr of piRecords) {
            console.log(`\n🔷 Processing PR: ${pr.PR_Number}`);
            console.log(`   Current Status: ${pr.status}`);
            console.log(`   Payment Done: ${pr.payment_done}`);

            let newStatus = pr.status;

            // If payment is done, status should be awaiting_dispatch
            if (pr.payment_done === true) {
                newStatus = 'awaiting_dispatch';
                console.log(`   ✅ Setting status to: awaiting_dispatch (Payment Done)`);
            }
            // If payment not done but PI received, status should be awaiting_payment
            else if (pr.PI_Received === true && !pr.payment_done) {
                newStatus = 'awaiting_payment';
                console.log(`   ✅ Setting status to: awaiting_payment (PI Received, Payment Pending)`);
            }

            // Update only if status needs to change
            if (newStatus !== pr.status) {
                pr.status = newStatus;
                await pr.save();
                updatedCount++;
                console.log(`   ✅ Updated!`);
            } else {
                skippedCount++;
                console.log(`   ⏭️  Skipped (already correct)`);
            }
        }

        console.log('\n\n🎉 ==================== UPDATE COMPLETE ====================');
        console.log(`✅ Updated: ${updatedCount} records`);
        console.log(`⏭️  Skipped: ${skippedCount} records`);
        console.log(`📋 Total processed: ${piRecords.length} records`);
        console.log('🔷 ========================================================\n');

    } catch (error) {
        console.error('❌ Error updating PI status:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔷 MongoDB connection closed');
        process.exit(0);
    }
};

// Run the update
updatePIStatus();
