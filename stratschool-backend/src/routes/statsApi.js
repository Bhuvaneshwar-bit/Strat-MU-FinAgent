const express = require('express');
const router = express.Router();
const PLStatement = require('../models/PLStatement');
const User = require('../models/User');
const auth = require('../middleware/auth');

/**
 * Helper function to extract metrics from PLStatement
 * Checks ALL possible field locations in the schema
 */
const extractMetrics = (plStatement) => {
  if (!plStatement) return null;

  // Check multiple possible locations for revenue (schema has different structures)
  const totalRevenue = 
    plStatement.analysis?.totalRevenue ||                           // Direct analysis object
    plStatement.profitLossStatement?.revenue?.totalRevenue ||       // Nested in profitLossStatement
    plStatement.analysisMetrics?.totalRevenue ||                    // Legacy field
    plStatement.plStatement?.revenue?.totalRevenue ||               // Another legacy format
    0;

  // Check multiple possible locations for expenses
  const totalExpenses = 
    plStatement.analysis?.totalExpenses ||
    plStatement.profitLossStatement?.expenses?.totalExpenses ||
    plStatement.analysisMetrics?.totalExpenses ||
    plStatement.plStatement?.expenses?.totalExpenses ||
    0;

  // Net income
  const netIncome = 
    plStatement.analysis?.netIncome ||
    plStatement.profitLossStatement?.profitability?.netIncome ||
    plStatement.analysisMetrics?.netIncome ||
    (totalRevenue - totalExpenses);

  // Profit margin
  const profitMargin = 
    plStatement.profitLossStatement?.profitability?.profitMargin ||
    plStatement.profitLossStatement?.profitability?.netProfitMargin ||
    plStatement.analysisMetrics?.profitMargin ||
    (totalRevenue > 0 ? ((netIncome / totalRevenue) * 100) : 0);

  // Transaction count
  const transactionCount = 
    plStatement.analysis?.transactionCount ||
    plStatement.rawBankData?.transactionCount ||
    0;

  return {
    totalRevenue,
    totalExpenses,
    netIncome,
    profitMargin,
    transactionCount,
    lastUpdated: plStatement.createdAt || plStatement.updatedAt
  };
};

/**
 * @route   GET /api/stats/summary
 * @desc    Get financial summary stats for Singularity dashboard
 * @access  Private (requires auth token)
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get the latest P&L statement for the user
    const plStatement = await PLStatement.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    const metrics = extractMetrics(plStatement);

    if (!metrics) {
      return res.json({
        success: true,
        data: {
          totalRevenue: 0,
          totalExpenses: 0,
          totalInvestment: 0,
          monthlyRevenue: 0,
          monthlyBurn: 0,
          netIncome: 0,
          profitMargin: 0,
          runway: 0,
          status: 'No Data',
          revenueGrowth: 0,
          lastUpdated: null
        }
      });
    }

    const { totalRevenue, totalExpenses, netIncome, profitMargin } = metrics;

    // Calculate monthly metrics
    const monthlyRevenue = totalRevenue;
    const monthlyBurn = totalExpenses;

    // Calculate runway
    const availableCash = netIncome > 0 ? netIncome * 12 : totalRevenue * 0.2;
    const runway = monthlyBurn > 0 ? Math.round(availableCash / monthlyBurn) : 0;

    // Determine status
    const status = netIncome > 0 ? 'Profitable' : 'Burning';

    // Revenue growth (compare with previous statement)
    let revenueGrowth = 0;
    const previousStatement = await PLStatement.findOne({ 
      userId,
      createdAt: { $lt: plStatement.createdAt }
    }).sort({ createdAt: -1 }).lean();

    if (previousStatement) {
      const prevMetrics = extractMetrics(previousStatement);
      if (prevMetrics && prevMetrics.totalRevenue > 0) {
        revenueGrowth = ((totalRevenue - prevMetrics.totalRevenue) / prevMetrics.totalRevenue) * 100;
      }
    }

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        totalInvestment: availableCash,
        monthlyRevenue,
        monthlyBurn,
        netIncome,
        profitMargin: parseFloat(profitMargin.toFixed(1)),
        runway,
        status,
        revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
        lastUpdated: metrics.lastUpdated,
        statementId: plStatement._id
      }
    });

  } catch (error) {
    console.error('Stats API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/stats/summary/public/:identifier
 * @desc    Get financial summary stats (for internal service-to-service calls)
 * @desc    Supports both userId (ObjectId) and email as identifier
 * @access  Internal (use API key in production)
 */
router.get('/summary/public/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const apiKey = req.headers['x-api-key'];

    // Simple API key validation
    const validApiKey = process.env.INTERNAL_API_KEY || 'nebulaa-internal-key';
    if (apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    let userId = identifier;

    // Check if identifier is an email (contains @)
    if (identifier.includes('@')) {
      // Lookup user by email to get their _id
      const user = await User.findOne({ email: identifier.toLowerCase() }).lean();
      if (!user) {
        return res.json({
          success: true,
          data: {
            totalRevenue: 0,
            totalExpenses: 0,
            monthlyRevenue: 0,
            monthlyBurn: 0,
            runway: 0,
            status: 'No Data',
            revenueGrowth: 0,
            message: 'User not found with this email'
          }
        });
      }
      userId = user._id.toString();
    }

    // Find P&L statement by userId
    const plStatement = await PLStatement.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    const metrics = extractMetrics(plStatement);

    if (!metrics) {
      return res.json({
        success: true,
        data: {
          totalRevenue: 0,
          totalExpenses: 0,
          monthlyRevenue: 0,
          monthlyBurn: 0,
          runway: 0,
          status: 'No Data',
          revenueGrowth: 0
        }
      });
    }

    const { totalRevenue, totalExpenses, netIncome, profitMargin } = metrics;
    const monthlyBurn = totalExpenses;
    const availableCash = netIncome > 0 ? netIncome * 12 : totalRevenue * 0.2;
    const runway = monthlyBurn > 0 ? Math.round(availableCash / monthlyBurn) : 0;

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        totalInvestment: availableCash,
        monthlyRevenue: totalRevenue,
        monthlyBurn,
        netIncome,
        profitMargin: parseFloat(profitMargin.toFixed(1)),
        runway,
        status: netIncome > 0 ? 'Profitable' : 'Burning',
        revenueGrowth: 0,
        lastUpdated: metrics.lastUpdated
      }
    });

  } catch (error) {
    console.error('Public Stats API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats'
    });
  }
});

/**
 * @route   GET /api/stats/health
 * @desc    Health check for the stats API
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'InFINity Stats API',
    version: '1.1.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
