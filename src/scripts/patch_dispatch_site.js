/**
 * patch_dispatch_site.js
 * Manually patches a dispatch + its order with site information.
 *
 * Usage:
 *   node src/scripts/patch_dispatch_site.js <dispatchId> "<siteName>" "<siteAddress>" "<contactPerson>" "<mobile>"
 *
 * Example:
 *   node src/scripts/patch_dispatch_site.js 69cb8361b63259f0a70e1dd1 "My Site" "123 Main St" "Ravi Kumar" "9876543210"
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

const [, , dispatchId, siteName, siteAddress, contactPerson, mobile] = process.argv;

if (!dispatchId || !siteName) {
    console.error('Usage: node src/scripts/patch_dispatch_site.js <dispatchId> "<siteName>" "<siteAddress>" "<contactPerson>" "<mobile>"');
    process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
console.log('✅ Connected to MongoDB\n');

const Dispatch = mongoose.model('Dispatch', new mongoose.Schema({}, { strict: false }));
const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

// Patch dispatch
const dispatch = await Dispatch.findById(dispatchId).lean();
if (!dispatch) { console.error('❌ Dispatch not found'); process.exit(1); }

await Dispatch.findByIdAndUpdate(dispatchId, {
    $set: {
        site_name: siteName || '',
        site_address: siteAddress || '',
    }
});
console.log('✅ Dispatch patched:', dispatch.dispatch_no);
console.log('   site_name    =', siteName);
console.log('   site_address =', siteAddress);

// Patch linked order too
if (dispatch.order_id) {
    await Order.findByIdAndUpdate(dispatch.order_id, {
        $set: {
            site_name: siteName || '',
            site_address: siteAddress || '',
            site_contact_person: contactPerson || '',
            site_mobile: mobile || '',
        }
    });
    console.log('✅ Order patched:', dispatch.order_id);
    console.log('   site_contact_person =', contactPerson);
    console.log('   site_mobile         =', mobile);
}

await mongoose.disconnect();
console.log('\n✅ Done! Restart backend and reload the page.');
