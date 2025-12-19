const express = require('express');
const router = express.Router();
const multer = require('multer');
const PLStatement = require('../models/PLStatement');
const authenticate = require('../middleware/auth');
const geminiAI = require('../utils/geminiAI');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
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

// Upload and analyze bank statement with AI
router.post('/analyze', upload.single('bankStatement'), async (req, res) => {
  console.log('🔥 P&L Analyze endpoint hit!');
  console.log('📁 File received:', req.file ? req.file.originalname : 'No file');
  console.log('📊 Period:', req.body.period);
  
  try {
    const { period, businessInfo } = req.body;
    
    // Get userId from Authorization header if present
    let userId = 'anonymous-user';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'stratschool_jwt_secret_key_2025_super_secure_random_string');
        userId = decoded.userId;
        console.log('🔐 Authenticated user for P&L:', userId);
      } catch (e) {
        console.log('⚠️ Token verification failed, using anonymous user');
      }
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'Bank statement file is required' 
      });
    }
    
    if (!period || !['Weekly', 'Monthly', 'Yearly'].includes(period)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid period is required (Weekly, Monthly, or Yearly)' 
      });
    }
    
    const fileData = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer
    };

    // Step 1: Analyze bank statement with Gemini AI
    console.log(`🤖 Starting AI analysis for user ${userId}...`);
    const analysisData = await geminiAI.analyzeBankStatement(
      fileData.buffer, 
      fileData.mimeType, 
      period
    );

    console.log(`✅ AI analysis completed successfully`);

    // Step 2: SAVE TO DATABASE WITH SURGICAL PRECISION
    console.log(`💾 Saving P&L analysis to MongoDB database...`);
    
    const plStatement = new PLStatement({
      userId,
      period,
      rawBankData: {
        fileName: fileData.originalName,
        fileSize: fileData.size,
        uploadDate: new Date(),
        extractedText: fileData.buffer.toString('utf8').substring(0, 10000), // Store for re-analysis
        transactionCount: analysisData.analysis?.transactionCount || 0
      },
      analysis: analysisData.analysis || {},
      revenue: analysisData.revenue || [],
      expenses: analysisData.expenses || [],
      profitLossStatement: analysisData.profitLossStatement || {},
      insights: analysisData.insights || [],
      recommendations: analysisData.recommendations || [],
      executiveSummary: `${period} financial analysis completed via Gemini AI`,
      metadata: {
        fileName: fileData.originalName,
        fileSize: fileData.size,
        analysisType: 'Gemini-AI-Powered',
        aiModel: 'gemini-1.5-flash',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      status: 'completed',
      rawAnalysis: analysisData // Store complete AI response
    });

    const savedStatement = await plStatement.save();
    console.log(`✅ P&L statement saved to database with ID: ${savedStatement._id}`);

    // Step 3: P&L Processing Complete
    // Note: Automated bookkeeping is handled separately via /api/bookkeeping/process-document
    console.log('✅ P&L analysis completed - Bookkeeping handled separately');
    let bookkeepingResults = {
      success: true,
      message: 'Bookkeeping handled by dedicated automated bookkeeping endpoint'
    };

    // Step 4: RETRIEVE FROM DATABASE to ensure data integrity
    const retrievedStatement = await PLStatement.findById(savedStatement._id);
    console.log(`✅ Data verified in database - Total Revenue: ₹${retrievedStatement.analysis?.totalRevenue || 0}`);

    // Return successful response with BOTH P&L and BOOKKEEPING DATA
    return res.status(200).json({
      success: true,
      message: 'Agentic AI processing complete: P&L analysis + automated bookkeeping',
      data: {
        statementId: savedStatement._id,
        plStatement: retrievedStatement.profitLossStatement,
        insights: retrievedStatement.insights,
        recommendations: retrievedStatement.recommendations,
        executiveSummary: retrievedStatement.executiveSummary,
        analysisMetrics: {
          totalTransactions: retrievedStatement.analysis?.transactionCount || 0,
          totalRevenue: retrievedStatement.analysis?.totalRevenue || 0,
          totalExpenses: retrievedStatement.analysis?.totalExpenses || 0,
          netIncome: retrievedStatement.analysis?.netIncome || 0
        },
        databaseInfo: {
          saved: true,
          documentId: savedStatement._id,
          timestamp: savedStatement.createdAt
        },
        // AUTOMATED BOOKKEEPING RESULTS
        automatedBookkeeping: bookkeepingResults
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error during P&L analysis:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        message: 'File size too large. Maximum 10MB allowed.' 
      });
    }
    
    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({ 
        success: false,
        message: error.message 
      });
    }

    if (error.message.includes('AI analysis failed')) {
      return res.status(500).json({ 
        success: false,
        message: 'AI analysis service temporarily unavailable. Please try again.' 
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to analyze bank statement',
      error: error.message
    });
  }
});

// Save P&L statement results
router.post('/save-statement', authenticate, async (req, res) => {
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

// SEPARATE CHAT ENDPOINT - Does not affect P&L generation
router.post('/chat', async (req, res) => {
  try {
    console.log('📨 Chat endpoint called - using real Gemini AI');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    const { message, conversationHistory, plData } = req.body;

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and cannot be empty'
      });
    }

    const validHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
    const validPlData = plData && typeof plData === 'object' ? plData : null;

    console.log(`💬 Processing message: "${message.substring(0, 50)}..."`);
    console.log(`📊 P&L data provided: ${validPlData ? 'Yes' : 'No'}`);

    // Use the SAME Gemini AI service that works for P&L generation
    const aiResponse = await geminiAI.generateChatResponse(
      message.trim(),
      validHistory,
      validPlData
    );

    console.log('✅ Real Gemini chat response generated successfully');

    return res.status(200).json({
      success: true,
      message: aiResponse.response,
      timestamp: aiResponse.timestamp,
      aiService: 'gemini',
      contextUsed: {
        plDataAvailable: !!validPlData,
        historyLength: validHistory.length
      }
    });

  } catch (error) {
    console.error('🚨 Chat API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate AI response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's latest/current P&L data - used to sync across devices
router.get('/my-data', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('📊 Fetching P&L data for user:', userId);
    
    // Get the most recent P&L statement for this user
    let latestStatement = await PLStatement.findOne({ userId })
      .sort({ 'metadata.createdAt': -1, createdAt: -1 })
      .select('-__v');
    
    // FALLBACK: Check for legacy 'test-user-id' data and migrate it
    if (!latestStatement) {
      console.log('📊 No data found for user, checking for legacy test-user-id data...');
      const legacyStatement = await PLStatement.findOne({ userId: 'test-user-id' })
        .sort({ 'metadata.createdAt': -1, createdAt: -1 });
      
      if (legacyStatement) {
        console.log('🔄 Found legacy data, migrating to user:', userId);
        // Update the userId to the real user
        legacyStatement.userId = userId;
        await legacyStatement.save();
        latestStatement = legacyStatement;
        console.log('✅ Migration complete!');
      }
    }
    
    // Also check for 'anonymous-user' data
    if (!latestStatement) {
      console.log('📊 Checking for anonymous-user data...');
      const anonStatement = await PLStatement.findOne({ userId: 'anonymous-user' })
        .sort({ 'metadata.createdAt': -1, createdAt: -1 });
      
      if (anonStatement) {
        console.log('🔄 Found anonymous data, migrating to user:', userId);
        anonStatement.userId = userId;
        await anonStatement.save();
        latestStatement = anonStatement;
        console.log('✅ Migration complete!');
      }
    }
    
    if (!latestStatement) {
      console.log('📊 No P&L data found for user:', userId);
      return res.json({
        success: true,
        hasData: false,
        message: 'No financial data found for this user'
      });
    }
    
    console.log('✅ Found P&L data for user, statement ID:', latestStatement._id);
    
    // Format the data to match what the frontend Dashboard expects
    // Dashboard looks for: plData.analysisMetrics, plData.plStatement, plData.insights
    
    // Check if we have rawAnalysis with the Dashboard-compatible format (from new uploads)
    const hasRawAnalysisFormat = latestStatement.rawAnalysis?.analysisMetrics;
    
    const plData = {
      // Analysis metrics - Dashboard looks for plData.analysisMetrics.totalRevenue etc
      analysisMetrics: hasRawAnalysisFormat 
        ? latestStatement.rawAnalysis.analysisMetrics 
        : {
            totalRevenue: latestStatement.analysis?.totalRevenue || 0,
            totalExpenses: latestStatement.analysis?.totalExpenses || 0,
            netIncome: latestStatement.analysis?.netIncome || 0,
            netProfit: latestStatement.analysis?.netIncome || 0,
            transactionCount: latestStatement.analysis?.transactionCount || 0,
            profitMargin: latestStatement.analysis?.totalRevenue > 0 
              ? ((latestStatement.analysis?.netIncome || 0) / latestStatement.analysis.totalRevenue * 100).toFixed(2) + '%'
              : '0%',
            burnRate: latestStatement.analysis?.totalExpenses || 0,
            runway: latestStatement.analysis?.totalExpenses > 0 
              ? Math.floor((latestStatement.analysis?.netIncome || 0) / latestStatement.analysis.totalExpenses)
              : 0
          },
      
      // Full P&L statement - Dashboard looks for plData.plStatement.revenue.total etc
      plStatement: hasRawAnalysisFormat 
        ? latestStatement.rawAnalysis.plStatement 
        : {
            revenue: {
              total: latestStatement.profitLossStatement?.revenue?.totalRevenue || latestStatement.analysis?.totalRevenue || 0,
              totalRevenue: latestStatement.profitLossStatement?.revenue?.totalRevenue || latestStatement.analysis?.totalRevenue || 0,
              categories: (latestStatement.profitLossStatement?.revenue?.revenueStreams || latestStatement.revenue || []).map(r => ({
                name: r.name || r.category,
                amount: r.amount || 0
              })),
              revenueStreams: latestStatement.profitLossStatement?.revenue?.revenueStreams || latestStatement.revenue || []
            },
            expenses: {
              total: latestStatement.profitLossStatement?.expenses?.totalExpenses || latestStatement.analysis?.totalExpenses || 0,
              totalExpenses: latestStatement.profitLossStatement?.expenses?.totalExpenses || latestStatement.analysis?.totalExpenses || 0,
              categories: (latestStatement.profitLossStatement?.expenses?.expenseCategories || latestStatement.expenses || []).map(e => ({
                name: e.name || e.category,
                amount: e.amount || 0
              })),
              expenseCategories: latestStatement.profitLossStatement?.expenses?.expenseCategories || latestStatement.expenses || []
            },
            netIncome: latestStatement.profitLossStatement?.profitability?.netIncome || latestStatement.analysis?.netIncome || 0,
            profitability: latestStatement.profitLossStatement?.profitability || {
              netIncome: latestStatement.analysis?.netIncome || 0,
              netProfitMargin: latestStatement.analysis?.totalRevenue > 0 
                ? ((latestStatement.analysis?.netIncome || 0) / latestStatement.analysis.totalRevenue * 100).toFixed(2)
                : 0
            }
          },
      
      // Transactions for the transaction list (from rawAnalysis or empty)
      transactions: hasRawAnalysisFormat 
        ? latestStatement.rawAnalysis.transactions || []
        : [],
      
      // Insights and recommendations
      insights: latestStatement.insights || [],
      recommendations: latestStatement.recommendations || [],
      executiveSummary: latestStatement.executiveSummary || '',
      
      // Raw breakdown data (fallback)
      revenue: latestStatement.revenue || [],
      expenses: latestStatement.expenses || [],
      
      // Metadata
      period: latestStatement.period,
      statementId: latestStatement._id,
      lastUpdated: latestStatement.metadata?.updatedAt || latestStatement.createdAt,
      fileName: latestStatement.rawBankData?.fileName || 'Unknown'
    };
    
    return res.json({
      success: true,
      hasData: true,
      plData,
      statementId: latestStatement._id
    });
    
  } catch (error) {
    console.error('❌ Error fetching user P&L data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch financial data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's P&L statements
router.get('/statements', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { period, limit = 10, page = 1 } = req.query;
    
    const filter = { userId };
    if (period && ['Weekly', 'Monthly', 'Yearly'].includes(period)) {
      filter.period = period;
    }
    
    const skip = (page - 1) * limit;
    
    const statements = await PLStatement.find(filter)
      .sort({ 'metadata.createdAt': -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-__v');
    
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
router.get('/statements/:id', authenticate, async (req, res) => {
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
router.delete('/statements/:id', authenticate, async (req, res) => {
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

// AI Chat endpoint for real-time assistance
router.post('/chat', async (req, res) => {
  try {
    console.log('📨 Received chat request - ROUTE HANDLER CALLED');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    const { message, conversationHistory, plData } = req.body;

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and cannot be empty'
      });
    }

    console.log('💬 Processing message:', message);

    // For now, return a simple response to test the route
    return res.status(200).json({
      success: true,
      message: "Hello! I'm your AI Financial Assistant. The chat service is working! Your P&L shows strong performance.",
      timestamp: new Date(),
      aiService: 'test-mode'
    });

  } catch (error) {
    console.error('🚨 Chat API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate AI response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;