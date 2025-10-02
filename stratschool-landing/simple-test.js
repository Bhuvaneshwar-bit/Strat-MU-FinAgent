// Simple API test for P&L endpoints
const testAPI = async () => {
  try {
    console.log('Testing basic health endpoint...');
    const response = await fetch('http://localhost:5000/api/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response body:', text);
    
    try {
      const json = JSON.parse(text);
      console.log('✅ JSON response:', json);
    } catch (e) {
      console.log('❌ Not valid JSON');
    }
    
  } catch (error) {
    console.error('Request failed:', error.message);
  }
};

testAPI();