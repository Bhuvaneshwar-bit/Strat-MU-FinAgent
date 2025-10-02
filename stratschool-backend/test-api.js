// Test script to verify API endpoints
const testAPI = async () => {
  try {
    // Test server connection
    console.log('Testing server connection...');
    const testResponse = await fetch('http://localhost:5000/api/test');
    const testData = await testResponse.json();
    console.log('✅ Server test:', testData);

    // Test signup
    console.log('\nTesting signup...');
    const signupResponse = await fetch('http://localhost:5000/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe', 
        email: 'john@example.com',
        password: 'password123'
      })
    });
    const signupData = await signupResponse.json();
    console.log('📝 Signup test:', signupData);

    // Test signin
    console.log('\nTesting signin...');
    const signinResponse = await fetch('http://localhost:5000/api/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'john@example.com',
        password: 'password123'
      })
    });
    const signinData = await signinResponse.json();
    console.log('🔐 Signin test:', signinData);

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testAPI();