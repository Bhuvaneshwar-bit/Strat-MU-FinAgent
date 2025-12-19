const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const connectDB = require('./src/config/database');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration - Allow all for development
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(generalLimiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('📋 Headers:', Object.keys(req.headers));
  next();
});

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api', require('./src/routes/authRoutes')); // Direct auth routes (signin, signup)
app.use('/api/invoices', require('./src/routes/invoiceRoutes'));
app.use('/api/gst-invoices', require('./src/routes/gstInvoiceRoutes')); // GST Invoice routes
app.use('/api/pl-statements', require('./src/routes/plStatements'));
app.use('/api/chat', require('./src/routes/chat'));
app.use('/api/bookkeeping', require('./src/routes/automatedBookkeeping'));
app.use('/api/password-protected', require('./src/routes/passwordProtectedDocuments'));
app.use('/api/overview', require('./src/routes/overview')); // Real-time overview data
app.use('/api/upload', require('./src/routes/uploadBankStatement')); // AWS Textract bank statement upload

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'StratSchool API is running',
    timestamp: new Date().toISOString()
  });
});

// IFSC Code Lookup - Proxy to Razorpay IFSC API (avoids CSP issues)
app.get('/api/ifsc/:code', async (req, res) => {
  try {
    const ifscCode = req.params.code.toUpperCase();
    
    // Validate IFSC format
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode)) {
      return res.status(400).json({ success: false, message: 'Invalid IFSC format' });
    }
    
    const response = await fetch(`https://ifsc.razorpay.com/${ifscCode}`);
    
    if (response.ok) {
      const data = await response.json();
      res.json({
        success: true,
        bank: data.BANK,
        branch: data.BRANCH,
        address: data.ADDRESS,
        city: data.CITY,
        state: data.STATE,
        ifsc: data.IFSC
      });
    } else if (response.status === 404) {
      res.status(404).json({ success: false, message: 'IFSC not found' });
    } else {
      res.status(500).json({ success: false, message: 'Lookup failed' });
    }
  } catch (error) {
    console.error('IFSC lookup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../stratschool-landing/dist')));

// Handle React routing - serve index.html for all non-API routes
app.use((req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: `API route ${req.originalUrl} not found`
    });
  }
  
  // Serve React app for all other routes
  res.sendFile(path.join(__dirname, '../stratschool-landing/dist/index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 StratSchool server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend served from: /`);
  console.log(`📡 API endpoints: /api/*`);
  console.log(`🔗 Public URL: https://strat-mu-finagent.onrender.com`);
});