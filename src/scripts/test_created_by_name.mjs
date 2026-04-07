/**
 * test_created_by_name.mjs
 * Tests that dispatch records return correct 'created_by_name' and
 * populated 'User Name' from the User collection.
 *
 * Usage:
 *   node src/scripts/test_created_by_name.mjs
 *
 * Make sure backend .env is present with MONGO_URI and JWT_SECRET.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ── Inline minimal schemas (avoids import resolution issues) ──────────────
const userSchema = new mongoose.Schema({
    'User Name': String,
    'Email id': String,
    Role: String,
}, { strict: false });

const dispatchItemSchema = new mongoose.Schema({ product_name: String, quantity: Number }, { strict: false });

const dispatchSchema = new mongoose.Schema({
    dispatch_no: String,
    dispatch_date: Date,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_by_name: String,
    items: [dispatchItemSchema],
}, { strict: false });

const User = mongoose.model('User', userSchema);
const Dispatch = mongoose.model('Dispatch', dispatchSchema);

async function run() {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected\n');

    // ── 1. List latest 5 dispatches with populate ────────────────────────
    console.log('─── Latest 5 Dispatches (with populate) ───────────────────');
    const dispatches = await Dispatch.find({})
        .populate({ path: 'created_by', select: { 'User Name': 1, 'Email id': 1 } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    if (dispatches.length === 0) {
        console.log('⚠️  No dispatches found in the database.');
    }

    for (const d of dispatches) {
        const storedName = d.created_by_name || '(empty)';
        const populatedName =
            d.created_by && typeof d.created_by === 'object'
                ? d.created_by['User Name'] || '(field missing)'
                : '(not populated)';

        const status =
            storedName !== '(empty)' && storedName !== 'Unknown User'
                ? '✅'
                : populatedName !== '(field missing)' && populatedName !== '(not populated)'
                    ? '🔄 (use populated fallback)'
                    : '❌ MISSING';

        console.log(`${status}  Dispatch: ${d.dispatch_no}`);
        console.log(`     created_by_name (stored) : ${storedName}`);
        console.log(`     created_by['User Name']  : ${populatedName}`);
        console.log(`     Items count              : ${(d.items || []).length}`);
        console.log(`     Total Qty                : ${(d.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0)}`);
        console.log('');
    }

    // ── 2. Check a User document to confirm field shape ──────────────────
    console.log('─── Sample User document ───────────────────────────────────');
    const user = await User.findOne({}).lean();
    if (user) {
        console.log(`  User Name : ${user['User Name'] || '(empty)'}`);
        console.log(`  Email id  : ${user['Email id'] || '(empty)'}`);
        console.log(`  Role      : ${user.Role || '(empty)'}`);
    } else {
        console.log('  ⚠️  No users found.');
    }

    // ── 3. Check dispatches that still have 'Unknown User' ───────────────
    const badCount = await Dispatch.countDocuments({ created_by_name: 'Unknown User' });
    const emptyCount = await Dispatch.countDocuments({ $or: [{ created_by_name: { $exists: false } }, { created_by_name: '' }] });

    console.log('\n─── Summary ────────────────────────────────────────────────');
    console.log(`  Total dispatches               : ${await Dispatch.countDocuments({})}`);
    console.log(`  Dispatches with 'Unknown User' : ${badCount}`);
    console.log(`  Dispatches with empty name     : ${emptyCount}`);

    if (badCount > 0) {
        console.log('\n⚠️  Some dispatches have "Unknown User" stored. These will use');
        console.log('   the populated fallback (created_by.\'User Name\') on the frontend.');
        console.log('   New dispatches created after the fix will store the correct name.\n');
    } else {
        console.log('\n✅ All dispatches have correct created_by_name stored!\n');
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected. Test complete.');
}

run().catch(err => {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
});
