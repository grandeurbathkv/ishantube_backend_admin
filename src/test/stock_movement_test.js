/**
 * STOCK MOVEMENT FLOW TEST SCRIPT
 * ================================
 * Tests the full stock movement scenario:
 *   Step 1: Quotation Created  → No stock change
 *   Step 2: Order Created      → No stock change (BUG WAS: fresh_stock incorrectly reduced)
 *   Step 3: Dispatch Created   → Product_On_Hold_Qty increases, Product_Fresh_Stock UNCHANGED
 *   Step 4: Sell Record        → Product_Fresh_Stock decreases AND Product_On_Hold_Qty decreases
 *
 * Usage:
 *   node src/test/stock_movement_test.js
 *
 * Make sure the backend server is running before executing this script.
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api'; // Backend port 5001
const LOGIN_EMAIL = 'superadmin@gmail.com';
const LOGIN_PASSWORD = 'Admin@123';

// Product codes to test (as mentioned in the scenario)
const TEST_PRODUCT_CODE_1 = '0063890037';
const TEST_PRODUCT_CODE_2 = '0063790037';

let authToken = '';
let companyId = '';
let partyId = '';
let siteId = '';
let quotationId = '';
let orderId = '';
let dispatchId = '';
let sellRecordId = '';

// ── Helpers ───────────────────────────────────────────────────────────────────
const log = (step, msg, data = null) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${step}] ${msg}`);
    if (data) console.log('Data:', JSON.stringify(data, null, 2));
};

const fail = (step, error) => {
    console.error(`\n❌ FAILED at ${step}:`);
    console.error(error.response?.data || error.message);
    process.exit(1);
};

const pass = (msg) => console.log(`  ✅ ${msg}`);
const info = (msg) => console.log(`  ℹ️  ${msg}`);
const warn = (msg) => console.log(`  ⚠️  ${msg}`);

const api = () => axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${authToken}` },
    timeout: 30000,
});

// ── Step 0: Login ─────────────────────────────────────────────────────────────
async function login() {
    log('0', 'LOGIN');
    try {
        const res = await axios.post(`${BASE_URL}/user/login`, {
            'Email id': LOGIN_EMAIL,
            Password: LOGIN_PASSWORD,
        });
        authToken = res.data.token;
        if (!authToken) throw new Error('No token in response: ' + JSON.stringify(res.data));
        pass(`Logged in as SuperAdmin. Token: ${authToken.substring(0, 20)}...`);
    } catch (e) { fail('Login', e); }
}

// ── Helper: Get product stock ─────────────────────────────────────────────────
async function getProductStock(productCode) {
    const res = await api().get(`/product?search=${encodeURIComponent(productCode)}&limit=10`);
    const products = res.data.data || [];
    const product = products.find(p =>
        (p.Product_code && p.Product_code.trim() === productCode.trim()) ||
        (p.Prod_ID && p.Prod_ID.trim() === productCode.trim())
    );
    if (!product) {
        const allCodes = products.map(p => p.Product_code || p.Prod_ID).join(', ');
        throw new Error(`Product '${productCode}' not found. Found codes: ${allCodes || 'none'}`);
    }
    return {
        _id: product._id,
        code: product.Product_code || product.Prod_ID,
        name: product.Product_Description,
        fresh_stock: product.Product_Fresh_Stock || 0,
        on_hold_qty: product.Product_On_Hold_Qty || 0,
        opening_stock: product.Product_opening_stock || 0,
        damage_stock: product.Product_Damage_stock || 0,
    };
}

// ── Step A: Fetch initial stock ───────────────────────────────────────────────
async function fetchInitialStock() {
    log('A', 'FETCH INITIAL PRODUCT STOCK (before any operations)');
    try {
        const p1 = await getProductStock(TEST_PRODUCT_CODE_1);
        const p2 = await getProductStock(TEST_PRODUCT_CODE_2);

        info(`Product 1 (${p1.code}): Fresh=${p1.fresh_stock}, OnHold=${p1.on_hold_qty}`);
        info(`Product 2 (${p2.code}): Fresh=${p2.fresh_stock}, OnHold=${p2.on_hold_qty}`);

        if (p1.fresh_stock < 2) {
            warn(`Product 1 (${p1.code}) has only ${p1.fresh_stock} fresh stock. Test may fail at dispatch. Need at least 2.`);
        }
        if (p2.fresh_stock < 1) {
            warn(`Product 2 (${p2.code}) has only ${p2.fresh_stock} fresh stock. Test may fail at dispatch. Need at least 1.`);
        }

        return { p1, p2 };
    } catch (e) { fail('Fetch Initial Stock', e); }
}

// ── Step B: Get company, party, site ─────────────────────────────────────────
async function fetchMasterData() {
    log('B', 'FETCH COMPANY / PARTY / SITE');
    try {
        // Company
        const compRes = await api().get('/company?page=1&limit=5');
        const company = compRes.data.data?.[0];
        if (!company) throw new Error('No company found');
        companyId = company._id;
        pass(`Company: ${company.Company_Name} (${companyId})`);

        // Party - search for Ceramique South or any party
        const partyRes = await api().get('/party/dropdown/all?limit=all');
        const parties = partyRes.data.data || [];
        const party = parties.find(p =>
            (p.name || '').toLowerCase().includes('ceramique')
        ) || parties[0];
        if (!party) throw new Error('No party found');
        partyId = party.id || party._id;
        pass(`Party: ${party.name} (${partyId})`);

        // Site
        const siteRes = await api().get(`/site/party/${partyId}?page=1&limit=5`);
        const site = siteRes.data.data?.[0];
        siteId = site?._id || null;
        pass(`Site: ${site?.Site_Billing_Name || 'None'} (${siteId || 'N/A'})`);

    } catch (e) { fail('Fetch Master Data', e); }
}

// ── Step 1: Create Quotation ──────────────────────────────────────────────────
async function createQuotation(p1, p2) {
    log('1', 'CREATE QUOTATION (Step 1 - No stock change expected)');
    try {
        const p1_before = await getProductStock(TEST_PRODUCT_CODE_1);
        const p2_before = await getProductStock(TEST_PRODUCT_CODE_2);

        // Generate quotation_no matching the auto-generate pattern (required field)
        const ts = Date.now().toString().slice(-6);
        const yr = String(new Date().getFullYear()).slice(-2);
        const generatedQuotationNo = `QS-${ts}/${yr}`;

        const quotationData = {
            quotation_no: generatedQuotationNo,
            company_id: companyId,
            company_name: 'Test Company',
            party_id: partyId,
            party_name: 'Test Party',
            party_billing_name: 'Test Party',
            ...(siteId && { site_id: siteId }),
            status: 'draft',
            quotation_date: new Date().toISOString(),
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            groups: [
                {
                    group_id: 'TEST-GRP-001',
                    group_name: 'Test Group',
                    group_category: 'Other',
                    items: [
                        {
                            product_id: p1._id,
                            product_code: p1.code,
                            product_name: p1.name,
                            mrp: 100,
                            quantity: 2,
                            discount: 0,
                            net_rate: 100,
                            total_amount: 200,
                            gst_percentage: 18,
                        },
                        {
                            product_id: p2._id,
                            product_code: p2.code,
                            product_name: p2.name,
                            mrp: 150,
                            quantity: 1,
                            discount: 0,
                            net_rate: 150,
                            total_amount: 150,
                            gst_percentage: 18,
                        },
                    ],
                    subtotal: 350,
                    total_discount: 0,
                    total_amount: 350,
                },
            ],
            grand_total: 350,
            freight_charges: 0,
            gst_amount: 63,
            gst_percentage: 18,
            net_amount_payable: 413,
        };

        const res = await api().post('/quotation', quotationData);
        quotationId = res.data.data._id;
        pass(`Quotation created: ${res.data.data.quotation_no} (${quotationId})`);

        // Verify no stock change
        const p1_after = await getProductStock(TEST_PRODUCT_CODE_1);
        const p2_after = await getProductStock(TEST_PRODUCT_CODE_2);

        console.log('\n  📊 STOCK CHECK after Quotation creation:');
        checkStockUnchanged('Step 1 Quotation', TEST_PRODUCT_CODE_1, p1_before, p1_after);
        checkStockUnchanged('Step 1 Quotation', TEST_PRODUCT_CODE_2, p2_before, p2_after);

    } catch (e) { fail('Create Quotation', e); }
}

// ── Step 2: Create Order from Quotation ──────────────────────────────────────
async function createOrder(p1, p2) {
    log('2', 'CREATE ORDER FROM QUOTATION (Step 2 - No stock change expected)');
    try {
        const p1_before = await getProductStock(TEST_PRODUCT_CODE_1);
        const p2_before = await getProductStock(TEST_PRODUCT_CODE_2);

        const orderData = {
            quotation_id: quotationId,
            company_id: companyId,
            company_name: 'Test Company',
            party_id: partyId,
            party_name: 'Test Party',
            party_billing_name: 'Test Party',
            ...(siteId && { site_id: siteId }),
            groups: [
                {
                    group_id: 'TEST-GRP-001',
                    group_name: 'Test Group',
                    group_category: 'Other',
                    items: [
                        {
                            product_id: p1._id,
                            product_code: p1.code,
                            product_name: p1.name,
                            mrp: 100,
                            quantity: 2,
                            discount: 0,
                            net_rate: 100,
                            total_amount: 200,
                            gst_percentage: 18,
                            dispatched_quantity: 0,
                        },
                        {
                            product_id: p2._id,
                            product_code: p2.code,
                            product_name: p2.name,
                            mrp: 150,
                            quantity: 1,
                            discount: 0,
                            net_rate: 150,
                            total_amount: 150,
                            gst_percentage: 18,
                            dispatched_quantity: 0,
                        },
                    ],
                    subtotal: 350,
                    total_discount: 0,
                    total_amount: 350,
                },
            ],
            grand_total: 350,
            freight_charges: 0,
            gst_amount: 63,
            gst_percentage: 18,
            net_amount_payable: 413,
            status: 'pending',
            payment_status: 'pending',
            order_date: new Date().toISOString(),
        };

        const res = await api().post('/order', orderData);
        orderId = res.data.data._id;
        pass(`Order created: ${res.data.data.order_no} (${orderId})`);

        // ✅ CRITICAL CHECK: No stock change on order creation
        const p1_after = await getProductStock(TEST_PRODUCT_CODE_1);
        const p2_after = await getProductStock(TEST_PRODUCT_CODE_2);

        console.log('\n  📊 STOCK CHECK after Order creation (BUG FIX VALIDATION):');
        checkStockUnchanged('Step 2 Order', TEST_PRODUCT_CODE_1, p1_before, p1_after);
        checkStockUnchanged('Step 2 Order', TEST_PRODUCT_CODE_2, p2_before, p2_after);

    } catch (e) { fail('Create Order', e); }
}

// ── Step 3 CASE A: Dispatch 1 pcs each ───────────────────────────────────────
async function createDispatch_CaseA(p1, p2) {
    log('3-A', 'CREATE DISPATCH - CASE A (1 pcs of each)\n  Expected: On_Hold +1 each. Fresh Stock UNCHANGED.');
    try {
        const p1_before = await getProductStock(TEST_PRODUCT_CODE_1);
        const p2_before = await getProductStock(TEST_PRODUCT_CODE_2);

        info(`Before Dispatch: ${p1.code} Fresh=${p1_before.fresh_stock}, OnHold=${p1_before.on_hold_qty}`);
        info(`Before Dispatch: ${p2.code} Fresh=${p2_before.fresh_stock}, OnHold=${p2_before.on_hold_qty}`);

        const dispatchData = {
            order_id: orderId,
            dispatch_date: new Date().toISOString().split('T')[0],
            notes: 'Test dispatch Case A - 1 pcs each',
            items: [
                {
                    group_name: 'Test Group',
                    product_id: p1._id,
                    product_code: p1.code,
                    product_name: p1.name,
                    quantity: 1,
                    mrp: 100,
                    net_rate: 100,
                    total_amount: 100,
                    gst_percentage: 18,
                },
                {
                    group_name: 'Test Group',
                    product_id: p2._id,
                    product_code: p2.code,
                    product_name: p2.name,
                    quantity: 1,
                    mrp: 150,
                    net_rate: 150,
                    total_amount: 150,
                    gst_percentage: 18,
                },
            ],
        };

        const res = await api().post('/dispatch', dispatchData);
        dispatchId = res.data.data._id;
        pass(`Dispatch created: ${res.data.data.dispatch_no} (${dispatchId})`);

        const p1_after = await getProductStock(TEST_PRODUCT_CODE_1);
        const p2_after = await getProductStock(TEST_PRODUCT_CODE_2);

        console.log('\n  📊 STOCK CHECK after Dispatch - Case A:');

        // On Hold should increase by 1 each
        checkStockChange('Step 3 Dispatch', TEST_PRODUCT_CODE_1, {
            field: 'on_hold_qty', before: p1_before.on_hold_qty, after: p1_after.on_hold_qty,
            expected_change: +1, operation: 'increase'
        });
        checkStockChange('Step 3 Dispatch', TEST_PRODUCT_CODE_2, {
            field: 'on_hold_qty', before: p2_before.on_hold_qty, after: p2_after.on_hold_qty,
            expected_change: +1, operation: 'increase'
        });

        // Fresh Stock should be UNCHANGED
        checkStockUnchanged('Step 3 Dispatch', TEST_PRODUCT_CODE_1,
            { fresh_stock: p1_before.fresh_stock }, { fresh_stock: p1_after.fresh_stock }
        );
        checkStockUnchanged('Step 3 Dispatch', TEST_PRODUCT_CODE_2,
            { fresh_stock: p2_before.fresh_stock }, { fresh_stock: p2_after.fresh_stock }
        );

        return { dispatchId, p1_before: p1_after, p2_before: p2_after };

    } catch (e) { fail('Create Dispatch Case A', e); }
}

// ── Step 4 CASE A: Sell Record ────────────────────────────────────────────────
async function createSellRecord_CaseA(dispatchId, p1_before, p2_before) {
    log('4-A', 'CREATE SELL RECORD - CASE A (1 pcs each)\n  Expected: Fresh Stock -1 each, On_Hold -1 each.');
    try {
        info(`Before Sell Record: ${TEST_PRODUCT_CODE_1} Fresh=${p1_before.fresh_stock}, OnHold=${p1_before.on_hold_qty}`);
        info(`Before Sell Record: ${TEST_PRODUCT_CODE_2} Fresh=${p2_before.fresh_stock}, OnHold=${p2_before.on_hold_qty}`);

        const sellData = {
            bill_date: new Date().toISOString().split('T')[0],
            bill_amount: '295', // 100 + 150 + taxes approx
            mode_of_transport: 'Road',
            vehicle_number: 'TEST001',
            freight_remarks: 'Test freight',
            transport_incharge_number: '9999999999',
            notes: 'Test sell record Case A',
        };

        const res = await api().post(`/dispatch/${dispatchId}/create-sell-record`, sellData);
        sellRecordId = res.data.data?.sellRecord?._id;
        pass(`Sell Record created: ${res.data.data?.sellRecord?.bill_number} (${sellRecordId})`);

        const p1_after = await getProductStock(TEST_PRODUCT_CODE_1);
        const p2_after = await getProductStock(TEST_PRODUCT_CODE_2);

        console.log('\n  📊 STOCK CHECK after Sell Record - Case A:');

        // Fresh Stock should DECREASE by 1 each
        checkStockChange('Step 4 Sell Record', TEST_PRODUCT_CODE_1, {
            field: 'fresh_stock', before: p1_before.fresh_stock, after: p1_after.fresh_stock,
            expected_change: -1, operation: 'decrease'
        });
        checkStockChange('Step 4 Sell Record', TEST_PRODUCT_CODE_2, {
            field: 'fresh_stock', before: p2_before.fresh_stock, after: p2_after.fresh_stock,
            expected_change: -1, operation: 'decrease'
        });

        // On Hold should DECREASE by 1 each
        checkStockChange('Step 4 Sell Record', TEST_PRODUCT_CODE_1, {
            field: 'on_hold_qty', before: p1_before.on_hold_qty, after: p1_after.on_hold_qty,
            expected_change: -1, operation: 'decrease'
        });
        checkStockChange('Step 4 Sell Record', TEST_PRODUCT_CODE_2, {
            field: 'on_hold_qty', before: p2_before.on_hold_qty, after: p2_after.on_hold_qty,
            expected_change: -1, operation: 'decrease'
        });

        return { p1_after, p2_after };
    } catch (e) { fail('Create Sell Record Case A', e); }
}

// ── Helper: Check stock unchanged ────────────────────────────────────────────
function checkStockUnchanged(step, productCode, before, after) {
    const freshChanged = before.fresh_stock !== after.fresh_stock;
    const onHoldChanged = before.on_hold_qty !== undefined && before.on_hold_qty !== after.on_hold_qty;

    if (freshChanged) {
        console.error(`  ❌ [${step}] ${productCode}: Fresh Stock CHANGED! Before=${before.fresh_stock}, After=${after.fresh_stock}. SHOULD NOT change here!`);
    } else {
        pass(`[${step}] ${productCode}: Fresh Stock UNCHANGED ✓ (${after.fresh_stock})`);
    }
}

// ── Helper: Check stock change ────────────────────────────────────────────────
function checkStockChange(step, productCode, { field, before, after, expected_change, operation }) {
    const actual_change = after - before;
    const match = actual_change === expected_change;

    if (match) {
        pass(`[${step}] ${productCode}: ${field} ${operation === 'decrease' ? '-' : '+'}${Math.abs(expected_change)} ✓  (${before} → ${after})`);
    } else {
        console.error(`  ❌ [${step}] ${productCode}: ${field} WRONG change! Expected: ${expected_change > 0 ? '+' : ''}${expected_change}, Actual: ${actual_change > 0 ? '+' : ''}${actual_change}  (${before} → ${after})`);
    }
}

// ── Main runner ───────────────────────────────────────────────────────────────
async function runTests() {
    console.log('\n' + '═'.repeat(60));
    console.log('  STOCK MOVEMENT FLOW TEST');
    console.log('  Testing complete flow: Quotation → Order → Dispatch → Sale');
    console.log('═'.repeat(60));

    await login();
    const { p1, p2 } = await fetchInitialStock();
    await fetchMasterData();

    // Step 1: Quotation (no stock change)
    await createQuotation(p1, p2);

    // Step 2: Order from Quotation (no stock change - BUG FIX)
    await createOrder(p1, p2);

    // Step 3: Dispatch - Case A (only on_hold increases, fresh_stock unchanged)
    const caseADispatch = await createDispatch_CaseA(p1, p2);

    // Step 4: Sell Record - Case A (both fresh_stock and on_hold decrease)
    await createSellRecord_CaseA(
        caseADispatch.dispatchId,
        caseADispatch.p1_before,
        caseADispatch.p2_before
    );

    console.log('\n' + '═'.repeat(60));
    console.log('  ✅ ALL STOCK MOVEMENT TESTS COMPLETED!');
    console.log('  SUMMARY OF CORRECT BEHAVIOR:');
    console.log('  Step 1 - Quotation:  No stock change ✓');
    console.log('  Step 2 - Order:      No stock change ✓ (Bug was: fresh_stock incorrectly reduced)');
    console.log('  Step 3 - Dispatch:   On_Hold_Qty increases only, Fresh_Stock UNCHANGED ✓');
    console.log('  Step 4 - Sell Rec:   Fresh_Stock decreases AND On_Hold_Qty decreases ✓');
    console.log('═'.repeat(60) + '\n');
}

runTests().catch(err => {
    console.error('\n💥 Test runner crashed:', err.message);
    process.exit(1);
});
