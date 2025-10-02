const express = require('express');
const router = express.Router();
const multer = require('multer');
const PLStatement = require('../models/PLStatement');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow bank statement file types
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload PDF, CSV, Excel, or TXT files only.'), false);
    }
  }
});

// Upload and analyze bank statement
router.post('/analyze', authenticateToken, upload.single('bankStatement'), async (req, res) => {
  try {
    const { period } = req.body;
    const userId = req.user.userId;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Bank statement file is required' });
    }
    
    if (!period || !['Weekly', 'Monthly', 'Yearly'].includes(period)) {
      return res.status(400).json({ message: 'Valid period is required (Weekly, Monthly, or Yearly)' });
    }
    
    // File validation passed, now we can process
    const fileData = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer
    };
    
    // Here we would normally process the file and extract transaction data
    // For now, we'll return success to allow frontend AI processing
    res.json({
      success: true,
      message: 'File uploaded successfully',
      fileInfo: {
        name: fileData.originalName,
        size: fileData.size,
        type: fileData.mimeType
      },
      period: period,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('File upload error:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum 10MB allowed.' });
    }
    
    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
});

// Save P&L statement results
router.post('/save-statement', authenticateToken, async (req, res) => {
  try {
    const { period, statement, insights, metadata } = req.body;
    const userId = req.user.userId;
    
    // Validate required fields
    if (!period || !statement) {
      return res.status(400).json({ message: 'Period and statement data are required' });
    }
    
    // Create new P&L statement document
    const plStatement = new PLStatement({
      userId,
      period,
      statement,
      insights: insights || [],
      metadata: {
        ...metadata,
        createdAt: new Date(),
        analysisType: 'AI-Generated',
        version: '1.0'
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

// Get user's P&L statements
router.get('/statements', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { period, limit = 10, page = 1 } = req.query;
    
    // Build query filter
    const filter = { userId };
    if (period && ['Weekly', 'Monthly', 'Yearly'].includes(period)) {
      filter.period = period;
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Fetch statements with pagination
    const statements = await PLStatement.find(filter)
      .sort({ 'metadata.createdAt': -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-__v');
    
    // Get total count for pagination
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

// Get specific P&L statement
router.get('/statements/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const statement = await PLStatement.findOne({ _id: id, userId }).select('-__v');
    
    if (!statement) {
      return res.status(404).json({ message: 'P&L statement not found' });
    }
    
    res.json({
      success: true,
      statement
    });
    
  } catch (error) {
    console.error('Get P&L statement error:', error);
    res.status(500).json({ message: 'Failed to retrieve P&L statement', error: error.message });
  }
});

// Delete P&L statement
router.delete('/statements/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const statement = await PLStatement.findOneAndDelete({ _id: id, userId });
    
    if (!statement) {
      return res.status(404).json({ message: 'P&L statement not found' });
    }
    
    res.json({
      success: true,
      message: 'P&L statement deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete P&L statement error:', error);
    res.status(500).json({ message: 'Failed to delete P&L statement', error: error.message });
  }
});

// Get P&L analytics and insights
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get all user's statements for analytics
    const statements = await PLStatement.find({ userId, status: 'completed' })
      .sort({ 'metadata.createdAt': -1 })
      .limit(12); // Last 12 statements for trend analysis
    
    if (statements.length === 0) {
      return res.json({
        success: true,
        analytics: {
          totalStatements: 0,
          averageRevenue: 0,
          averageProfit: 0,
          trends: [],
          insights: []
        }
      });
    }
    
    // Calculate analytics
    const totalStatements = statements.length;
    const revenues = statements.map(s => s.statement.revenue?.totalRevenue || 0);
    const profits = statements.map(s => s.statement.netProfit || 0);
    
    const averageRevenue = revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length;
    const averageProfit = profits.reduce((sum, profit) => sum + profit, 0) / profits.length;
    
    // Generate trends data
    const trends = statements.map((statement, index) => ({
      period: statement.period,
      date: statement.metadata.createdAt,
      revenue: statement.statement.revenue?.totalRevenue || 0,
      profit: statement.statement.netProfit || 0,
      margin: statement.statement.profitMargin || 0
    })).reverse(); // Chronological order
    
    // Aggregate insights
    const allInsights = statements.flatMap(s => s.insights || []);
    const insightsSummary = {
      positive: allInsights.filter(i => i.type === 'positive').length,
      warnings: allInsights.filter(i => i.type === 'warning').length,
      actions: allInsights.filter(i => i.type === 'action').length,
      insights: allInsights.filter(i => i.type === 'insight').length
    };
    
    res.json({
      success: true,
      analytics: {
        totalStatements,
        averageRevenue: Math.round(averageRevenue),
        averageProfit: Math.round(averageProfit),
        trends,
        insightsSummary,
        latestInsights: allInsights.slice(0, 5) // Most recent insights
      }
    });
    
  } catch (error) {
    console.error('Get P&L analytics error:', error);
    res.status(500).json({ message: 'Failed to retrieve analytics', error: error.message });
  }
});

module.exports = router;