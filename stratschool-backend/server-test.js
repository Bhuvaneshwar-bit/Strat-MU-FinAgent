const express = require('express');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(express.json());

// Simple test route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'StratSchool API is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});