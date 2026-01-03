const express = require('express');
const router = express.Router();
const PLStatement = require('../models/PLStatement');
const User = require('../models/User');
const auth = require('../middleware/auth');

/**
 * Keywords that indicate recurring expenses (same as Dashboard)
 */
const RECURRING_KEYWORDS = [
  'subscription', 'monthly', 'rent', 'salary', 'wages', 'insurance', 'emi', 'loan',
  'internet', 'phone', 'utility', 'electric', 'water', 'gas', 'netflix', 'spotify',
  'amazon prime', 'swiggy', 'zomato', 'uber', 'ola', 'gym', 'membership', 'premium',
  'recurring', 'auto-debit', 'standing instruction', 'si ', 'nach', 'autopay'
];

/**
 * Parse date string to Date object (same logic as Dashboard)
 */
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0]);
    const p1 = parseInt(parts[1]);
    const p2 = parseInt(parts[2]);
    if (p0 > 31 || parts[0].length === 4) {
      return new Date(p0, p1 - 1, p2);
    } else {
      const fullYear = p2 < 100 ? (p2 > 50 ? 1900 + p2 : 2000 + p2) : p2;
      return new Date(fullYear, p1 - 1, p0);
    }
  }
  return new Date(dateStr);
};

/**
 * Calculate months of data from transactions (same as Dashboard)
 */
const calculateMonthsOfData = (transactions) => {
  if (!transactions || transactions.length === 0) return 1;
  
  const dates = transactions
    .map(t => parseDate(t.date))
    .filter(d => d && !isNaN(d.getTime()))
    .sort((a, b) => a - b);
  
  if (dates.length >= 2) {
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const diffTime = Math.abs(lastDate - firstDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays / 30);
  }
  return 1;
};

/**
 * Classify expenses as recurring or non-recurring (same as Dashboard)
 */
const classifyExpenses = (debitTransactions) => {
  if (!debitTransactions || debitTransactions.length === 0) {
    return { recurringTotal: 0, nonRecurringTotal: 0 };
  }

  // Count vendor occurrences for recurring detection
  const vendorCount = new Map();
  debitTransactions.forEach(txn => {
    const description = (txn.description || txn.particulars || '').toLowerCase();
    const vendorKey = description.split('/').slice(0, 3).join('/').substring(0, 50);
    vendorCount.set(vendorKey, (vendorCount.get(vendorKey) || 0) + 1);
  });

  let recurringTotal = 0;
  let nonRecurringTotal = 0;

  debitTransactions.forEach(txn => {
    const description = (txn.description || txn.particulars || '').toLowerCase();
    const category = (txn.category?.category || '').toLowerCase();
    const vendorKey = description.split('/').slice(0, 3).join('/').substring(0, 50);
    const amount = Math.abs(txn.amount || 0);
    
    const hasRecurringKeyword = RECURRING_KEYWORDS.some(keyword => 
      description.includes(keyword) || category.includes(keyword)
    );
    const isRepeatedVendor = (vendorCount.get(vendorKey) || 0) >= 2;

    if (hasRecurringKeyword || isRepeatedVendor) {
      recurringTotal += amount;
    } else {
      nonRecurringTotal += amount;
    }
  });

  return { recurringTotal, nonRecurringTotal };
};

/**
 * Helper function to extract metrics from PLStatement
 * Uses SAME logic as Dashboard for accurate values
 */
const extractMetrics = (plStatement) => {
  if (!plStatement) return null;

  // Get transactions array
  const allTransactions = plStatement.transactions || [];
  const debitTransactions = allTransactions.filter(t => t.amount < 0 || t.category?.type === 'expenses');

  // Calculate months of data from transaction dates
  const monthsOfData = calculateMonthsOfData(allTransactions);

  // Check multiple possible locations for revenue (schema has different structures)
  const totalRevenue = 
    plStatement.analysisMetrics?.totalRevenue ||
    plStatement.plStatement?.revenue?.totalRevenue ||
    plStatement.analysis?.totalRevenue ||
    plStatement.profitLossStatement?.revenue?.totalRevenue ||
    0;

  // Check multiple possible locations for expenses
  const totalExpenses = 
    plStatement.analysisMetrics?.totalExpenses ||
    plStatement.plStatement?.expenses?.totalExpenses ||
    plStatement.analysis?.totalExpenses ||
    plStatement.profitLossStatement?.expenses?.totalExpenses ||
    0;

  // Classify expenses using transaction-level analysis (same as Dashboard)
  const { recurringTotal, nonRecurringTotal } = classifyExpenses(debitTransactions);

  // Calculate monthly metrics by dividing by actual months of data (same as Dashboard)
  const monthlyRevenue = totalRevenue / monthsOfData;
  const monthlyBurn = totalExpenses / monthsOfData;

  // Net income
  const netIncome = 
    plStatement.analysisMetrics?.netIncome ||
    plStatement.analysisMetrics?.netProfit ||
    plStatement.plStatement?.profitability?.netIncome ||
    plStatement.analysis?.netIncome ||
    (totalRevenue - totalExpenses);

  // Profit margin
  let profitMargin = 
    plStatement.plStatement?.profitability?.netProfitMargin ||
    plStatement.analysisMetrics?.profitMargin ||
    null;
  
  if (profitMargin === null && totalRevenue > 0) {
    profitMargin = (netIncome / totalRevenue) * 100;
  } else if (profitMargin === null) {
    profitMargin = 0;
  }

  // Cash available
  const cashAvailable = Math.max(0, totalRevenue - totalExpenses);

  // Runway = Cash Available / Monthly Burn Rate
  const runway = monthlyBurn > 0 ? cashAvailable / monthlyBurn : 0;

  // Transaction count
  const transactionCount = allTransactions.length || 
    plStatement.analysis?.transactionCount ||
    plStatement.rawBankData?.transactionCount ||
    0;

  return {
    totalRevenue,
    totalExpenses,
    monthlyRevenue,
    monthlyBurn,
    recurringExpenses: recurringTotal,
    nonRecurringExpenses: nonRecurringTotal,
    netIncome,
    profitMargin,
    cashAvailable,
    runway,
    monthsOfData,
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
          cashAvailable: 0,
          monthlyRevenue: 0,
          monthlyBurn: 0,
          recurringExpenses: 0,
          nonRecurringExpenses: 0,
          netIncome: 0,
          profitMargin: 0,
          runway: 0,
          status: 'No Data',
          revenueGrowth: 0,
          monthsOfData: 0,
          lastUpdated: null
        }
      });
    }

    // Determine status
    const status = metrics.netIncome > 0 ? 'Profitable' : 'Burning';

    // Revenue growth (compare with previous statement)
    let revenueGrowth = 0;
    const previousStatement = await PLStatement.findOne({ 
      userId,
      createdAt: { $lt: plStatement.createdAt }
    }).sort({ createdAt: -1 }).lean();

    if (previousStatement) {
      const prevMetrics = extractMetrics(previousStatement);
      if (prevMetrics && prevMetrics.totalRevenue > 0) {
        revenueGrowth = ((metrics.totalRevenue - prevMetrics.totalRevenue) / prevMetrics.totalRevenue) * 100;
      }
    }

    res.json({
      success: true,
      data: {
        totalRevenue: metrics.totalRevenue,
        totalExpenses: metrics.totalExpenses,
        cashAvailable: parseFloat(metrics.cashAvailable.toFixed(2)),
        monthlyRevenue: parseFloat(metrics.monthlyRevenue.toFixed(2)),
        monthlyBurn: parseFloat(metrics.monthlyBurn.toFixed(2)),
        recurringExpenses: parseFloat(metrics.recurringExpenses.toFixed(2)),
        nonRecurringExpenses: parseFloat(metrics.nonRecurringExpenses.toFixed(2)),
        netIncome: metrics.netIncome,
        profitMargin: parseFloat(metrics.profitMargin.toFixed(2)),
        runway: parseFloat(metrics.runway.toFixed(1)),
        status,
        revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
        monthsOfData: parseFloat(metrics.monthsOfData.toFixed(1)),
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
            cashAvailable: 0,
            monthlyRevenue: 0,
            monthlyBurn: 0,
            recurringExpenses: 0,
            nonRecurringExpenses: 0,
            runway: 0,
            status: 'No Data',
            revenueGrowth: 0,
            monthsOfData: 0,
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
          cashAvailable: 0,
          monthlyRevenue: 0,
          monthlyBurn: 0,
          recurringExpenses: 0,
          nonRecurringExpenses: 0,
          runway: 0,
          status: 'No Data',
          revenueGrowth: 0,
          monthsOfData: 0
        }
      });
    }

    // Determine status
    const status = metrics.netIncome > 0 ? 'Profitable' : 'Burning';

    res.json({
      success: true,
      data: {
        totalRevenue: metrics.totalRevenue,
        totalExpenses: metrics.totalExpenses,
        cashAvailable: parseFloat(metrics.cashAvailable.toFixed(2)),
        monthlyRevenue: parseFloat(metrics.monthlyRevenue.toFixed(2)),
        monthlyBurn: parseFloat(metrics.monthlyBurn.toFixed(2)),
        recurringExpenses: parseFloat(metrics.recurringExpenses.toFixed(2)),
        nonRecurringExpenses: parseFloat(metrics.nonRecurringExpenses.toFixed(2)),
        netIncome: metrics.netIncome,
        profitMargin: parseFloat(metrics.profitMargin.toFixed(2)),
        runway: parseFloat(metrics.runway.toFixed(1)),
        status,
        revenueGrowth: 0,
        monthsOfData: parseFloat(metrics.monthsOfData.toFixed(1)),
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
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;