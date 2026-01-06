const express = require('express');
const router = express.Router();
const groqAI = require('../utils/groqAI');
const PLStatement = require('../models/PLStatement');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');

/**
 * Helper: Extract user ID from token (optional auth)
 */
const getUserIdFromToken = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id || decoded.userId;
  } catch {
    return null;
  }
};

/**
 * Build comprehensive user financial context
 */
const buildUserFinancialContext = async (userId) => {
  if (!userId) return null;
  
  try {
    const plStatement = await PLStatement.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();
    
    if (!plStatement) return null;

    // Extract all revenue data
    const revenueItems = plStatement.profitLossStatement?.revenue?.items || 
                         plStatement.revenue || [];
    const expenseItems = plStatement.profitLossStatement?.expenses?.items || 
                         plStatement.expenses || [];

    const totalRevenue = plStatement.analysis?.totalRevenue ||
                         plStatement.profitLossStatement?.revenue?.totalRevenue || 0;
    const totalExpenses = plStatement.analysis?.totalExpenses ||
                          plStatement.profitLossStatement?.expenses?.totalExpenses || 0;
    const netIncome = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(2) : 0;

    // Build detailed revenue breakdown
    const revenueBreakdown = revenueItems.map(item => ({
      category: item.category || 'Uncategorized',
      amount: item.amount || item.total || 0,
      count: item.transactions?.length || item.count || 0,
      percentage: totalRevenue > 0 ? (((item.amount || item.total || 0) / totalRevenue) * 100).toFixed(1) : 0
    })).sort((a, b) => b.amount - a.amount);

    // Build detailed expense breakdown
    const expenseBreakdown = expenseItems.map(item => ({
      category: item.category || 'Uncategorized',
      amount: item.amount || item.total || 0,
      count: item.transactions?.length || item.count || 0,
      percentage: totalExpenses > 0 ? (((item.amount || item.total || 0) / totalExpenses) * 100).toFixed(1) : 0
    })).sort((a, b) => b.amount - a.amount);

    return {
      period: plStatement.period || 'Monthly',
      statementDate: plStatement.createdAt,
      summary: {
        totalRevenue,
        totalExpenses,
        netIncome,
        profitMargin: parseFloat(profitMargin),
        isProfit: netIncome >= 0,
        transactionCount: plStatement.analysis?.transactionCount || 
                          (revenueItems.reduce((sum, r) => sum + (r.transactions?.length || 0), 0) +
                           expenseItems.reduce((sum, e) => sum + (e.transactions?.length || 0), 0))
      },
      revenueBreakdown,
      expenseBreakdown,
      topRevenueCategory: revenueBreakdown[0] || null,
      topExpenseCategory: expenseBreakdown[0] || null,
      insights: {
        highestExpenseRatio: expenseBreakdown[0] ? parseFloat(expenseBreakdown[0].percentage) : 0,
        revenueConcentration: revenueBreakdown[0] ? parseFloat(revenueBreakdown[0].percentage) : 0,
        expenseCategories: expenseBreakdown.length,
        revenueCategories: revenueBreakdown.length
      }
    };
  } catch (error) {
    console.error('Error building financial context:', error);
    return null;
  }
};

// POST /api/chat - Handle chat messages with Groq AI
router.post('/', async (req, res) => {
  try {
    console.log('🚀 Received chat request for Groq AI');
    
    const { message, conversationHistory, plData } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and cannot be empty'
      });
    }

    // Get user ID from token if available
    const userId = getUserIdFromToken(req);
    console.log('👤 User ID from token:', userId || 'Not authenticated');

    // Fetch user-specific P&L data
    let userFinancialData = await buildUserFinancialContext(userId);
    
    if (!userFinancialData && plData) {
      // Fallback to frontend-provided data
      userFinancialData = plData;
    }

    console.log('📊 Financial context available:', !!userFinancialData);

    const aiResponse = await groqAI.generateChatResponse(
      message.trim(),
      conversationHistory || [],
      userFinancialData
    );

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
      error: 'Failed to generate AI response'
    });
  }
});

// GET /api/chat/health - Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Daddy AI chat service is operational',
    service: 'groq',
    timestamp: new Date().toISOString()
  });
});

// POST /api/chat/message - Chatbot widget endpoint
router.post('/message', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Get user ID from token
    const userId = getUserIdFromToken(req);
    
    // Build comprehensive financial context
    const userFinancialData = await buildUserFinancialContext(userId);

    const aiResponse = await groqAI.generateChatResponse(
      message.trim(),
      conversationHistory || [],
      userFinancialData
    );

    return res.status(200).json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chatbot error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
});

module.exports = router;