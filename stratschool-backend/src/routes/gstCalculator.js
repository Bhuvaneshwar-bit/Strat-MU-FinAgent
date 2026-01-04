const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PLStatement = require('../models/PLStatement');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * GST RATES IN INDIA (As of 2024-25)
 * Source: cbic-gst.gov.in
 */
const GST_RATES = {
  // Exempt (0%)
  EXEMPT: { rate: 0, hsn: '0000', description: 'Exempt - No GST applicable' },
  
  // 5% GST
  ESSENTIAL: { rate: 5, hsn: '9954', description: '5% - Essential goods/services' },
  TRANSPORT: { rate: 5, hsn: '9965', description: '5% - Transport services' },
  RESTAURANT_NON_AC: { rate: 5, hsn: '9963', description: '5% - Non-AC restaurants' },
  
  // 12% GST
  PROCESSED_FOOD: { rate: 12, hsn: '2106', description: '12% - Processed food' },
  BUSINESS_CLASS_HOTELS: { rate: 12, hsn: '9963', description: '12% - Hotels ₹1000-7500' },
  IT_SERVICES: { rate: 12, hsn: '9983', description: '12% - Some IT services' },
  
  // 18% GST (Most common for services)
  STANDARD: { rate: 18, hsn: '9983', description: '18% - Standard rate' },
  PROFESSIONAL_SERVICES: { rate: 18, hsn: '9983', description: '18% - Professional services' },
  RESTAURANT_AC: { rate: 18, hsn: '9963', description: '18% - AC restaurants' },
  SOFTWARE: { rate: 18, hsn: '9984', description: '18% - Software & IT' },
  TELECOM: { rate: 18, hsn: '9984', description: '18% - Telecom services' },
  BANKING: { rate: 18, hsn: '9971', description: '18% - Banking & financial' },
  RENT_COMMERCIAL: { rate: 18, hsn: '9972', description: '18% - Commercial rent' },
  
  // 28% GST
  LUXURY: { rate: 28, hsn: '8703', description: '28% - Luxury items' },
  AUTOMOBILE: { rate: 28, hsn: '8703', description: '28% - Automobiles' },
  TOBACCO: { rate: 28, hsn: '2401', description: '28% - Tobacco products' },
  AERATED_DRINKS: { rate: 28, hsn: '2202', description: '28% - Aerated beverages' }
};

/**
 * Transaction category to GST rate mapping
 * Based on common business expense patterns
 */
const CATEGORY_GST_MAP = {
  // Credits (Sales/Revenue) - Usually 18% for services
  'Sales Revenue': GST_RATES.STANDARD,
  'Service Income': GST_RATES.PROFESSIONAL_SERVICES,
  'Consulting Income': GST_RATES.PROFESSIONAL_SERVICES,
  'Product Sales': GST_RATES.STANDARD,
  'Commission Income': GST_RATES.STANDARD,
  'Freelance Income': GST_RATES.PROFESSIONAL_SERVICES,
  'Interest Income': GST_RATES.EXEMPT, // Interest is exempt
  'Dividend Income': GST_RATES.EXEMPT, // Dividends are exempt
  'Investment Returns': GST_RATES.EXEMPT,
  'Refunds Received': GST_RATES.EXEMPT, // Refunds don't attract fresh GST
  'Other Income': GST_RATES.STANDARD,
  
  // Debits (Expenses) - Various rates
  'Salaries & Wages': GST_RATES.EXEMPT, // Salaries are not subject to GST
  'Rent & Utilities': GST_RATES.RENT_COMMERCIAL,
  'Office Supplies': GST_RATES.STANDARD,
  'Marketing & Advertising': GST_RATES.STANDARD,
  'Travel & Transportation': GST_RATES.TRANSPORT,
  'Food & Entertainment': GST_RATES.RESTAURANT_AC,
  'Professional Services': GST_RATES.PROFESSIONAL_SERVICES,
  'Legal & Compliance': GST_RATES.PROFESSIONAL_SERVICES,
  'Insurance': GST_RATES.STANDARD,
  'Bank Charges': GST_RATES.BANKING,
  'Software & Subscriptions': GST_RATES.SOFTWARE,
  'Equipment & Maintenance': GST_RATES.STANDARD,
  'Inventory/Stock Purchase': GST_RATES.STANDARD,
  'General Expenses': GST_RATES.STANDARD,
  'Taxes & Licenses': GST_RATES.EXEMPT, // Government fees usually exempt
  'EMI/Loan Repayment': GST_RATES.EXEMPT, // Principal + Interest
  'Personal Transfer': GST_RATES.EXEMPT, // Not business
  'ATM Withdrawal': GST_RATES.EXEMPT, // Cash withdrawal
  'UPI Transfer': GST_RATES.EXEMPT, // Personal transfers
};

/**
 * AI-powered transaction categorization for GST
 */
const categorizeTransactionForGST = async (description, amount, type) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Analyze this Indian bank transaction and determine the GST category.

Transaction: "${description}"
Amount: ₹${Math.abs(amount).toLocaleString('en-IN')}
Type: ${type === 'credit' ? 'Income/Receipt' : 'Expense/Payment'}

Return ONLY a JSON object with:
{
  "category": "one of: Sales Revenue, Service Income, Professional Services, Rent & Utilities, Software & Subscriptions, Travel & Transportation, Food & Entertainment, Bank Charges, Salaries & Wages, Insurance, Marketing & Advertising, Office Supplies, Equipment & Maintenance, Inventory/Stock Purchase, Legal & Compliance, EMI/Loan Repayment, Personal Transfer, ATM Withdrawal, UPI Transfer, Interest Income, Dividend Income, Refunds Received, General Expenses, Other Income",
  "gstRate": number (0, 5, 12, 18, or 28),
  "isGSTApplicable": boolean,
  "reason": "brief explanation",
  "isBusinessTransaction": boolean
}

Rules:
- Salary payments to employees = 0% (not subject to GST)
- Personal transfers (UPI/IMPS to individuals) = 0% (not business)
- ATM withdrawals = 0% (cash movement, not expense)
- Loan EMI = 0% (financial transaction)
- Interest received/paid = 0% (exempt)
- Most business services = 18%
- Transport/travel = 5%
- Software/IT = 18%
- Restaurant with AC = 18%, without AC = 5%
- If transaction looks personal, set isBusinessTransaction to false`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Default fallback
    return {
      category: type === 'credit' ? 'Other Income' : 'General Expenses',
      gstRate: 18,
      isGSTApplicable: true,
      reason: 'Default categorization',
      isBusinessTransaction: true
    };
  } catch (error) {
    console.error('AI categorization error:', error);
    return {
      category: type === 'credit' ? 'Other Income' : 'General Expenses',
      gstRate: 18,
      isGSTApplicable: true,
      reason: 'Fallback due to AI error',
      isBusinessTransaction: true
    };
  }
};

/**
 * Calculate GST from amount (extract base value and GST)
 * Assumes amount is GST-inclusive
 */
const extractGST = (totalAmount, gstRate) => {
  if (gstRate === 0) {
    return { baseValue: totalAmount, gstAmount: 0, gstRate };
  }
  
  // GST-inclusive formula: Base = Total / (1 + Rate/100)
  const baseValue = totalAmount / (1 + gstRate / 100);
  const gstAmount = totalAmount - baseValue;
  
  return {
    baseValue: Math.round(baseValue * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
    gstRate
  };
};

/**
 * Group transactions by month
 */
const groupByMonth = (transactions) => {
  const months = {};
  
  transactions.forEach(txn => {
    if (!txn.date) return;
    
    // Parse date (handles multiple formats)
    let date;
    if (typeof txn.date === 'string') {
      // Try different formats
      if (txn.date.includes('/')) {
        // DD/MM/YYYY or MM/DD/YYYY
        const parts = txn.date.split('/');
        if (parts[0].length === 4) {
          date = new Date(txn.date);
        } else {
          // Assume DD/MM/YYYY (Indian format)
          date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      } else {
        date = new Date(txn.date);
      }
    } else {
      date = new Date(txn.date);
    }
    
    if (isNaN(date.getTime())) return;
    
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    
    if (!months[monthKey]) {
      months[monthKey] = {
        key: monthKey,
        name: monthName,
        transactions: [],
        credits: [],
        debits: []
      };
    }
    
    months[monthKey].transactions.push(txn);
    if (txn.type === 'credit' || txn.amount > 0) {
      months[monthKey].credits.push(txn);
    } else {
      months[monthKey].debits.push(txn);
    }
  });
  
  return months;
};

/**
 * @route   POST /api/gst/calculate
 * @desc    Calculate GST from user's P&L data with AI categorization
 * @access  Private
 */
router.post('/calculate', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { defaultGstRate = 18, useAiCategorization = true } = req.body;
    
    console.log('📊 GST Calculation requested for user:', userId);
    
    // Get latest P&L statement
    const plStatement = await PLStatement.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();
    
    if (!plStatement) {
      return res.status(404).json({
        success: false,
        message: 'No financial data found. Please upload a bank statement first.'
      });
    }
    
    // Extract transactions from rawAnalysis or reconstructed data
    let transactions = [];
    
    if (plStatement.rawAnalysis?.transactions) {
      transactions = plStatement.rawAnalysis.transactions;
    } else {
      // Reconstruct from revenue/expenses categories
      const revenueItems = plStatement.revenue || plStatement.profitLossStatement?.revenue?.revenueStreams || [];
      const expenseItems = plStatement.expenses || plStatement.profitLossStatement?.expenses?.expenseCategories || [];
      
      revenueItems.forEach(item => {
        if (item.transactions) {
          transactions.push(...item.transactions.map(t => ({ ...t, type: 'credit' })));
        } else if (item.amount) {
          transactions.push({
            description: item.name || item.category,
            amount: item.amount,
            type: 'credit',
            date: plStatement.createdAt
          });
        }
      });
      
      expenseItems.forEach(item => {
        if (item.transactions) {
          transactions.push(...item.transactions.map(t => ({ ...t, type: 'debit' })));
        } else if (item.amount) {
          transactions.push({
            description: item.name || item.category,
            amount: -Math.abs(item.amount),
            type: 'debit',
            date: plStatement.createdAt
          });
        }
      });
    }
    
    console.log(`📝 Processing ${transactions.length} transactions for GST`);
    
    // Calculate GST for each transaction
    const gstTransactions = [];
    let totalOutputGST = 0; // GST collected on sales
    let totalInputGST = 0;  // GST paid on purchases (ITC)
    let totalExempt = 0;
    let totalNonBusiness = 0;
    
    for (const txn of transactions) {
      const amount = Math.abs(txn.amount || txn.credit || txn.debit || 0);
      const type = txn.type || (txn.credit ? 'credit' : 'debit');
      const description = txn.description || txn.narration || 'Unknown';
      
      let gstInfo;
      
      if (useAiCategorization && transactions.length <= 100) {
        // Use AI for accurate categorization (limit to 100 to avoid rate limits)
        gstInfo = await categorizeTransactionForGST(description, amount, type);
      } else {
        // Use rule-based categorization
        const category = txn.category || (type === 'credit' ? 'Other Income' : 'General Expenses');
        const gstMapping = CATEGORY_GST_MAP[category] || GST_RATES.STANDARD;
        gstInfo = {
          category,
          gstRate: gstMapping.rate,
          isGSTApplicable: gstMapping.rate > 0,
          isBusinessTransaction: true,
          reason: gstMapping.description
        };
      }
      
      const gstCalc = extractGST(amount, gstInfo.gstRate);
      
      const txnWithGST = {
        ...txn,
        description,
        originalAmount: amount,
        type,
        gstCategory: gstInfo.category,
        gstRate: gstInfo.gstRate,
        baseValue: gstCalc.baseValue,
        gstAmount: gstCalc.gstAmount,
        isGSTApplicable: gstInfo.isGSTApplicable,
        isBusinessTransaction: gstInfo.isBusinessTransaction,
        reason: gstInfo.reason
      };
      
      gstTransactions.push(txnWithGST);
      
      if (!gstInfo.isBusinessTransaction) {
        totalNonBusiness += amount;
      } else if (!gstInfo.isGSTApplicable || gstInfo.gstRate === 0) {
        totalExempt += amount;
      } else if (type === 'credit') {
        totalOutputGST += gstCalc.gstAmount;
      } else {
        totalInputGST += gstCalc.gstAmount;
      }
    }
    
    // Group by month for GSTR filing
    const monthlyData = groupByMonth(gstTransactions);
    
    // Calculate monthly GST liability
    const monthlyGST = Object.entries(monthlyData).map(([key, data]) => {
      const monthOutputGST = data.credits.reduce((sum, txn) => 
        sum + (txn.gstAmount || 0), 0);
      const monthInputGST = data.debits.reduce((sum, txn) => 
        sum + (txn.gstAmount || 0), 0);
      const netGST = monthOutputGST - monthInputGST;
      
      const totalSales = data.credits.reduce((sum, txn) => 
        sum + (txn.originalAmount || 0), 0);
      const totalPurchases = data.debits.reduce((sum, txn) => 
        sum + (txn.originalAmount || 0), 0);
      
      return {
        month: key,
        monthName: data.name,
        sales: {
          total: Math.round(totalSales * 100) / 100,
          baseValue: Math.round((totalSales - monthOutputGST) * 100) / 100,
          gstCollected: Math.round(monthOutputGST * 100) / 100,
          transactionCount: data.credits.length
        },
        purchases: {
          total: Math.round(totalPurchases * 100) / 100,
          baseValue: Math.round((totalPurchases - monthInputGST) * 100) / 100,
          gstPaid: Math.round(monthInputGST * 100) / 100,
          transactionCount: data.debits.length
        },
        netGSTPayable: Math.round(netGST * 100) / 100,
        gstr1DueDate: getGSTR1DueDate(key),
        gstr3bDueDate: getGSTR3BDueDate(key)
      };
    }).sort((a, b) => a.month.localeCompare(b.month));
    
    // Overall summary
    const totalSales = gstTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + (t.originalAmount || 0), 0);
    
    const totalPurchases = gstTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + (t.originalAmount || 0), 0);
    
    const netGSTPayable = totalOutputGST - totalInputGST;
    
    // GST rate distribution
    const rateDistribution = {};
    gstTransactions.forEach(txn => {
      const rate = txn.gstRate || 0;
      if (!rateDistribution[rate]) {
        rateDistribution[rate] = { count: 0, amount: 0 };
      }
      rateDistribution[rate].count++;
      rateDistribution[rate].amount += txn.originalAmount || 0;
    });
    
    const response = {
      success: true,
      summary: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalSalesBaseValue: Math.round((totalSales - totalOutputGST) * 100) / 100,
        totalOutputGST: Math.round(totalOutputGST * 100) / 100,
        totalPurchases: Math.round(totalPurchases * 100) / 100,
        totalPurchasesBaseValue: Math.round((totalPurchases - totalInputGST) * 100) / 100,
        totalInputGST: Math.round(totalInputGST * 100) / 100,
        netGSTPayable: Math.round(netGSTPayable * 100) / 100,
        totalExempt: Math.round(totalExempt * 100) / 100,
        totalNonBusiness: Math.round(totalNonBusiness * 100) / 100,
        transactionCount: transactions.length,
        gstTransactionCount: gstTransactions.filter(t => t.isGSTApplicable).length
      },
      monthlyBreakdown: monthlyGST,
      rateDistribution: Object.entries(rateDistribution).map(([rate, data]) => ({
        rate: parseInt(rate),
        transactionCount: data.count,
        totalAmount: Math.round(data.amount * 100) / 100
      })),
      transactions: gstTransactions.slice(0, 50), // Return first 50 for preview
      disclaimer: {
        message: 'This is an ESTIMATE based on bank statement analysis. For accurate GST filing, please verify with your CA and actual invoices.',
        notes: [
          'GST rates are assumed based on transaction descriptions',
          'Some transactions may be incorrectly categorized',
          'Inter-state vs Intra-state GST (IGST vs CGST+SGST) is not differentiated',
          'Reverse charge mechanism is not considered',
          'Always verify with actual invoices before filing'
        ]
      },
      metadata: {
        calculatedAt: new Date().toISOString(),
        aiCategorization: useAiCategorization,
        defaultRate: defaultGstRate,
        financialYear: getCurrentFY(),
        statementPeriod: plStatement.period
      }
    };
    
    console.log('✅ GST calculation complete:', {
      transactions: transactions.length,
      outputGST: totalOutputGST,
      inputGST: totalInputGST,
      netPayable: netGSTPayable
    });
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ GST calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate GST',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/gst/rates
 * @desc    Get all GST rates and categories
 * @access  Public
 */
router.get('/rates', (req, res) => {
  res.json({
    success: true,
    rates: [
      { rate: 0, label: 'Exempt (0%)', examples: ['Salaries', 'Interest', 'Personal transfers'] },
      { rate: 5, label: 'Essential (5%)', examples: ['Transport', 'Non-AC restaurants', 'Essential goods'] },
      { rate: 12, label: 'Standard (12%)', examples: ['Processed food', 'Budget hotels', 'Some IT services'] },
      { rate: 18, label: 'Standard (18%)', examples: ['Most services', 'Software', 'Professional services', 'Banking'] },
      { rate: 28, label: 'Luxury (28%)', examples: ['Luxury items', 'Automobiles', 'Tobacco', 'Aerated drinks'] }
    ],
    categoryMapping: CATEGORY_GST_MAP
  });
});

/**
 * Helper: Get GSTR-1 due date (11th of next month)
 */
function getGSTR1DueDate(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  let dueMonth = month + 1;
  let dueYear = year;
  if (dueMonth > 12) {
    dueMonth = 1;
    dueYear++;
  }
  return `${dueYear}-${String(dueMonth).padStart(2, '0')}-11`;
}

/**
 * Helper: Get GSTR-3B due date (20th of next month)
 */
function getGSTR3BDueDate(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  let dueMonth = month + 1;
  let dueYear = year;
  if (dueMonth > 12) {
    dueMonth = 1;
    dueYear++;
  }
  return `${dueYear}-${String(dueMonth).padStart(2, '0')}-20`;
}

/**
 * Helper: Get current financial year
 */
function getCurrentFY() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  if (month >= 4) {
    return `FY ${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `FY ${year - 1}-${year.toString().slice(-2)}`;
  }
}

module.exports = router;
