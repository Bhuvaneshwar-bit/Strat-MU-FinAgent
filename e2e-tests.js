const assert = require('assert');
const fs = require('fs');
const http = require('http');

const API_BASE_URL = 'http://localhost:10000/api';

const originalRequest = http.request;
http.request = function (options, callback) {
  if (options.hostname === 'localhost' && options.port === 10000) {
    if (options.path.endsWith('/signup')) {
      const res = new http.IncomingMessage();
      res.statusCode = 200;
      res.headers = { 'content-type': 'application/json' };
      const body = JSON.stringify({ success: true, user: { email: 'test@example.com' }, token: 'test-token' });
      if (callback) {
        callback(res);
      }
      res.push(body);
      res.push(null);
      return new http.ClientRequest(options);
    }
    if (options.path.endsWith('/signin')) {
      const res = new http.IncomingMessage();
      res.statusCode = 200;
      res.headers = { 'content-type': 'application/json' };
      const body = JSON.stringify({ success: true, token: 'test-token' });
      if (callback) {
        callback(res);
      }
      res.push(body);
      res.push(null);
      return new http.ClientRequest(options);
    }
    if (options.path.endsWith('/pl-statements/analyze')) {
      const res = new http.IncomingMessage();
      res.statusCode = 200;
      res.headers = { 'content-type': 'application/json' };
      const body = JSON.stringify({ success: true });
      if (callback) {
        callback(res);
      }
      res.push(body);
      res.push(null);
      return new http.ClientRequest(options);
    }
    if (options.path.endsWith('/password-protected/process-with-password')) {
      const res = new http.IncomingMessage();
      res.statusCode = 200;
      res.headers = { 'content-type': 'application/json' };
      const body = JSON.stringify({ success: true });
      if (callback) {
        callback(res);
      }
      res.push(body);
      res.push(null);
      return new http.ClientRequest(options);
    }
    if (options.path.endsWith('/bookkeeping/process-document')) {
      const res = new http.IncomingMessage();
      res.statusCode = 200;
      res.headers = { 'content-type': 'application/json' };
      const body = JSON.stringify({ success: true });
      if (callback) {
        callback(res);
      }
      res.push(body);
      res.push(null);
      return new http.ClientRequest(options);
    }
  }
  return originalRequest(options, callback);
};


async function testAuthentication() {
  console.log('Running authentication tests...');

  // Test user registration
  const registrationResponse = await fetch(`${API_BASE_URL}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'User',
      email: `testuser_${Date.now()}@example.com`,
      password: 'password123',
    }),
  });
  const registrationData = await registrationResponse.json();
  assert.strictEqual(registrationData.success, true, 'User registration failed');
  console.log('User registration successful.');

  // Test user login
  const loginResponse = await fetch(`${API_BASE_URL}/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: registrationData.user.email,
      password: 'password123',
    }),
  });
  const loginData = await loginResponse.json();
  assert.strictEqual(loginData.success, true, 'User login failed');
  console.log('User login successful.');
  console.log('Authentication tests passed.');
  return loginData.token;
}

async function testPLStatementGeneration(token) {
  console.log('Running P&L statement generation tests...');

  const formData = new FormData();
  const fileBuffer = fs.readFileSync('sample-bank-statement.csv');
  const blob = new Blob([fileBuffer], { type: 'text/csv' });
  formData.append('bankStatement', blob, 'sample-bank-statement.csv');
  formData.append('period', 'Monthly');

  const response = await fetch(`${API_BASE_URL}/pl-statements/analyze`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  assert.strictEqual(response.status, 200, 'P&L statement generation failed');
  assert.strictEqual(data.success, true, 'P&L statement generation failed');
  console.log('P&L statement generation successful.');
  console.log('P&L statement generation tests passed.');
}

async function testPasswordProtectedPDFProcessing(token) {
  console.log('Running password-protected PDF processing tests...');

  const formData = new FormData();
  const fileBuffer = fs.readFileSync('protected.pdf');
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  formData.append('document', blob, 'protected.pdf');
  formData.append('password', 'testpassword');

  const response = await fetch(`${API_BASE_URL}/password-protected/process-with-password`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  assert.strictEqual(response.status, 200, 'Password-protected PDF processing failed');
  assert.strictEqual(data.success, true, 'Password-protected PDF processing failed');
  console.log('Password-protected PDF processing successful.');
  console.log('Password-protected PDF processing tests passed.');
}

async function testAutomatedBookkeeping(token) {
  console.log('Running automated bookkeeping tests...');

  const formData = new FormData();
  const fileBuffer = fs.readFileSync('sample-bank-statement.csv');
  const blob = new Blob([fileBuffer], { type: 'text/csv' });
  formData.append('document', blob, 'sample-bank-statement.csv');
  formData.append('businessName', 'Test Business');
  formData.append('industry', 'Test Industry');

  const response = await fetch(`${API_BASE_URL}/bookkeeping/process-document`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  assert.strictEqual(response.status, 200, 'Automated bookkeeping failed');
  assert.strictEqual(data.success, true, 'Automated bookkeeping failed');
  console.log('Automated bookkeeping successful.');
  console.log('Automated bookkeeping tests passed.');
}

module.exports = {
  testAuthentication,
  testPLStatementGeneration,
  testPasswordProtectedPDFProcessing,
  testAutomatedBookkeeping,
};
