const express = require('express');
const router = express.Router();
const groqAI = require('../utils/groqAI');
const PLStatement = require('../models/PLStatement');

// POST /api/chat - Handle chat messages with Groq AI
router.post('/', async (req, res) => {
  try {
    console.log('🚀 Received chat request for Groq AI');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    const { message, conversationHistory, plData } = req.body;

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and cannot be empty'
      });
    }

    console.log('💬 Processing message with Groq AI:', message);

    // Fetch detailed P&L data from MongoDB for AI context
    let enhancedPLData = plData;
    try {
      // Get the most recent P&L statement for enhanced context
      const latestPL = await PLStatement.findOne()
        .sort({ createdAt: -1 })
        .limit(1);

      if (latestPL) {
        console.log('📊 Found detailed P&L data from MongoDB');
        enhancedPLData = {
          // Basic P&L data from frontend
          ...(plData || {}),
          
          // Enhanced data from MongoDB
          period: latestPL.period,
          totalRevenue: latestPL.analysis?.totalRevenue || 0,
          totalExpenses: latestPL.analysis?.totalExpenses || 0,
          netIncome: latestPL.analysis?.netIncome || 0,
          transactionCount: latestPL.analysis?.transactionCount || 0,
          
          // Revenue breakdown with categories
          revenueBreakdown: latestPL.revenue?.map(rev => ({
            category: rev.category,
            amount: rev.amount,
            transactionCount: rev.transactions?.length || 0,
            sampleTransactions: rev.transactions?.slice(0, 3) // First 3 transactions as examples
          })) || [],
          
          // Expense breakdown with categories  
          expenseBreakdown: latestPL.expenses?.map(exp => ({
            category: exp.category,
            amount: exp.amount,
            transactionCount: exp.transactions?.length || 0,
            sampleTransactions: exp.transactions?.slice(0, 3) // First 3 transactions as examples
          })) || [],
          
          // Raw file info
          uploadedFile: latestPL.rawBankData ? {
            fileName: latestPL.rawBankData.fileName,
            uploadDate: latestPL.rawBankData.uploadDate,
            transactionCount: latestPL.rawBankData.transactionCount
          } : null,
          
          // Additional insights
          profitMargin: latestPL.analysis?.totalRevenue > 0 ? 
            ((latestPL.analysis.netIncome / latestPL.analysis.totalRevenue) * 100).toFixed(2) : 0,
          
          businessType: latestPL.businessProfile?.businessType || 'General Business',
          analysisDate: latestPL.createdAt
        };
        
        console.log('✅ Enhanced P&L data prepared for AI');
      } else {
        console.log('ℹ️ No P&L data found in MongoDB, using frontend data only');
      }
    } catch (dbError) {
      console.error('⚠️ Error fetching P&L data from MongoDB:', dbError.message);
      // Continue with frontend data only
    }

    // Generate AI response using Groq with enhanced P&L data
    const aiResponse = await groqAI.generateChatResponse(
      message.trim(),
      conversationHistory || [],
      enhancedPLData || null
    );

    console.log('✅ Groq AI response generated successfully');

    // Return successful response
    return res.status(200).json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString(),
      service: 'groq'
    });

  } catch (error) {
    console.error('❌ Chat endpoint error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate AI response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/chat/health - Health check for chat service
router.get('/health', (req, res) => {
  console.log('📨 Groq AI health check called');
  res.status(200).json({
    success: true,
    message: 'Groq AI chat service is operational',
    service: 'groq',
    model: 'llama-3.1-8b-instant',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;