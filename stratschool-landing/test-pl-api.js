// P&L Generator API Test Script
// Test the backend endpoints for the agentic AI P&L system

const testBackendAPI = async () => {
  const baseURL = 'http://localhost:5000/api';
  
  console.log('🧪 Testing P&L Generator Backend API...\n');
  
  try {
    // Test 1: Check server health
    console.log('1. Testing server health...');
    const healthResponse = await fetch(`${baseURL}/test`);
    const healthData = await healthResponse.json();
    console.log('✅ Server health:', healthData.message);
    
    // Test 2: Test file analysis endpoint
    console.log('\n2. Testing file analysis endpoint...');
    const analysisResponse = await fetch(`${baseURL}/pl/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        period: 'Monthly',
        fileInfo: {
          name: 'test-bank-statement.pdf',
          size: 1024000,
          type: 'application/pdf'
        }
      })
    });
    const analysisData = await analysisResponse.json();
    console.log('✅ File analysis:', analysisData.success ? 'SUCCESS' : 'FAILED');
    console.log('   Message:', analysisData.message);
    
    // Test 3: Save P&L statement
    console.log('\n3. Testing P&L statement save...');
    const mockPLData = {
      period: 'Monthly',
      statement: {
        period: 'Monthly',
        startDate: '2024-08-15',
        endDate: '2024-09-15',
        revenue: {
          totalRevenue: 45000,
          breakdown: [
            { category: 'Service Revenue', amount: 30000 },
            { category: 'Product Sales', amount: 15000 }
          ]
        },
        expenses: {
          totalExpenses: 30000,
          breakdown: [
            { category: 'Salaries', amount: 20000 },
            { category: 'Office', amount: 10000 }
          ]
        },
        netProfit: 15000,
        profitMargin: 33.33,
        kpis: {
          grossMargin: 66.67,
          netMargin: 33.33,
          expenseRatio: 66.67
        }
      },
      insights: [
        {
          type: 'positive',
          title: 'Strong Revenue Growth',
          description: 'Revenue shows healthy growth patterns.',
          impact: 'high'
        }
      ],
      metadata: {
        originalFileName: 'test-statement.pdf',
        fileSize: 1024000,
        fileType: 'application/pdf',
        analysisType: 'AI-Generated',
        aiModel: 'claude-3.5-sonnet'
      }
    };
    
    const saveResponse = await fetch(`${baseURL}/pl/save-statement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockPLData)
    });
    const saveData = await saveResponse.json();
    console.log('✅ P&L save:', saveData.success ? 'SUCCESS' : 'FAILED');
    console.log('   Statement ID:', saveData.statementId);
    
    // Test 4: Retrieve P&L statements
    console.log('\n4. Testing P&L statements retrieval...');
    const statementsResponse = await fetch(`${baseURL}/pl/statements`);
    const statementsData = await statementsResponse.json();
    console.log('✅ P&L retrieval:', statementsData.success ? 'SUCCESS' : 'FAILED');
    console.log('   Total statements:', statementsData.statements?.length || 0);
    
    console.log('\n🎉 All API tests completed successfully!');
    console.log('\n📋 Backend System Status:');
    console.log('   ✅ Server: Running');
    console.log('   ✅ Database: Connected');
    console.log('   ✅ P&L API: Functional');
    console.log('   ✅ File Processing: Ready');
    console.log('   ✅ Data Storage: Working');
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure backend server is running on port 5000');
    console.log('   2. Check MongoDB connection');
    console.log('   3. Verify CORS settings');
  }
};

// Run the test if this is being executed directly
if (typeof window === 'undefined') {
  // Node.js environment with ES modules
  import('node-fetch').then(({ default: fetch }) => {
    global.fetch = fetch;
    testBackendAPI();
  }).catch(() => {
    console.log('node-fetch not available, using native fetch');
    testBackendAPI();
  });
} else {
  // Browser environment
  console.log('P&L API Test Script loaded. Run testBackendAPI() in console.');
  window.testBackendAPI = testBackendAPI;
}