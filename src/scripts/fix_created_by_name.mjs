/**
 * fix_created_by_name.mjs
 * One-time migration: patch all dispatches that have created_by_name = 'Unknown User'
 * by looking up the actual user name from the User collection.
 *
 * Usage: node src/scripts/fix_created_by_name.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const userSchema = new mongoose.Schema({ 'User Name': String }, { strict: false });
const dispatchSchema = new mongoose.Schema({
    dispatch_no: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_by_name: String,
}, { strict: false });

const User = mongoose.model('User', userSchema);
const Dispatch = mongoose.model('Dispatch', dispatchSchema);

async function run() {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected\n');

    const badDispatches = await Dispatch.find({ created_by_name: 'Unknown User' }).lean();
    console.log(`Found ${badDispatches.length} dispatches with "Unknown User" to fix\n`);

    let fixed = 0;
    let skipped = 0;

    for (const d of badDispatches) {
        if (d.created_by) {
            const user = await User.findById(d.created_by).lean();
            if (user && user['User Name']) {
                await Dispatch.updateOne(
                    { _id: d._id },
                    { $set: { created_by_name: user['User Name'] } }
                );
                console.log(`✅ Fixed  ${d.dispatch_no || d._id}  →  ${user['User Name']}`);
                fixed++;
            } else {
                console.log(`⚠️  Skipped ${d.dispatch_no || d._id}  (user not found or no User Name)`);
                skipped++;
            }
        } else {
            console.log(`⚠️  Skipped ${d.dispatch_no || d._id}  (no created_by reference)`);
            skipped++;
        }
    }

    console.log(`\n─── Done ───────────────────────────────────`);
    console.log(`  Fixed   : ${fixed}`);
    console.log(`  Skipped : ${skipped}`);

    // Verify
    const remaining = await Dispatch.countDocuments({ created_by_name: 'Unknown User' });
    console.log(`  Still "Unknown User" in DB : ${remaining}`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected.');
}

run().catch(err => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
