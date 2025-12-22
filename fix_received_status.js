import mongoose from 'mongoose';
import PurchaseRequest from './src/moduls/Inventory/purchaseRequest.model.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 ==================== FIX RECEIVED STATUS SCRIPT ====================');
console.log('📝 Purpose: Update all PRs with status "received" to "intrasite"');
console.log('📝 Keep material_received flag as true for Material Received List');
console.log('========================================================================\n');

const fixReceivedStatus = async () => {
    try {
        // Connect to MongoDB
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/your_database';
        console.log('🔌 Connecting to MongoDB...');
        console.log('📍 MongoDB URI:', mongoURI.replace(/\/\/.*:.*@/, '//***:***@')); // Hide credentials

        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB successfully\n');

        // Find all PRs with status "received"
        console.log('🔍 Searching for Purchase Requests with status "received"...');
        const receivedPRs = await PurchaseRequest.find({ status: 'received' });

        console.log(`📊 Found ${receivedPRs.length} Purchase Request(s) with status "received"\n`);

        if (receivedPRs.length === 0) {
            console.log('✅ No records to fix. All PRs are already correct!');
            await mongoose.connection.close();
            return;
        }

        // Display records that will be updated
        console.log('📋 Records to be updated:');
        console.log('─────────────────────────────────────────────────────────────');
        receivedPRs.forEach((pr, index) => {
            console.log(`${index + 1}. PR Number: ${pr.PR_Number}`);
            console.log(`   Status: ${pr.status} → intrasite`);
            console.log(`   Vendor: ${pr.PR_Vendor}`);
            console.log(`   Material Received: ${pr.material_received}`);
            console.log(`   Material Received Date: ${pr.material_received_date || 'N/A'}`);
            console.log('─────────────────────────────────────────────────────────────');
        });

        // Ask for confirmation (in production, you might want to add a prompt here)
        console.log('\n⚠️  Proceeding with update...\n');

        // Update all PRs with status "received" to "intrasite"
        const updateResult = await PurchaseRequest.updateMany(
            { status: 'received' },
            {
                $set: { status: 'intrasite' }
            }
        );

        console.log('✅ Update completed successfully!\n');
        console.log('📊 Update Summary:');
        console.log(`   - Matched: ${updateResult.matchedCount} record(s)`);
        console.log(`   - Modified: ${updateResult.modifiedCount} record(s)`);
        console.log(`   - Acknowledged: ${updateResult.acknowledged ? 'Yes' : 'No'}`);

        // Verify the update
        console.log('\n🔍 Verifying update...');
        const remainingReceivedPRs = await PurchaseRequest.find({ status: 'received' });

        if (remainingReceivedPRs.length === 0) {
            console.log('✅ Verification passed! No PRs with status "received" found.');
        } else {
            console.log(`⚠️  Warning: ${remainingReceivedPRs.length} PR(s) still have status "received"`);
        }

        // Show updated records
        console.log('\n📋 Updated records verification:');
        console.log('─────────────────────────────────────────────────────────────');
        const updatedPRs = await PurchaseRequest.find({
            PR_Number: { $in: receivedPRs.map(pr => pr.PR_Number) }
        });

        updatedPRs.forEach((pr, index) => {
            console.log(`${index + 1}. PR Number: ${pr.PR_Number}`);
            console.log(`   Status: ${pr.status} ✓`);
            console.log(`   Material Received: ${pr.material_received} ✓`);
            console.log('─────────────────────────────────────────────────────────────');
        });

        console.log('\n✅ Script completed successfully!');
        console.log('📝 Summary:');
        console.log('   - Purchase Request List will show "intrasite" (In-Transit) status');
        console.log('   - Material Received List will continue to show "Received" badge');
        console.log('   - material_received flag remains true for Material Received records');

        await mongoose.connection.close();
        console.log('\n🔌 MongoDB connection closed');
        console.log('========================================================================');

    } catch (error) {
        console.error('\n❌ Error occurred while fixing received status:');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);

        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('\n🔌 MongoDB connection closed');
        }

        process.exit(1);
    }
};

// Run the script
fixReceivedStatus();
