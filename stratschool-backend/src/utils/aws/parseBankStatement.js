/**
 * Bank Statement Parser with P&L Calculation
 * Converts Textract extracted data into structured bank statement format
 * Generates P&L statement like a Chartered Accountant
 * 
 * @module parseBankStatement
 */

/**
 * Transaction Category Mappings (Based on standard accounting practices)
 */
const CATEGORY_PATTERNS = {
  revenue: {
    'Sales Revenue': [
      /payment.*received/i, /razorpay/i, /stripe/i, /paytm.*merchant/i,
      /phonepe.*merchant/i, /gpay.*merchant/i, /sales/i, /invoice/i,
      /customer.*payment/i, /collection/i, /receipt/i, /inward/i
    ],
    'Service Income': [
      /consulting/i, /service.*fee/i, /professional.*fee/i, /retainer/i,
      /commission/i, /brokerage/i
    ],
    'Interest Income': [
      /interest.*credit/i, /int.*cred/i, /interest.*received/i, /fd.*interest/i,
      /savings.*interest/i, /int\.cr/i, /interest earned/i
    ],
    'Refunds Received': [
      /refund/i, /reversal.*credit/i, /cashback/i, /return.*credit/i, /merch refund/i
    ],
    'Investment Returns': [
      /dividend/i, /mutual.*fund.*credit/i, /mf.*credit/i, /investment.*return/i
    ],
    'Rental Income': [
      /rent.*received/i, /rental.*income/i, /lease.*payment.*received/i
    ],
    'Other Income': []
  },
  expenses: {
    'Inventory/Stock Purchase': [
      /purchase/i, /stock/i, /inventory/i, /raw.*material/i, /goods/i,
      /supplier/i, /vendor.*payment/i, /wholesale/i
    ],
    'Salary & Wages': [
      /salary/i, /payroll/i, /wage/i, /employee/i, /staff.*payment/i,
      /contractor.*payment/i, /freelancer/i
    ],
    'Rent & Lease': [
      /rent\s/i, /lease/i, /office.*space/i, /property/i, /premises/i
    ],
    'Utilities': [
      /electricity/i, /electric.*bill/i, /power/i, /water.*bill/i,
      /gas.*bill/i, /utility/i, /bescom/i, /kseb/i, /tangedco/i
    ],
    'Internet & Telecom': [
      /internet/i, /wifi/i, /broadband/i, /airtel/i, /jio/i, /bsnl/i,
      /vodafone/i, /vi\s/i, /mobile.*recharge/i, /telecom/i, /phone.*bill/i
    ],
    'Software & Subscriptions': [
      /software/i, /subscription/i, /saas/i, /aws/i, /google.*cloud/i,
      /azure/i, /zoho/i, /slack/i, /notion/i, /figma/i, /adobe/i,
      /netflix/i, /spotify/i, /microsoft/i, /github/i, /dropbox/i,
      /canva/i, /mailchimp/i, /hubspot/i, /salesforce/i, /heygen/i,
      /ecom pur/i
    ],
    'Marketing & Advertising': [
      /marketing/i, /advertising/i, /ad.*spend/i, /facebook.*ads/i,
      /google.*ads/i, /meta.*ads/i, /instagram/i, /campaign/i,
      /promotion/i, /seo/i, /digital.*marketing/i
    ],
    'Professional Services': [
      /legal/i, /lawyer/i, /advocate/i, /ca\s/i, /chartered.*accountant/i,
      /audit/i, /consultant/i, /advisor/i, /compliance/i
    ],
    'Insurance': [
      /insurance/i, /policy.*premium/i, /lic/i, /health.*insurance/i,
      /motor.*insurance/i, /general.*insurance/i
    ],
    'Travel & Conveyance': [
      /travel/i, /uber/i, /ola/i, /rapido/i, /cab/i, /taxi/i,
      /petrol/i, /diesel/i, /fuel/i, /toll/i, /flight/i, /airline/i,
      /railway/i, /irctc/i, /bus.*ticket/i, /makemytrip/i, /goibibo/i
    ],
    'Office Expenses': [
      /stationery/i, /office.*supplies/i, /furniture/i, /equipment/i,
      /maintenance/i, /repair/i, /cleaning/i, /housekeeping/i
    ],
    'Food & Entertainment': [
      /zomato/i, /swiggy/i, /restaurant/i, /food/i, /cafe/i, /coffee/i,
      /dining/i, /hotel/i, /entertainment/i, /party/i
    ],
    'Bank Charges': [
      /bank.*charge/i, /transaction.*fee/i, /service.*charge/i, /gst.*charge/i,
      /processing.*fee/i, /emi.*charge/i, /late.*fee/i, /penalty/i,
      /annual.*fee/i, /card.*fee/i
    ],
    'Taxes Paid': [
      /gst.*payment/i, /income.*tax/i, /tds/i, /advance.*tax/i,
      /professional.*tax/i, /tax.*payment/i
    ],
    'Loan & EMI': [
      /emi/i, /loan.*payment/i, /instalment/i, /credit.*card.*payment/i,
      /principal/i, /repayment/i
    ],
    'Interest Paid': [
      /interest.*debit/i, /int.*dr/i, /interest.*paid/i, /int\.dr/i,
      /loan.*interest/i, /od.*interest/i
    ],
    'Transfers Out': [
      /upi\/p2a/i, /upi\/p2m/i, /imps\/p2a/i, /imps/i, /neft/i, /rtgs/i,
      /transfer/i
    ],
    'General Expenses': [
      /pos\//i, /atm/i, /withdrawal/i
    ]
  }
};

/**
 * Parse bank statement from Textract response
 */
function parseBankStatement(textractData) {
  console.log('📊 Parsing bank statement from Textract data...');
  
  const result = {
    account_holder: null,
    account_number: null,
    ifsc_code: null,
    bank_name: null,
    statement_period: { from: null, to: null },
    opening_balance: null,
    closing_balance: null,
    transactions: [],
    summary: { total_credits: 0, total_debits: 0, transaction_count: 0 },
    plStatement: {
      revenue: { totalRevenue: 0, revenueStreams: [] },
      expenses: { totalExpenses: 0, expenseCategories: [] },
      profitability: { grossProfit: 0, grossProfitMargin: 0, netIncome: 0, netProfitMargin: 0 }
    },
    analysisMetrics: { totalRevenue: 0, totalExpenses: 0, netIncome: 0 },
    insights: []
  };
  
  try {
    extractAccountInfo(textractData, result);
    extractAllTransactions(textractData, result);
    calculateProfitAndLoss(result);
    generateInsights(result);
    console.log(`✅ Parsed ${result.transactions.length} transactions`);
    return result;
  } catch (error) {
    console.error('❌ Bank statement parsing failed:', error.message);
    throw new Error(`PARSING_ERROR: ${error.message}`);
  }
}

function extractAccountInfo(textractData, result) {
  const { text, keyValuePairs } = textractData;
  const allText = text.map(t => t.text).join('\n');
  
  result.account_holder = extractAccountHolder(allText, keyValuePairs);
  result.account_number = extractAccountNumber(allText, keyValuePairs);
  result.ifsc_code = extractIFSCCode(allText, keyValuePairs);
  result.bank_name = extractBankName(allText, keyValuePairs);
  
  const period = extractStatementPeriod(allText, keyValuePairs);
  if (period) result.statement_period = period;
  
  const balances = extractBalances(allText, keyValuePairs);
  result.opening_balance = balances.opening;
  result.closing_balance = balances.closing;
}

function extractAllTransactions(textractData, result) {
  const { tables, text } = textractData;
  
  if (!tables || tables.length === 0) {
    console.warn('⚠️  No tables found, trying text extraction...');
    extractTransactionsFromText(text, result);
    return;
  }
  
  console.log(`📊 Found ${tables.length} tables across all pages`);
  
  for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
    const table = tables[tableIndex];
    
    if (!table.rows || table.rows.length < 2) continue;
    
    const headers = table.rows[0].map(h => (h || '').toLowerCase());
    const columnMap = identifyColumns(headers);
    
    if (!isTransactionTable(columnMap, headers)) {
      console.log(`   Table ${tableIndex + 1}: Skipped (not a transaction table)`);
      continue;
    }
    
    console.log(`   Table ${tableIndex + 1}: Processing ${table.rows.length - 1} rows...`);
    
    let tableTransactions = 0;
    for (let i = 1; i < table.rows.length; i++) {
      const row = table.rows[i];
      try {
        const transaction = parseTransactionRow(row, columnMap, headers);
        if (transaction) {
          result.transactions.push(transaction);
          tableTransactions++;
        }
      } catch (error) {}
    }
    
    console.log(`   Table ${tableIndex + 1}: Extracted ${tableTransactions} transactions`);
  }
  
  if (result.transactions.length < 10) {
    console.log('📝 Attempting supplementary text extraction...');
    extractTransactionsFromText(text, result);
  }
}

function isTransactionTable(columnMap, headers) {
  const headersStr = headers.join(' ');
  const hasDate = columnMap.date !== undefined || headersStr.includes('date') || headersStr.includes('txn') || headersStr.includes('tran');
  const hasAmount = columnMap.debit !== undefined || columnMap.credit !== undefined || columnMap.amount !== undefined || headersStr.includes('amount') || headersStr.includes('dr') || headersStr.includes('cr');
  return hasDate || hasAmount;
}

function extractTransactionsFromText(textBlocks, result) {
  if (!textBlocks || textBlocks.length === 0) return;
  const allText = textBlocks.map(t => t.text).join('\n');
  const txnPattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*(Dr|Cr)?/gi;
  let match;
  while ((match = txnPattern.exec(allText)) !== null) {
    const date = parseDate(match[1]);
    const description = match[2].trim();
    const amount = parseAmount(match[3]);
    const type = match[4]?.toLowerCase() === 'dr' ? 'debit' : 'credit';
    if (date && amount) {
      result.transactions.push({
        date, description,
        amount: type === 'debit' ? -Math.abs(amount) : Math.abs(amount),
        type, balance: null, reference: null
      });
    }
  }
}

function identifyColumns(headers) {
  const columnMap = {};
  headers.forEach((header, index) => {
    const h = header.toLowerCase();
    if ((h.includes('date') || h.includes('txn') || h.includes('tran')) && !columnMap.date) columnMap.date = index;
    if (h.includes('value') && h.includes('date')) columnMap.valueDate = index;
    if (h.includes('description') || h.includes('particulars') || h.includes('narration') || h.includes('details') || h.includes('remark')) columnMap.description = index;
    if ((h.includes('debit') || h.includes('withdrawal') || (h.includes('dr') && !h.includes('addr'))) && !h.includes('credit')) columnMap.debit = index;
    if ((h.includes('credit') || h.includes('deposit') || h.includes('cr')) && !h.includes('debit')) columnMap.credit = index;
    if (h.includes('balance') || h.includes('closing')) columnMap.balance = index;
    if (h.includes('amount') && !columnMap.debit && !columnMap.credit) columnMap.amount = index;
    if (h.includes('ref') || h.includes('reference') || h.includes('cheque') || h.includes('chq')) columnMap.reference = index;
    if (h.includes('s.no') || h.includes('sl') || h.includes('serial') || h === 'no' || h === 's.no.') columnMap.serial = index;
  });
  return columnMap;
}

function parseTransactionRow(row, columnMap, headers) {
  if (!row || row.every(cell => !cell || cell.toString().trim() === '')) return null;
  
  const rowText = row.join(' ').toLowerCase();
  if (rowText.includes('total dr/cr') || (rowText.includes('total') && rowText.includes('transaction')) ||
      rowText.includes('opening balance') || rowText.includes('closing balance') ||
      rowText.includes('balance b/f') || rowText.includes('balance c/f') ||
      rowText.includes('s.no') || rowText.includes('particulars') ||
      rowText.includes('tran date') || rowText.includes('value date')) {
    return null;
  }
  
  const transaction = { date: null, description: null, amount: null, type: null, balance: null, reference: null, category: null };
  
  // Extract date
  if (columnMap.date !== undefined && row[columnMap.date]) {
    transaction.date = parseDate(row[columnMap.date].toString());
  }
  if (!transaction.date && row[0]) {
    const firstCell = row[0].toString();
    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(firstCell)) {
      transaction.date = parseDate(firstCell);
    }
  }
  
  // Extract description
  if (columnMap.description !== undefined && row[columnMap.description]) {
    transaction.description = row[columnMap.description]?.toString().trim() || null;
  }
  if (!transaction.description) {
    for (let i = 1; i < Math.min(5, row.length); i++) {
      const cell = row[i]?.toString().trim();
      if (cell && cell.length > 10 && !/^[\d,\.]+$/.test(cell)) {
        transaction.description = cell;
        break;
      }
    }
  }
  
  // Extract amount
  if (columnMap.debit !== undefined || columnMap.credit !== undefined) {
    const debitVal = columnMap.debit !== undefined ? row[columnMap.debit] : null;
    const creditVal = columnMap.credit !== undefined ? row[columnMap.credit] : null;
    const debit = parseAmount(debitVal);
    const credit = parseAmount(creditVal);
    if (debit && debit !== 0) {
      transaction.amount = -Math.abs(debit);
      transaction.type = 'debit';
    } else if (credit && credit !== 0) {
      transaction.amount = Math.abs(credit);
      transaction.type = 'credit';
    }
  } else if (columnMap.amount !== undefined) {
    transaction.amount = parseAmount(row[columnMap.amount]);
    transaction.type = transaction.amount >= 0 ? 'credit' : 'debit';
  }
  
  // Fallback amount extraction
  if (transaction.amount === null || transaction.amount === 0) {
    for (let i = row.length - 1; i >= 0; i--) {
      const amount = parseAmount(row[i]);
      if (amount && amount > 0) {
        if (i === row.length - 1 || (columnMap.balance !== undefined && i === columnMap.balance)) {
          transaction.balance = amount;
        } else {
          transaction.amount = amount;
          if (rowText.includes('dr') || rowText.includes('debit') || rowText.includes('withdrawal')) {
            transaction.amount = -Math.abs(amount);
            transaction.type = 'debit';
          } else {
            transaction.type = 'credit';
          }
          break;
        }
      }
    }
  }
  
  if (columnMap.balance !== undefined && row[columnMap.balance]) {
    transaction.balance = parseAmount(row[columnMap.balance]);
  }
  if (columnMap.reference !== undefined && row[columnMap.reference]) {
    transaction.reference = row[columnMap.reference]?.toString().trim() || null;
  }
  
  if (transaction.amount === null || transaction.amount === 0) return null;
  if (!transaction.date && !transaction.description) return null;
  
  transaction.category = categorizeTransaction(transaction);
  return transaction;
}

function categorizeTransaction(transaction) {
  const description = (transaction.description || '').toLowerCase();
  const categoryType = transaction.amount > 0 ? 'revenue' : 'expenses';
  const patterns = CATEGORY_PATTERNS[categoryType];
  
  for (const [category, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      if (regex.test(description)) {
        return { type: categoryType, category };
      }
    }
  }
  
  return { type: categoryType, category: categoryType === 'revenue' ? 'Other Income' : 'General Expenses' };
}

function calculateProfitAndLoss(result) {
  const revenueGroups = {};
  const expenseGroups = {};
  let totalRevenue = 0;
  let totalExpenses = 0;
  
  for (const txn of result.transactions) {
    if (!txn.category) continue;
    const { type, category } = txn.category;
    const amount = Math.abs(txn.amount);
    
    if (type === 'revenue') {
      totalRevenue += amount;
      if (!revenueGroups[category]) revenueGroups[category] = { total: 0, count: 0 };
      revenueGroups[category].total += amount;
      revenueGroups[category].count++;
    } else {
      totalExpenses += amount;
      if (!expenseGroups[category]) expenseGroups[category] = { total: 0, count: 0 };
      expenseGroups[category].total += amount;
      expenseGroups[category].count++;
    }
  }
  
  const revenueStreams = Object.entries(revenueGroups)
    .map(([name, data]) => ({
      name, amount: Math.round(data.total * 100) / 100,
      percentage: totalRevenue > 0 ? Math.round((data.total / totalRevenue) * 100) : 0,
      transactionCount: data.count
    }))
    .sort((a, b) => b.amount - a.amount);
  
  const expenseCategories = Object.entries(expenseGroups)
    .map(([name, data]) => ({
      name, amount: Math.round(data.total * 100) / 100,
      percentage: totalExpenses > 0 ? Math.round((data.total / totalExpenses) * 100) : 0,
      transactionCount: data.count
    }))
    .sort((a, b) => b.amount - a.amount);
  
  const netIncome = totalRevenue - totalExpenses;
  const netProfitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
  const grossProfit = totalRevenue - (expenseGroups['Inventory/Stock Purchase']?.total || 0);
  const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  
  result.plStatement = {
    revenue: { totalRevenue: Math.round(totalRevenue * 100) / 100, revenueStreams },
    expenses: { totalExpenses: Math.round(totalExpenses * 100) / 100, expenseCategories },
    profitability: {
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossProfitMargin: Math.round(grossProfitMargin * 10) / 10,
      netIncome: Math.round(netIncome * 100) / 100,
      netProfitMargin: Math.round(netProfitMargin * 10) / 10
    }
  };
  
  result.analysisMetrics = {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netIncome: Math.round(netIncome * 100) / 100
  };
  
  result.summary = {
    total_credits: Math.round(totalRevenue * 100) / 100,
    total_debits: Math.round(totalExpenses * 100) / 100,
    transaction_count: result.transactions.length,
    net_change: Math.round(netIncome * 100) / 100
  };
}

function generateInsights(result) {
  const insights = [];
  const { plStatement, analysisMetrics } = result;
  
  if (analysisMetrics.netIncome > 0) {
    insights.push({ type: 'positive', title: 'Profitable Period', description: `Your business generated a net profit of ₹${analysisMetrics.netIncome.toLocaleString('en-IN')} this period.` });
  } else if (analysisMetrics.netIncome < 0) {
    insights.push({ type: 'warning', title: 'Loss Alert', description: `Your business incurred a net loss of ₹${Math.abs(analysisMetrics.netIncome).toLocaleString('en-IN')}. Review expenses to reduce outflows.` });
  }
  
  if (plStatement.revenue.revenueStreams.length > 0) {
    const topRevenue = plStatement.revenue.revenueStreams[0];
    if (topRevenue.percentage > 70) {
      insights.push({ type: 'info', title: 'Revenue Concentration', description: `${topRevenue.percentage}% of revenue comes from "${topRevenue.name}". Consider diversifying income sources.` });
    }
  }
  
  if (plStatement.expenses.expenseCategories.length > 0) {
    const topExpense = plStatement.expenses.expenseCategories[0];
    insights.push({ type: 'info', title: 'Largest Expense Category', description: `"${topExpense.name}" is your biggest expense at ₹${topExpense.amount.toLocaleString('en-IN')} (${topExpense.percentage}% of total expenses).` });
  }
  
  const profitMargin = plStatement.profitability.netProfitMargin;
  if (profitMargin < 0) {
    insights.push({ type: 'warning', title: 'Negative Profit Margin', description: `Your expenses exceed revenue by ${Math.abs(profitMargin).toFixed(1)}%. Focus on increasing income or reducing costs.` });
  } else if (profitMargin < 10 && profitMargin > 0) {
    insights.push({ type: 'warning', title: 'Low Profit Margin', description: `Your profit margin is ${profitMargin.toFixed(1)}%. Healthy businesses typically aim for 15-20%+.` });
  } else if (profitMargin >= 20) {
    insights.push({ type: 'positive', title: 'Healthy Profit Margin', description: `Excellent! Your ${profitMargin.toFixed(1)}% profit margin indicates strong business health.` });
  }
  
  insights.push({ type: 'info', title: 'Transaction Summary', description: `Analyzed ${result.transactions.length} transactions with ₹${analysisMetrics.totalRevenue.toLocaleString('en-IN')} inflows and ₹${analysisMetrics.totalExpenses.toLocaleString('en-IN')} outflows.` });
  
  result.insights = insights;
}

// Helper functions
function extractAccountHolder(text, keyValuePairs) {
  const nameKeys = ['name', 'account holder', 'customer name', 'holder name'];
  for (const kvp of keyValuePairs) {
    if (nameKeys.some(key => kvp.key.toLowerCase().includes(key))) return kvp.value;
  }
  const patterns = [/(?:Name|Account Holder|Customer Name)[:\s]+([A-Z][A-Za-z\s]+)/i, /^([A-Z][A-Z\s]+)$/m];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length > 3) return match[1].trim();
  }
  return null;
}

function extractAccountNumber(text, keyValuePairs) {
  const accountKeys = ['account number', 'account no', 'a/c no', 'acct no'];
  for (const kvp of keyValuePairs) {
    if (accountKeys.some(key => kvp.key.toLowerCase().includes(key))) return kvp.value.replace(/\s+/g, '');
  }
  const patterns = [/(?:Account|A\/C|Acct)[\s#:No.]+(\d{9,18})/i, /Account Number[:\s]+(\d{9,18})/i, /\b(\d{9,18})\b/];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function extractIFSCCode(text, keyValuePairs) {
  for (const kvp of keyValuePairs) {
    if (kvp.key.toLowerCase().includes('ifsc')) return kvp.value.toUpperCase();
  }
  const match = text.match(/\b([A-Z]{4}0[A-Z0-9]{6})\b/i);
  return match ? match[1].toUpperCase() : null;
}

function extractBankName(text, keyValuePairs) {
  const bankNames = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank', 'Kotak Mahindra Bank', 'IndusInd Bank', 'Yes Bank', 'IDFC First Bank', 'Federal Bank', 'RBL Bank', 'Karnataka Bank', 'South Indian Bank', 'City Union Bank'];
  const textLower = text.toLowerCase();
  for (const bank of bankNames) {
    if (textLower.includes(bank.toLowerCase())) return bank;
  }
  const firstLines = text.split('\n').slice(0, 5).join(' ');
  const match = firstLines.match(/([A-Z][A-Za-z\s]+Bank)/);
  return match ? match[1].trim() : null;
}

function extractStatementPeriod(text, keyValuePairs) {
  for (const kvp of keyValuePairs) {
    const key = kvp.key.toLowerCase();
    if (key.includes('from') || key.includes('start')) {
      const fromDate = parseDate(kvp.value);
      if (fromDate) {
        const toKvp = keyValuePairs.find(k => k.key.toLowerCase().includes('to') || k.key.toLowerCase().includes('end'));
        return { from: fromDate, to: toKvp ? parseDate(toKvp.value) : null };
      }
    }
  }
  const dateRangePatterns = [/(?:From|Period)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:To|to)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i, /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+to\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i];
  for (const pattern of dateRangePatterns) {
    const match = text.match(pattern);
    if (match) return { from: parseDate(match[1]), to: parseDate(match[2]) };
  }
  return null;
}

function extractBalances(text, keyValuePairs) {
  const result = { opening: null, closing: null };
  for (const kvp of keyValuePairs) {
    const key = kvp.key.toLowerCase();
    if (key.includes('opening') && key.includes('balance')) result.opening = parseAmount(kvp.value);
    if (key.includes('closing') && key.includes('balance')) result.closing = parseAmount(kvp.value);
  }
  const openingMatch = text.match(/Opening Balance[:\s]+([\d,]+\.?\d*)/i);
  const closingMatch = text.match(/Closing Balance[:\s]+([\d,]+\.?\d*)/i);
  if (openingMatch && !result.opening) result.opening = parseAmount(openingMatch[1]);
  if (closingMatch && !result.closing) result.closing = parseAmount(closingMatch[1]);
  return result;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    dateStr = dateStr.toString().trim();
    const formats = [/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/, /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/];
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let day, month, year;
        if (format === formats[2]) { [, year, month, day] = match; }
        else { [, day, month, year] = match; if (year.length === 2) year = parseInt(year) > 50 ? `19${year}` : `20${year}`; }
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
      }
    }
    return null;
  } catch (error) { return null; }
}

function parseAmount(amountStr) {
  if (!amountStr) return null;
  try {
    const cleaned = amountStr.toString().replace(/[₹$€£,\s]/g, '').replace(/\(/g, '-').replace(/\)/g, '').trim();
    if (!cleaned || cleaned === '-' || cleaned === '') return null;
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : amount;
  } catch (error) { return null; }
}

module.exports = { parseBankStatement, extractAccountInfo, extractAllTransactions, calculateProfitAndLoss, parseDate, parseAmount, categorizeTransaction };
