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

    // Get total amounts
    const totalRevenue = plStatement.analysis?.totalRevenue ||
                         plStatement.profitLossStatement?.revenue?.totalRevenue || 0;
    const totalExpenses = plStatement.analysis?.totalExpenses ||
                          plStatement.profitLossStatement?.expenses?.totalExpenses || 0;
    const netIncome = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(2) : 0;

    // Extract revenue breakdown from multiple possible sources
    let revenueBreakdown = [];
    
    // Source 1: revenue array (main source)
    if (plStatement.revenue && plStatement.revenue.length > 0) {
      revenueBreakdown = plStatement.revenue.map(item => ({
        category: item.category || 'Uncategorized',
        amount: item.amount || 0,
        count: item.transactions?.length || 0,
        percentage: totalRevenue > 0 ? (((item.amount || 0) / totalRevenue) * 100).toFixed(1) : 0
      }));
    }
    // Source 2: profitLossStatement.revenue.revenueStreams
    else if (plStatement.profitLossStatement?.revenue?.revenueStreams?.length > 0) {
      revenueBreakdown = plStatement.profitLossStatement.revenue.revenueStreams.map(item => ({
        category: item.category || item.name || 'Uncategorized',
        amount: item.amount || 0,
        count: 0,
        percentage: totalRevenue > 0 ? (((item.amount || 0) / totalRevenue) * 100).toFixed(1) : 0
      }));
    }
    // Source 3: profitLossStatement.revenue.breakdown (object)
    else if (plStatement.profitLossStatement?.revenue?.breakdown) {
      const breakdown = plStatement.profitLossStatement.revenue.breakdown;
      revenueBreakdown = Object.entries(breakdown).map(([category, amount]) => ({
        category,
        amount: typeof amount === 'number' ? amount : amount?.amount || 0,
        count: 0,
        percentage: totalRevenue > 0 ? (((typeof amount === 'number' ? amount : amount?.amount || 0) / totalRevenue) * 100).toFixed(1) : 0
      }));
    }

    // Extract expense breakdown from multiple possible sources
    let expenseBreakdown = [];
    
    // Source 1: expenses array (main source)
    if (plStatement.expenses && plStatement.expenses.length > 0) {
      expenseBreakdown = plStatement.expenses.map(item => ({
        category: item.category || 'Uncategorized',
        amount: item.amount || 0,
        count: item.transactions?.length || 0,
        percentage: totalExpenses > 0 ? (((item.amount || 0) / totalExpenses) * 100).toFixed(1) : 0
      }));
    }
    // Source 2: profitLossStatement.expenses.expenseCategories
    else if (plStatement.profitLossStatement?.expenses?.expenseCategories?.length > 0) {
      expenseBreakdown = plStatement.profitLossStatement.expenses.expenseCategories.map(item => ({
        category: item.category || item.name || 'Uncategorized',
        amount: item.amount || 0,
        count: 0,
        percentage: totalExpenses > 0 ? (((item.amount || 0) / totalExpenses) * 100).toFixed(1) : 0
      }));
    }
    // Source 3: profitLossStatement.expenses.breakdown (object)
    else if (plStatement.profitLossStatement?.expenses?.breakdown) {
      const breakdown = plStatement.profitLossStatement.expenses.breakdown;
      expenseBreakdown = Object.entries(breakdown).map(([category, amount]) => ({
        category,
        amount: typeof amount === 'number' ? amount : amount?.amount || 0,
        count: 0,
        percentage: totalExpenses > 0 ? (((typeof amount === 'number' ? amount : amount?.amount || 0) / totalExpenses) * 100).toFixed(1) : 0
      }));
    }

    // Sort by amount descending
    revenueBreakdown.sort((a, b) => b.amount - a.amount);
    expenseBreakdown.sort((a, b) => b.amount - a.amount);

    console.log('📊 Revenue categories found:', revenueBreakdown.length, revenueBreakdown.map(r => `${r.category}: ₹${r.amount}`));
    console.log('📊 Expense categories found:', expenseBreakdown.length, expenseBreakdown.map(e => `${e.category}: ₹${e.amount}`));

    return {
      period: plStatement.period || 'Monthly',
      statementDate: plStatement.createdAt,
      summary: {
        totalRevenue,
        totalExpenses,
        netIncome,
        profitMargin: parseFloat(profitMargin),
        isProfit: netIncome >= 0,
        transactionCount: plStatement.analysis?.transactionCount || 0
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