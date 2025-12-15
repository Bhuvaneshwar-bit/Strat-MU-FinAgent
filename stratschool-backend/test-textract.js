/**
 * Test Script for AWS Textract Bank Statement Parser
 * Run with: node test-textract.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function printSeparator() {
  console.log('\n' + '='.repeat(60) + '\n');
}

async function testHealthCheck() {
  printSeparator();
  log('TEST 1: Health Check', 'cyan');
  printSeparator();
  
  try {
    const response = await axios.get(`${BASE_URL}/api/upload/health`);
    
    log('✅ Health check passed', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (!response.data.configuration.s3Configured) {
      log('\n⚠️  WARNING: S3 is not configured. Please set AWS credentials in .env file', 'yellow');
      return false;
    }
    
    return true;
  } catch (error) {
    log('❌ Health check failed', 'red');
    console.error(error.response?.data || error.message);
    return false;
  }
}

async function testLogin() {
  printSeparator();
  log('TEST 2: Login (Get JWT Token)', 'cyan');
  printSeparator();
  
  try {
    // Try to login with default test credentials
    const response = await axios.post(`${BASE_URL}/api/auth/signin`, {
      email: 'test@stratschool.com',
      password: 'test123'
    });
    
    log('✅ Login successful', 'green');
    console.log('Token:', response.data.token?.substring(0, 20) + '...');
    
    return response.data.token;
  } catch (error) {
    log('❌ Login failed. You may need to create a test user first.', 'red');
    console.error(error.response?.data || error.message);
    
    log('\n💡 To create a test user, run:', 'yellow');
    log('curl -X POST http://localhost:5001/api/auth/signup -H "Content-Type: application/json" -d \'{"email":"test@stratschool.com","password":"test123","name":"Test User"}\'', 'yellow');
    
    return null;
  }
}

async function testUploadNonPasswordPDF(token, pdfPath) {
  printSeparator();
  log('TEST 3: Upload Non-Password Protected PDF', 'cyan');
  printSeparator();
  
  if (!token) {
    log('⏭️  Skipping - No JWT token available', 'yellow');
    return;
  }
  
  if (!fs.existsSync(pdfPath)) {
    log(`⏭️  Skipping - PDF file not found: ${pdfPath}`, 'yellow');
    log('💡 Place a sample bank statement PDF in the backend folder', 'yellow');
    return;
  }
  
  try {
    log(`📤 Uploading: ${path.basename(pdfPath)}`, 'blue');
    
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(pdfPath));
    formData.append('async', 'false');
    
    const response = await axios.post(
      `${BASE_URL}/api/upload/bank-statement`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    log('✅ Upload and processing successful', 'green');
    
    const data = response.data.data;
    console.log('\n📊 Extracted Data:');
    console.log('─'.repeat(60));
    console.log(`Account Holder: ${data.account_holder || 'Not found'}`);
    console.log(`Account Number: ${data.account_number || 'Not found'}`);
    console.log(`IFSC Code: ${data.ifsc_code || 'Not found'}`);
    console.log(`Bank Name: ${data.bank_name || 'Not found'}`);
    console.log(`Statement Period: ${data.statement_period?.from} to ${data.statement_period?.to}`);
    console.log(`Opening Balance: ₹${data.opening_balance || 0}`);
    console.log(`Closing Balance: ₹${data.closing_balance || 0}`);
    console.log('─'.repeat(60));
    
    console.log('\n💰 Summary:');
    console.log(`Total Credits: ₹${data.summary.total_credits.toFixed(2)}`);
    console.log(`Total Debits: ₹${data.summary.total_debits.toFixed(2)}`);
    console.log(`Net Change: ₹${data.summary.net_change.toFixed(2)}`);
    console.log(`Transaction Count: ${data.summary.transaction_count}`);
    
    if (data.transactions && data.transactions.length > 0) {
      console.log('\n📝 Sample Transactions (First 3):');
      console.log('─'.repeat(60));
      data.transactions.slice(0, 3).forEach(txn => {
        console.log(`Date: ${txn.date}`);
        console.log(`Description: ${txn.description}`);
        console.log(`Amount: ₹${txn.amount} (${txn.type})`);
        console.log(`Balance: ₹${txn.balance}`);
        console.log('─'.repeat(60));
      });
    }
    
    console.log('\n📍 Metadata:');
    console.log(`File: ${data.metadata.filename}`);
    console.log(`Size: ${(data.metadata.fileSize / 1024).toFixed(2)} KB`);
    console.log(`Password Protected: ${data.metadata.wasPasswordProtected ? 'Yes' : 'No'}`);
    console.log(`S3 Key: ${data.metadata.s3Key}`);
    console.log(`Processed At: ${data.metadata.processedAt}`);
    
  } catch (error) {
    log('❌ Upload failed', 'red');
    const errorData = error.response?.data;
    
    if (errorData?.error === 'PASSWORD_REQUIRED') {
      log('🔒 This PDF is password protected. Use test 4 instead.', 'yellow');
    } else if (errorData?.error === 'S3_NOT_CONFIGURED') {
      log('⚠️  AWS S3 is not configured. Check your .env file.', 'yellow');
    } else {
      console.error(errorData || error.message);
    }
  }
}

async function testUploadPasswordProtectedPDF(token, pdfPath, password) {
  printSeparator();
  log('TEST 4: Upload Password-Protected PDF', 'cyan');
  printSeparator();
  
  if (!token) {
    log('⏭️  Skipping - No JWT token available', 'yellow');
    return;
  }
  
  if (!fs.existsSync(pdfPath)) {
    log(`⏭️  Skipping - PDF file not found: ${pdfPath}`, 'yellow');
    return;
  }
  
  try {
    log(`📤 Uploading: ${path.basename(pdfPath)}`, 'blue');
    log(`🔑 Using password: ${password}`, 'blue');
    
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(pdfPath));
    formData.append('password', password);
    formData.append('async', 'false');
    
    const response = await axios.post(
      `${BASE_URL}/api/upload/bank-statement`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    log('✅ Password-protected PDF processed successfully', 'green');
    console.log(`\n🔓 PDF was unlocked and processed`);
    console.log(`Account: ${response.data.data.account_number || 'Not found'}`);
    console.log(`Transactions: ${response.data.data.summary.transaction_count}`);
    
  } catch (error) {
    log('❌ Upload failed', 'red');
    const errorData = error.response?.data;
    
    if (errorData?.error === 'INCORRECT_PASSWORD') {
      log('🔐 The password provided is incorrect', 'red');
    } else {
      console.error(errorData || error.message);
    }
  }
}

async function testErrorCases(token) {
  printSeparator();
  log('TEST 5: Error Case - No File Upload', 'cyan');
  printSeparator();
  
  if (!token) {
    log('⏭️  Skipping - No JWT token available', 'yellow');
    return;
  }
  
  try {
    const formData = new FormData();
    formData.append('async', 'false');
    
    await axios.post(
      `${BASE_URL}/api/upload/bank-statement`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    log('❌ Test failed - Should have returned error', 'red');
  } catch (error) {
    const errorData = error.response?.data;
    if (errorData?.error === 'NO_FILE') {
      log('✅ Correctly returned NO_FILE error', 'green');
      console.log(JSON.stringify(errorData, null, 2));
    } else {
      log('❌ Unexpected error', 'red');
      console.error(errorData || error.message);
    }
  }
}

async function runAllTests() {
  log('\n🚀 AWS Textract Bank Statement Parser - Test Suite', 'bright');
  log('════════════════════════════════════════════════════════════', 'bright');
  
  // Test 1: Health check
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    log('\n⚠️  Service not fully configured. Some tests will be skipped.', 'yellow');
  }
  
  // Test 2: Login
  const token = await testLogin();
  
  // Test 3: Upload non-password PDF
  const samplePdfPath = path.join(__dirname, 'sample-bank-statement.pdf');
  await testUploadNonPasswordPDF(token, samplePdfPath);
  
  // Test 4: Upload password-protected PDF
  const protectedPdfPath = path.join(__dirname, 'protected-statement.pdf');
  const pdfPassword = 'test123'; // Change this to your PDF's password
  await testUploadPasswordProtectedPDF(token, protectedPdfPath, pdfPassword);
  
  // Test 5: Error cases
  await testErrorCases(token);
  
  // Final summary
  printSeparator();
  log('✅ Test Suite Complete', 'green');
  printSeparator();
  
  log('\n📚 Next Steps:', 'cyan');
  log('1. Place sample bank statement PDFs in the backend folder', 'yellow');
  log('2. Configure AWS credentials in .env file', 'yellow');
  log('3. Create S3 bucket: stratschool-bank-statements', 'yellow');
  log('4. Set up IAM permissions (see AWS_TEXTRACT_README.md)', 'yellow');
  log('\n💡 For manual testing, use the Postman collection or cURL examples in EXAMPLES.js', 'yellow');
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testHealthCheck,
  testLogin,
  testUploadNonPasswordPDF,
  testUploadPasswordProtectedPDF,
  testErrorCases
};
