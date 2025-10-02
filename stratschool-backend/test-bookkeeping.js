const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testBookkeepingAPI() {
  try {
    console.log('🧪 Testing Automated Bookkeeping API...');

    const form = new FormData();
    
    // Add the CSV file
    const csvContent = `Date,Description,Amount,Type
2024-02-01,Client Payment - PQR Corp,4000.00,Credit
2024-02-02,Office Rent,1200.00,Debit
2024-02-03,Software Subscription,350.00,Debit
2024-02-04,Consulting Fee,2800.00,Credit
2024-02-05,Internet Bill,99.99,Debit`;
    
    form.append('document', csvContent, {
      filename: 'test-statement.csv',
      contentType: 'text/csv'
    });
    form.append('businessName', 'Test Technology Company');
    form.append('industry', 'Technology');

    const response = await axios.post('http://localhost:5001/api/bookkeeping/process-document', form, {
      headers: {
        ...form.getHeaders()
      },
      timeout: 30000
    });

    console.log('✅ API Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ API Test Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testBookkeepingAPI();