/**
 * diagnose_site_fields.js
 * Checks a specific dispatch and its linked order/site to find why site fields are empty.
 * Run with: node --experimental-vm-modules src/scripts/diagnose_site_fields.js <dispatchId>
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DISPATCH_ID = process.argv[2];

if (!DISPATCH_ID) {
    console.error('❌ Please provide a dispatch ID as argument.');
    console.error('   Usage: node src/scripts/diagnose_site_fields.js <dispatchId>');
    process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
console.log('✅ Connected to MongoDB\n');

// ─── Load models inline (plain schemas, no module overhead) ─────────────────
const Dispatch = mongoose.models.Dispatch || mongoose.model('Dispatch',
    new mongoose.Schema({
        dispatch_no: String,
        dispatch_date: Date,
        order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        site_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
        site_name: String,
        site_address: String,
        party_name: String,
    }, { strict: false })
);

const Order = mongoose.models.Order || mongoose.model('Order',
    new mongoose.Schema({
        order_no: String,
        site_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
        site_name: String,
        site_address: String,
        site_contact_person: String,
        site_mobile: String,
    }, { strict: false })
);

const Site = mongoose.models.Site || mongoose.model('Site',
    new mongoose.Schema({}, { strict: false })
);

// ─── 1. Raw Dispatch document ────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════');
console.log('1️⃣  RAW DISPATCH DOCUMENT (from DB)');
console.log('═══════════════════════════════════════════════');
const dispatchRaw = await Dispatch.findById(DISPATCH_ID).lean();
if (!dispatchRaw) {
    console.error('❌ Dispatch not found with ID:', DISPATCH_ID);
    process.exit(1);
}
console.log('dispatch_no    :', dispatchRaw.dispatch_no);
console.log('order_id       :', dispatchRaw.order_id);
console.log('site_id        :', dispatchRaw.site_id);
console.log('site_name      :', JSON.stringify(dispatchRaw.site_name));
console.log('site_address   :', JSON.stringify(dispatchRaw.site_address));

// ─── 2. Populated Order document ────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════');
console.log('2️⃣  ORDER DOCUMENT (populated from dispatch.order_id)');
console.log('═══════════════════════════════════════════════');
if (dispatchRaw.order_id) {
    const order = await Order.findById(dispatchRaw.order_id).lean();
    if (order) {
        console.log('order_no             :', order.order_no);
        console.log('order.site_id        :', order.site_id);
        console.log('order.site_name      :', JSON.stringify(order.site_name));
        console.log('order.site_address   :', JSON.stringify(order.site_address));
        console.log('order.site_contact_person:', JSON.stringify(order.site_contact_person));
        console.log('order.site_mobile    :', JSON.stringify(order.site_mobile));
        console.log('--- Party Billing Info (jugad fallback) ---');
        console.log('order.party_name          :', JSON.stringify(order.party_name));
        console.log('order.party_billing_name  :', JSON.stringify(order.party_billing_name));
        console.log('order.party_address       :', JSON.stringify(order.party_address));
        console.log('order.party_contact_person:', JSON.stringify(order.party_contact_person));
        console.log('order.party_mobile        :', JSON.stringify(order.party_mobile));
    } else {
        console.log('❌ Order not found for ID:', dispatchRaw.order_id);
    }
} else {
    console.log('❌ dispatch.order_id is null/undefined');
}

// ─── 3. Site document (from dispatch.site_id OR order.site_id) ──────────────
console.log('\n═══════════════════════════════════════════════');
console.log('3️⃣  SITE DOCUMENT (from dispatch.site_id or order.site_id)');
console.log('═══════════════════════════════════════════════');
const order2 = dispatchRaw.order_id ? await Order.findById(dispatchRaw.order_id).lean() : null;
const siteIdToCheck = dispatchRaw.site_id || (order2 && order2.site_id);

if (siteIdToCheck) {
    const site = await Site.findById(siteIdToCheck).lean();
    if (site) {
        console.log('Site _id             :', site._id);
        console.log('Site_Billing_Name    :', JSON.stringify(site.Site_Billing_Name));
        console.log('Site_Address         :', JSON.stringify(site.Site_Address));
        console.log('Contact_Person       :', JSON.stringify(site.Contact_Person));
        console.log('Mobile_Number        :', JSON.stringify(site.Mobile_Number));
        // Print all keys to find the correct field names
        console.log('\n📋 ALL FIELDS in Site document:');
        for (const [key, val] of Object.entries(site)) {
            if (!key.startsWith('_') && key !== '__v') {
                console.log(`   ${key}: ${JSON.stringify(val)}`);
            }
        }
    } else {
        console.log('❌ Site not found for ID:', siteIdToCheck);
    }
} else {
    console.log('❌ No site_id on dispatch or order');
}

// ─── 4. Summary / Root Cause ─────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════');
console.log('4️⃣  DIAGNOSIS SUMMARY');
console.log('═══════════════════════════════════════════════');
const hasSiteNameOnDispatch = !!(dispatchRaw.site_name);
const hasSiteIdOnDispatch = !!(dispatchRaw.site_id);
const hasSiteIdOnOrder = !!(order2 && order2.site_id);
const hasOrderSiteFields = !!(order2 && (order2.site_name || order2.site_contact_person));

console.log('dispatch.site_name exists     ?', hasSiteNameOnDispatch ? '✅ YES' : '❌ NO (empty/null)');
console.log('dispatch.site_id exists       ?', hasSiteIdOnDispatch ? '✅ YES' : '❌ NO');
console.log('order.site_id exists          ?', hasSiteIdOnOrder ? '✅ YES' : '❌ NO');
console.log('order has site_name/contact   ?', hasOrderSiteFields ? '✅ YES' : '❌ NO (order also empty)');

if (!hasSiteNameOnDispatch && !hasSiteIdOnDispatch && !hasSiteIdOnOrder && !hasOrderSiteFields) {
    console.log('\n🔴 ROOT CAUSE: The order linked to this dispatch was created WITHOUT site information.');
    console.log('   → The order has no site_id, site_name, or contact fields saved.');
    console.log('   → This is a DATA issue — the order itself was saved without a site.');
} else if (!hasSiteNameOnDispatch && hasSiteIdOnOrder) {
    console.log('\n🟡 ROOT CAUSE: dispatch.site_name is empty but order has site_id.');
    console.log('   → Site document population should work. Check Site field names above.');
} else {
    console.log('\n🟢 Data looks present — check field name mismatch or populate issue.');
}

// ─── 5. Find sites by party's Party_id string ────────────────────────────────
console.log('\n═══════════════════════════════════════════════');
console.log('5️⃣  ALL SITES linked to this order\'s party');
console.log('═══════════════════════════════════════════════');
const order3 = dispatchRaw.order_id ? await Order.findById(dispatchRaw.order_id).lean() : null;
if (order3 && order3.party_id) {
    // Party has an ObjectId _id but Site links via Party_id string (e.g. PTY001)
    const PartyModel = mongoose.models.Party || mongoose.model('Party', new mongoose.Schema({}, { strict: false }));
    const party = await PartyModel.findById(order3.party_id).lean();
    console.log('Party _id    :', order3.party_id);
    console.log('Party.Party_id (string):', party ? party.Party_id : 'NOT FOUND');

    if (party && party.Party_id) {
        const sites = await Site.find({ Site_party_id: party.Party_id }).lean();
        console.log('Sites found for party', party.Party_id, ':', sites.length);
        sites.forEach((s, i) => {
            console.log(`\n  Site ${i + 1}:`);
            for (const [k, v] of Object.entries(s)) {
                if (!k.startsWith('_') && k !== '__v') {
                    console.log(`    ${k}: ${JSON.stringify(v)}`);
                }
            }
        });
        if (sites.length === 0) {
            console.log('❌ No sites found in Site collection for Party_id:', party.Party_id);
            console.log('   → The party has NO site records. You need to create a site for this party first.');
        }
    } else {
        console.log('❌ Party not found or has no Party_id string');
    }
} else {
    console.log('❌ Order has no party_id');
}

await mongoose.disconnect();
console.log('\n✅ Done. Disconnected from MongoDB.');
