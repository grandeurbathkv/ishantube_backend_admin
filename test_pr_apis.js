/**
 * Test script for Purchase Request APIs
 * Tests: GET all, GET by ID, UPDATE, DELETE
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

console.log('\n🔷 ==================== TESTING PURCHASE REQUEST APIs ====================\n');

// Test 1: Get all Purchase Requests
async function testGetAllPRs() {
    console.log('📋 Test 1: GET All Purchase Requests');
    console.log('URL: GET /purchase-request');
    try {
        const response = await api.get('/purchase-request', {
            params: {
                page: 1,
                limit: 10,
                status: 'pending'
            }
        });
        console.log('✅ Status:', response.status);
        console.log('✅ Total PRs:', response.data.pagination?.total);
        console.log('✅ PRs returned:', response.data.data?.length);
        if (response.data.data?.length > 0) {
            console.log('✅ First PR:', response.data.data[0].PR_Number);
            return response.data.data[0]._id; // Return first PR ID for other tests
        }
        return null;
    } catch (error) {
        console.error('❌ Error:', error.response?.data?.message || error.message);
        return null;
    }
}

// Test 2: Get PR by ID
async function testGetPRById(prId) {
    if (!prId) {
        console.log('\n⚠️ Test 2: Skipped (No PR ID available)');
        return;
    }
    console.log('\n📋 Test 2: GET Purchase Request by ID');
    console.log('URL: GET /purchase-request/' + prId);
    try {
        const response = await api.get(`/purchase-request/${prId}`);
        console.log('✅ Status:', response.status);
        console.log('✅ PR Number:', response.data.data.PR_Number);
        console.log('✅ PR Vendor:', response.data.data.PR_Vendor);
        console.log('✅ Status:', response.data.data.status);
        console.log('✅ Items:', response.data.data.items?.length);
    } catch (error) {
        console.error('❌ Error:', error.response?.data?.message || error.message);
    }
}

// Test 3: Update PR
async function testUpdatePR(prId) {
    if (!prId) {
        console.log('\n⚠️ Test 3: Skipped (No PR ID available)');
        return;
    }
    console.log('\n📋 Test 3: UPDATE Purchase Request');
    console.log('URL: PUT /purchase-request/' + prId);
    try {
        const updateData = {
            remarks: 'Updated via test script at ' + new Date().toLocaleString(),
            PI_Received: true
        };
        console.log('📝 Update data:', JSON.stringify(updateData, null, 2));
        
        const response = await api.put(`/purchase-request/${prId}`, updateData);
        console.log('✅ Status:', response.status);
        console.log('✅ Updated PR:', response.data.data.PR_Number);
        console.log('✅ New remarks:', response.data.data.remarks);
        console.log('✅ PI_Received:', response.data.data.PI_Received);
    } catch (error) {
        console.error('❌ Error:', error.response?.data?.message || error.message);
    }
}

// Test 4: Search PR
async function testSearchPR() {
    console.log('\n📋 Test 4: SEARCH Purchase Requests');
    console.log('URL: GET /purchase-request?search=PR');
    try {
        const response = await api.get('/purchase-request', {
            params: {
                search: 'PR',
                page: 1,
                limit: 5
            }
        });
        console.log('✅ Status:', response.status);
        console.log('✅ Search results:', response.data.data?.length);
        if (response.data.data?.length > 0) {
            console.log('✅ First result:', response.data.data[0].PR_Number);
        }
    } catch (error) {
        console.error('❌ Error:', error.response?.data?.message || error.message);
    }
}

// Test 5: Filter by Status
async function testFilterByStatus() {
    console.log('\n📋 Test 5: FILTER by Status');
    console.log('URL: GET /purchase-request?status=pending');
    try {
        const response = await api.get('/purchase-request', {
            params: {
                status: 'pending',
                page: 1,
                limit: 5
            }
        });
        console.log('✅ Status:', response.status);
        console.log('✅ Pending PRs:', response.data.data?.length);
        console.log('✅ Total pending:', response.data.pagination?.total);
    } catch (error) {
        console.error('❌ Error:', error.response?.data?.message || error.message);
    }
}

// Test 6: Filter by PI_Received
async function testFilterByPIReceived() {
    console.log('\n📋 Test 6: FILTER by PI_Received');
    console.log('URL: GET /purchase-request?PI_Received=true');
    try {
        const response = await api.get('/purchase-request', {
            params: {
                PI_Received: 'true',
                page: 1,
                limit: 5
            }
        });
        console.log('✅ Status:', response.status);
        console.log('✅ PRs with PI received:', response.data.data?.length);
        console.log('✅ Total with PI:', response.data.pagination?.total);
    } catch (error) {
        console.error('❌ Error:', error.response?.data?.message || error.message);
    }
}

// Run all tests
async function runAllTests() {
    try {
        // Test GET all PRs and get first PR ID
        const prId = await testGetAllPRs();
        
        // Test GET by ID
        await testGetPRById(prId);
        
        // Test UPDATE
        await testUpdatePR(prId);
        
        // Test SEARCH
        await testSearchPR();
        
        // Test FILTER by status
        await testFilterByStatus();
        
        // Test FILTER by PI_Received
        await testFilterByPIReceived();
        
        console.log('\n🔷 ==================== ALL TESTS COMPLETED ====================\n');
        console.log('⚠️ Note: DELETE test not included to prevent accidental data loss');
        console.log('⚠️ To test DELETE manually: DELETE /purchase-request/:id');
        
    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
    }
}

// Run the tests
runAllTests();
