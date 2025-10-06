const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting StratSchool Unified Server Setup...\n');

// For Render deployment, we'll only run the main API server
// The auth functionality should be merged into the main server
const mainServer = spawn('node', ['server.js'], {
  cwd: path.join(__dirname),
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT || '10000' }
});

// Handle process exit
mainServer.on('close', (code) => {
  console.log(`🌐 Main server exited with code ${code}`);
  process.exit(code);
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  mainServer.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  mainServer.kill();
  process.exit(0);
});

console.log('✅ Unified server setup initialized');
console.log('🌐 Main Server: Port', process.env.PORT || '10000');
console.log('📱 React Frontend: Served from main server\n');