// Quick test to verify Brand API
import express from 'express';
import { Brand } from './src/moduls/brand/brand.model.js';
import { manageBrands } from './src/moduls/brand/brand.controller.js';

console.log('✅ Brand model imported successfully');
console.log('✅ Brand controller imported successfully');

// Test Brand creation manually
const testBrandCreation = async () => {
  try {
    console.log('🧪 Testing Brand creation...');
    
    // Mock request object
    const mockReq = {
      method: 'POST',
      body: {
        Brand_Name: 'Test Brand ' + Date.now(),
        Supplier_Name: 'Test Supplier'
      },
      user: {
        _id: '507f1f77bcf86cd799439011', // Mock user ID
        isSuperAdmin: true
      }
    };

    // Mock response object
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`📄 Response Status: ${code}`);
          console.log('📄 Response Data:', JSON.stringify(data, null, 2));
          return data;
        }
      })
    };

    // Test the manageBrands function
    await manageBrands(mockReq, mockRes);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

console.log('🚀 Brand API components loaded successfully!');
console.log('To test Brand creation, uncomment testBrandCreation() call below');
// testBrandCreation();