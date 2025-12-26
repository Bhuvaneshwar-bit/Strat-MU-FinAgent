const express = require('express');
const router = express.Router();
const PLStatement = require('../models/PLStatement');
const auth = require('../middleware/auth');

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

    if (!plStatement) {
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

    // Extract metrics
    const totalRevenue = plStatement.analysisMetrics?.totalRevenue || 
                         plStatement.plStatement?.revenue?.totalRevenue || 0;
    const totalExpenses = plStatement.analysisMetrics?.totalExpenses || 
                          plStatement.plStatement?.expenses?.totalExpenses || 0;
    const netIncome = plStatement.analysisMetrics?.netIncome || 
                      (totalRevenue - totalExpenses);
    const profitMargin = plStatement.analysisMetrics?.profitMargin || 
                         (totalRevenue > 0 ? ((netIncome / totalRevenue) * 100) : 0);

    // Calculate monthly metrics (assuming data is for one month)
    const monthlyRevenue = totalRevenue;
    const monthlyBurn = totalExpenses;

    // Calculate runway (months of operation with current burn rate)
    // Assuming available cash/investment - this can be customized
    const availableCash = netIncome > 0 ? netIncome * 12 : totalRevenue * 0.2; // Estimate
    const runway = monthlyBurn > 0 ? Math.round(availableCash / monthlyBurn) : 0;

    // Determine status
    const status = netIncome > 0 ? 'Profitable' : 'Burning';

    // Revenue growth (compare with previous statement if available)
    let revenueGrowth = 0;
    const previousStatement = await PLStatement.findOne({ 
      userId,
      createdAt: { $lt: plStatement.createdAt }
    }).sort({ createdAt: -1 }).lean();

    if (previousStatement) {
      const prevRevenue = previousStatement.analysisMetrics?.totalRevenue || 
                          previousStatement.plStatement?.revenue?.totalRevenue || 0;
      if (prevRevenue > 0) {
        revenueGrowth = ((totalRevenue - prevRevenue) / prevRevenue) * 100;
      }
    }

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        totalInvestment: availableCash, // Can be updated with actual investment data
        monthlyRevenue,
        monthlyBurn,
        netIncome,
        profitMargin: parseFloat(profitMargin.toFixed(1)),
        runway,
        status,
        revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
        lastUpdated: plStatement.createdAt,
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
 * @route   GET /api/stats/summary/public/:userId
 * @desc    Get financial summary stats (for internal service-to-service calls)
 * @access  Internal (use API key in production)
 */
router.get('/summary/public/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const apiKey = req.headers['x-api-key'];

    // Simple API key validation (set this in your .env)
    const validApiKey = process.env.INTERNAL_API_KEY || 'nebulaa-internal-key';
    if (apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    const plStatement = await PLStatement.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    if (!plStatement) {
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

    const totalRevenue = plStatement.analysisMetrics?.totalRevenue || 
                         plStatement.plStatement?.revenue?.totalRevenue || 0;
    const totalExpenses = plStatement.analysisMetrics?.totalExpenses || 
                          plStatement.plStatement?.expenses?.totalExpenses || 0;
    const netIncome = totalRevenue - totalExpenses;
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
        profitMargin: totalRevenue > 0 ? parseFloat(((netIncome / totalRevenue) * 100).toFixed(1)) : 0,
        runway,
        status: netIncome > 0 ? 'Profitable' : 'Burning',
        revenueGrowth: 0,
        lastUpdated: plStatement.createdAt
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
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
