const autocannon = require('autocannon');
const fs = require('fs');

const API_BASE_URL = 'http://localhost:10000/api';

async function runStressTest() {
  console.log('Running stress test...');

  const instance = autocannon({
    url: API_BASE_URL,
    connections: 100,
    pipelining: 1,
    duration: 300, // 5 minutes
    setupClient: (client) => {
      client.on('request', (req) => {
        if (req && req.path.includes('/pl-statements/analyze')) {
          // Get a new token for each request
          fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              firstName: 'Test',
              lastName: 'User',
              email: `testuser_${Math.random()}@example.com`,
              password: 'password123',
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              req.headers['Authorization'] = `Bearer ${data.token}`;
            });
        }
      });
    },
    requests: [
      {
        method: 'POST',
        path: '/pl-statements/analyze',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
        },
        body: `------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name=\"bankStatement\"; filename=\"sample-bank-statement.csv\"\r\nContent-Type: text/csv\r\n\r\n${fs.readFileSync('sample-bank-statement.csv')}\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name=\"period\"\r\n\r\nMonthly\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--`,
      },
    ],
  });

  autocannon.track(instance, { renderProgressBar: true });
}

runStressTest();
