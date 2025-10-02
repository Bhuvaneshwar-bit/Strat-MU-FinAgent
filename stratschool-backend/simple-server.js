const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const csv = require('csv-parser');
const XLSX = require('xlsx');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.log('❌ MongoDB Error:', err.message);
    console.log('⚠️  Continuing without database for testing...');
  });

// Simple User Schema
const User = mongoose.model('User', {
  firstName: String,
  lastName: String, 
  email: { type: String, unique: true },
  password: String
});

// Simple PLStatement Schema
const PLStatement = mongoose.model('PLStatement', {
  userId: mongoose.Schema.Types.ObjectId,
  period: String,
  statement: Object,
  insights: Array,
  metadata: Object,
  status: { type: String, default: 'completed' },
  createdAt: { type: Date, default: Date.now }
});

// Simple Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // For development, create a mock user
    req.user = { userId: '66f8c5d5e4b8a1234567890a' };
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      // For development, create a mock user
      req.user = { userId: '66f8c5d5e4b8a1234567890a' };
      return next();
    }
    req.user = user;
    next();
  });
};

// File Processing Endpoint
app.post('/api/process-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, mimetype, buffer } = req.file;
    let extractedData = '';

    console.log(`📁 Processing file: ${originalname} (${mimetype})`);

    // Process based on file type
    if (mimetype === 'application/pdf') {
      // Parse PDF
      const pdfData = await pdfParse(buffer);
      extractedData = pdfData.text;
    } else if (mimetype === 'text/csv' || originalname.endsWith('.csv')) {
      // Parse CSV
      extractedData = buffer.toString();
    } else if (mimetype.includes('spreadsheet') || originalname.endsWith('.xlsx') || originalname.endsWith('.xls')) {
      // Parse Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      extractedData = jsonData.map(row => row.join(',')).join('\n');
    } else if (mimetype === 'text/plain') {
      // Parse text file
      extractedData = buffer.toString();
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    console.log(`✅ Extracted ${extractedData.length} characters from ${originalname}`);

    res.json({
      success: true,
      filename: originalname,
      type: mimetype,
      dataLength: extractedData.length,
      extractedData: extractedData.substring(0, 10000) // Limit to first 10k chars for response
    });

  } catch (error) {
    console.error('❌ File processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process file',
      details: error.message 
    });
  }
});

// Sign Up Route
app.post('/api/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    const user = new User({ firstName, lastName, email, password });
    await user.save();
    
    res.json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// Sign In Route  
app.post('/api/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email, password });
    
    if (user) {
      res.json({ success: true, message: 'Login successful', user: { firstName: user.firstName, lastName: user.lastName, email: user.email } });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// P&L Statement Routes
app.post('/api/pl/save-statement', authenticateToken, async (req, res) => {
  try {
    const { period, statement, insights, metadata } = req.body;
    const userId = req.user.userId;
    
    if (!period || !statement) {
      return res.status(400).json({ message: 'Period and statement data are required' });
    }
    
    const plStatement = new PLStatement({
      userId,
      period,
      statement,
      insights: insights || [],
      metadata: {
        ...metadata,
        createdAt: new Date(),
        analysisType: 'AI-Generated'
      },
      status: 'completed'
    });
    
    const savedStatement = await plStatement.save();
    
    res.status(201).json({
      success: true,
      message: 'P&L statement saved successfully',
      statementId: savedStatement._id,
      statement: savedStatement
    });
    
  } catch (error) {
    console.error('Save P&L statement error:', error);
    res.status(500).json({ message: 'Failed to save P&L statement', error: error.message });
  }
});

app.get('/api/pl/statements', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { period, limit = 10, page = 1 } = req.query;
    
    const filter = { userId };
    if (period && ['Weekly', 'Monthly', 'Yearly'].includes(period)) {
      filter.period = period;
    }
    
    const skip = (page - 1) * limit;
    
    const statements = await PLStatement.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const totalCount = await PLStatement.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    
    res.json({
      success: true,
      statements,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('Get P&L statements error:', error);
    res.status(500).json({ message: 'Failed to retrieve P&L statements', error: error.message });
  }
});

app.post('/api/pl/analyze', authenticateToken, async (req, res) => {
  try {
    const { period, fileInfo } = req.body;
    const userId = req.user.userId;
    
    if (!period || !['Weekly', 'Monthly', 'Yearly'].includes(period)) {
      return res.status(400).json({ message: 'Valid period is required' });
    }
    
    // Simulate file processing success
    res.json({
      success: true,
      message: 'File analysis initiated',
      fileInfo: fileInfo || { name: 'Bank Statement', size: 0, type: 'application/pdf' },
      period: period,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('File analysis error:', error);
    res.status(500).json({ message: 'File analysis failed', error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});