const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting StratSchool Multi-Server Setup...\n');

// Start simple-server.js on port 5000 (authentication server)
const authServer = spawn('node', ['simple-server.js'], {
  cwd: path.join(__dirname),
  stdio: ['inherit', 'pipe', 'pipe'],
  env: { ...process.env, PORT: '5000' }
});

// Start server.js on port 5001 (main API server)
const apiServer = spawn('node', ['server.js'], {
  cwd: path.join(__dirname),
  stdio: ['inherit', 'pipe', 'pipe'],
  env: { ...process.env, PORT: '5001' }
});

// Handle auth server output
authServer.stdout.on('data', (data) => {
  console.log(`🔐 [AUTH:5000] ${data.toString().trim()}`);
});

authServer.stderr.on('data', (data) => {
  console.error(`🔐 [AUTH:5000] ERROR: ${data.toString().trim()}`);
});

// Handle API server output
apiServer.stdout.on('data', (data) => {
  console.log(`🌐 [API:5001] ${data.toString().trim()}`);
});

apiServer.stderr.on('data', (data) => {
  console.error(`🌐 [API:5001] ERROR: ${data.toString().trim()}`);
});

// Handle process exits
authServer.on('close', (code) => {
  console.log(`🔐 Auth server (port 5000) exited with code ${code}`);
  if (code !== 0) {
    console.error('Auth server crashed! Exiting...');
    process.exit(1);
  }
});

apiServer.on('close', (code) => {
  console.log(`🌐 API server (port 5001) exited with code ${code}`);
  if (code !== 0) {
    console.error('API server crashed! Exiting...');
    process.exit(1);
  }
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  authServer.kill();
  apiServer.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down servers...');
  authServer.kill();
  apiServer.kill();
  process.exit(0);
});

console.log('✅ Multi-server setup initialized');
console.log('🔐 Authentication Server: Port 5000');
console.log('🌐 Main API Server: Port 5001');
console.log('📱 React Frontend: Served from API server\n');