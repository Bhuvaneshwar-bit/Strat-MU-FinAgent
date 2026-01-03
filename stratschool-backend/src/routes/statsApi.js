const express = require('express');
const router = express.Router();
const PLStatement = require('../models/PLStatement');
const User = require('../models/User');
const auth = require('../middleware/auth');

/**
 * Recurring expense categories (typically monthly/regular expenses)
 */
const RECURRING_EXPENSE_CATEGORIES = [
  'rent', 'salary', 'salaries', 'wages', 'utilities', 'electricity', 'water',
  'internet', 'phone', 'mobile', 'subscription', 'insurance', 'loan', 'emi',
  'maintenance', 'software', 'hosting', 'cloud', 'office', 'marketing',
  'advertising', 'payroll', 'staff', 'employee', 'membership', 'recurring',
  'monthly', 'regular', 'fixed', 'overhead', 'operational'
];

/**
 * Non-recurring expense categories (one-time/variable expenses)
 */
const NON_RECURRING_EXPENSE_CATEGORIES = [
  'equipment', 'furniture', 'asset', 'purchase', 'travel', 'one-time',
  'repair', 'legal', 'professional', 'consulting', 'training', 'event',
  'conference', 'miscellaneous', 'other', 'supplies', 'inventory',
  'variable', 'seasonal', 'project', 'capital'
];

/**
 * Helper function to classify expense as recurring or non-recurring
 */
const isRecurringExpense = (category) => {
  const lowerCategory = (category || '').toLowerCase();
  return RECURRING_EXPENSE_CATEGORIES.some(keyword => lowerCategory.includes(keyword));
};

/**
 * Helper function to extract metrics from PLStatement
 * Checks ALL possible field locations in the schema
 * Calculates proper monthly metrics and recurring/non-recurring expenses
 */
const extractMetrics = (plStatement) => {
  if (!plStatement) return null;

  // Get the period for monthly calculations
  const period = plStatement.period || plStatement.analysis?.period || 'Monthly';

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

  // Calculate recurring and non-recurring expenses from expense breakdown
  let recurringExpenses = 0;
  let nonRecurringExpenses = 0;

  // Check expenses array
  const expensesArray = plStatement.expenses || [];
  expensesArray.forEach(expense => {
    const amount = expense.amount || 0;
    if (isRecurringExpense(expense.category)) {
      recurringExpenses += amount;
    } else {
      nonRecurringExpenses += amount;
    }
  });

  // Also check profitLossStatement.expenses.expenseCategories
  const expenseCategories = plStatement.profitLossStatement?.expenses?.expenseCategories || [];
  expenseCategories.forEach(expense => {
    const amount = expense.amount || 0;
    if (isRecurringExpense(expense.category || expense.name)) {
      recurringExpenses += amount;
    } else {
      nonRecurringExpenses += amount;
    }
  });

  // If no categorized breakdown, estimate from total (70% recurring, 30% non-recurring typical split)
  if (recurringExpenses === 0 && nonRecurringExpenses === 0 && totalExpenses > 0) {
    recurringExpenses = totalExpenses * 0.7;
    nonRecurringExpenses = totalExpenses * 0.3;
  }

  // Calculate monthly metrics based on period
  let monthlyRevenue = totalRevenue;
  let monthlyBurn = totalExpenses;
  let monthlyRecurring = recurringExpenses;
  let monthlyNonRecurring = nonRecurringExpenses;

  if (period === 'Yearly' || period === 'yearly') {
    monthlyRevenue = totalRevenue / 12;
    monthlyBurn = totalExpenses / 12;
    monthlyRecurring = recurringExpenses / 12;
    monthlyNonRecurring = nonRecurringExpenses / 12;
  } else if (period === 'Weekly' || period === 'weekly') {
    monthlyRevenue = totalRevenue * 4.33; // ~4.33 weeks per month
    monthlyBurn = totalExpenses * 4.33;
    monthlyRecurring = recurringExpenses * 4.33;
    monthlyNonRecurring = nonRecurringExpenses * 4.33;
  }
  // For 'Monthly' period, values stay as-is

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
    monthlyRevenue,
    monthlyBurn,
    recurringExpenses,
    nonRecurringExpenses,
    monthlyRecurring,
    monthlyNonRecurring,
    netIncome,
    profitMargin,
    transactionCount,
    period,
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
          recurringExpenses: 0,
          nonRecurringExpenses: 0,
          netIncome: 0,
          profitMargin: 0,
          runway: 0,
          status: 'No Data',
          revenueGrowth: 0,
          period: null,
          lastUpdated: null
        }
      });
    }

    const { 
      totalRevenue, 
      totalExpenses, 
      monthlyRevenue, 
      monthlyBurn, 
      recurringExpenses,
      nonRecurringExpenses,
      netIncome, 
      profitMargin,
      period 
    } = metrics;

    // Calculate runway based on monthly burn
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
        monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
        monthlyBurn: parseFloat(monthlyBurn.toFixed(2)),
        recurringExpenses: parseFloat(recurringExpenses.toFixed(2)),
        nonRecurringExpenses: parseFloat(nonRecurringExpenses.toFixed(2)),
        netIncome,
        profitMargin: parseFloat(profitMargin.toFixed(1)),
        runway,
        status,
        revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
        period,
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
            recurringExpenses: 0,
            nonRecurringExpenses: 0,
            runway: 0,
            status: 'No Data',
            revenueGrowth: 0,
            period: null,
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
          recurringExpenses: 0,
          nonRecurringExpenses: 0,
          runway: 0,
          status: 'No Data',
          revenueGrowth: 0,
          period: null
        }
      });
    }

    const { 
      totalRevenue, 
      totalExpenses, 
      monthlyRevenue,
      monthlyBurn,
      recurringExpenses,
      nonRecurringExpenses,
      netIncome, 
      profitMargin,
      period 
    } = metrics;
    
    const availableCash = netIncome > 0 ? netIncome * 12 : totalRevenue * 0.2;
    const runway = monthlyBurn > 0 ? Math.round(availableCash / monthlyBurn) : 0;

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        totalInvestment: availableCash,
        monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
        monthlyBurn: parseFloat(monthlyBurn.toFixed(2)),
        recurringExpenses: parseFloat(recurringExpenses.toFixed(2)),
        nonRecurringExpenses: parseFloat(nonRecurringExpenses.toFixed(2)),
        netIncome,
        profitMargin: parseFloat(profitMargin.toFixed(1)),
        runway,
        status: netIncome > 0 ? 'Profitable' : 'Burning',
        revenueGrowth: 0,
        period,
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
