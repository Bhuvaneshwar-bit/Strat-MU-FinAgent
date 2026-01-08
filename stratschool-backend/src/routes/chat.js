const express = require('express');
const router = express.Router();
const groqAI = require('../utils/groqAI');
const stockMarketAPI = require('../utils/stockMarketAPI');
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

    // Aggregate transactions by category
    let revenueByCategory = {};
    let expenseByCategory = {};

    // Process revenue - drill into transactions array inside each item
    if (plStatement.revenue && plStatement.revenue.length > 0) {
      plStatement.revenue.forEach(item => {
        // Check if item has transactions array (nested structure)
        if (item.transactions && item.transactions.length > 0) {
          item.transactions.forEach(txn => {
            const catName = txn.category?.category || txn.category || 'Other Income';
            const amount = Math.abs(txn.amount || 0);
            if (!revenueByCategory[catName]) {
              revenueByCategory[catName] = 0;
            }
            revenueByCategory[catName] += amount;
          });
        } else {
          // Flat structure - item itself is a transaction
          const catName = item.category?.category || (typeof item.category === 'string' ? item.category : 'Other Income');
          const amount = Math.abs(item.amount || 0);
          if (!revenueByCategory[catName]) {
            revenueByCategory[catName] = 0;
          }
          revenueByCategory[catName] += amount;
        }
      });
    }

    // Process expenses - drill into transactions array inside each item
    if (plStatement.expenses && plStatement.expenses.length > 0) {
      plStatement.expenses.forEach(item => {
        // Check if item has transactions array (nested structure)
        if (item.transactions && item.transactions.length > 0) {
          item.transactions.forEach(txn => {
            const catName = txn.category?.category || txn.category || 'General Expenses';
            const amount = Math.abs(txn.amount || 0);
            if (!expenseByCategory[catName]) {
              expenseByCategory[catName] = 0;
            }
            expenseByCategory[catName] += amount;
          });
        } else {
          // Flat structure - item itself is a transaction
          const catName = item.category?.category || (typeof item.category === 'string' ? item.category : 'General Expenses');
          const amount = Math.abs(item.amount || 0);
          if (!expenseByCategory[catName]) {
            expenseByCategory[catName] = 0;
          }
          expenseByCategory[catName] += amount;
        }
      });
    }

    // Convert to arrays and calculate percentages
    const revenueBreakdown = Object.entries(revenueByCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalRevenue > 0 ? ((amount / totalRevenue) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const expenseBreakdown = Object.entries(expenseByCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    console.log('📊 Revenue categories:', revenueBreakdown.map(r => `${r.category}: ₹${r.amount.toLocaleString('en-IN')} (${r.percentage}%)`));
    console.log('📊 Expense categories:', expenseBreakdown.map(e => `${e.category}: ₹${e.amount.toLocaleString('en-IN')} (${e.percentage}%)`));

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

    // Check if message is about stocks/investments and fetch real-time data
    let stockContext = null;
    if (stockMarketAPI.isStockQuery(message)) {
      console.log('📈 Stock query detected, fetching real-time data...');
      stockContext = await stockMarketAPI.getInvestmentContext(message);
      if (stockContext) {
        console.log('✅ Stock data fetched for:', stockContext.stocks.map(s => s.symbol).join(', '));
      }
    }

    const aiResponse = await groqAI.generateChatResponse(
      message.trim(),
      conversationHistory || [],
      userFinancialData,
      stockContext
    );

    return res.status(200).json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString(),
      service: 'groq',
      stockData: stockContext?.stocks || null
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

    // Check if message is about stocks/investments and fetch real-time data
    let stockContext = null;
    if (stockMarketAPI.isStockQuery(message)) {
      console.log('📈 Stock query detected in widget, fetching real-time data...');
      stockContext = await stockMarketAPI.getInvestmentContext(message);
      if (stockContext) {
        console.log('✅ Stock data fetched for:', stockContext.stocks.map(s => s.symbol).join(', '));
      }
    }

    const aiResponse = await groqAI.generateChatResponse(
      message.trim(),
      conversationHistory || [],
      userFinancialData,
      stockContext
    );

    return res.status(200).json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString(),
      stockData: stockContext?.stocks || null
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