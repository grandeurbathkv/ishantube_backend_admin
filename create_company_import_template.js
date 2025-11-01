// Script to create a sample Company Excel template for import
import XLSX from 'xlsx';

// Sample data with correct format
const sampleData = [
  {
    'Company Code': 'TEST',
    'Company Name': 'Test Company Limited',
    'Address Line 1': '123 Test Street',
    'Address Line 2': 'Test Area',
    'Address Line 3': 'Test City',
    'Phone Number': '9876543210',
    'GST Number': '29ABCDE1234F1Z5',
    'Bank Name': 'State Bank of India',
    'Bank Branch': 'Main Branch',
    'IFSC Code': 'SBIN0001234',
    'Account Number': '1234567890123456',
    'Status': 'Active'
  },
  {
    'Company Code': 'DEMO',
    'Company Name': 'Demo Industries Private Limited',
    'Address Line 1': '456 Demo Road',
    'Address Line 2': 'Industrial Estate',
    'Address Line 3': 'Demo City - 400001',
    'Phone Number': '9999999999',
    'GST Number': '27XYZAB5678C2Z9',
    'Bank Name': 'HDFC Bank',
    'Bank Branch': 'Corporate Branch',
    'IFSC Code': 'HDFC0000123',
    'Account Number': '9876543210987654',
    'Status': 'Active'
  }
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(sampleData);

// Set column widths for better readability
worksheet['!cols'] = [
  { wch: 15 },  // Company Code
  { wch: 35 },  // Company Name
  { wch: 35 },  // Address Line 1
  { wch: 35 },  // Address Line 2
  { wch: 35 },  // Address Line 3
  { wch: 15 },  // Phone Number
  { wch: 18 },  // GST Number
  { wch: 25 },  // Bank Name
  { wch: 25 },  // Bank Branch
  { wch: 15 },  // IFSC Code
  { wch: 20 },  // Account Number
  { wch: 10 },  // Status
];

XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');

// Write to file
XLSX.writeFile(workbook, 'company_import_template.xlsx');

console.log('✅ Company import template created: company_import_template.xlsx');
console.log('');
console.log('📋 Instructions:');
console.log('1. Fill in your company data following the sample format');
console.log('2. Required fields: Company Code (4 chars), Company Name, Address Line 1, Phone Number (10 digits), GST Number (15 chars)');
console.log('3. Optional fields: Address Line 2, Address Line 3, Bank Name, Bank Branch, IFSC Code, Account Number');
console.log('4. Status should be either "Active" or "Inactive" (default: Active)');
console.log('5. Upload via the Import button in the Company List page');
