/**
 * DEDICATED AUTOMATED BOOKKEEPING AI SERVICE
 * Uses dedicated API key for automated bookkeeping tasks
 * Professional-grade financial categorization and analysis
 */

const axios = require('axios');

class DedicatedBookkeepingAI {
  constructor() {
    // Use dedicated API key for bookkeeping
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseURL = 'https://api.groq.com/openai/v1/chat/completions';
    this.systemPrompt = this.buildBookkeepingPrompt();
    console.log('🏆 Dedicated Bookkeeping AI initialized with environment API key');
  }

  buildBookkeepingPrompt() {
    return `You are a PROFESSIONAL ACCOUNTANT AI for automated bookkeeping.

TASK: Convert bank transactions to journal entries and categorize them.

CATEGORIES:
- ASSETS: Cash, Equipment, Receivables
- LIABILITIES: Payables, Loans, Credit Cards  
- EQUITY: Owner's Equity, Retained Earnings
- REVENUE: Sales, Service Revenue, Other Income
- EXPENSES: Rent, Utilities, Marketing, Professional Fees

OUTPUT FORMAT (JSON ONLY):
{
  "businessProfile": {
    "businessName": "Company Name",
    "industry": "Industry Type", 
    "accountingMethod": "Accrual"
  },
  "chartOfAccounts": {
    "assets": [{"code": "1000", "name": "Cash - Operating", "type": "Current Asset"}],
    "liabilities": [{"code": "2000", "name": "Accounts Payable", "type": "Current Liability"}],
    "equity": [{"code": "3000", "name": "Owner's Equity", "type": "Owner's Equity"}],
    "revenue": [{"code": "4000", "name": "Service Revenue", "type": "Operating Revenue"}],
    "expenses": [{"code": "5000", "name": "Operating Expenses", "type": "Operating Expense"}]
  },
  "journalEntries": [
    {
      "entryId": "JE001",
      "date": "2024-02-01",
      "description": "Transaction description",
      "reference": "REF-001",
      "debits": [{"account": "Cash - Operating", "amount": 1000.00}],
      "credits": [{"account": "Service Revenue", "amount": 1000.00}],
      "totalDebits": 1000.00,
      "totalCredits": 1000.00,
      "isBalanced": true,
      "category": "Revenue",
      "transactionType": "Income"
    }
  ],
  "summary": {
    "totalTransactions": 1,
    "totalDebits": 1000.00,
    "totalCredits": 1000.00,
    "isBalanced": true,
    "categories": {"revenue": 1000.00}
  },
  "professionalRecommendations": ["Review entries for accuracy"]
}

Return ONLY valid JSON.`;
  }

  async processFinancialDocument(documentData, businessInfo = {}) {
    try {
      console.log('🎯 Processing financial document with dedicated AI...');
      
      const prompt = `${this.systemPrompt}

BUSINESS INFORMATION:
Company: ${businessInfo.companyName || 'Unknown Business'}
Industry: ${businessInfo.industry || 'General'}

BANK STATEMENT DATA TO ANALYZE:
${JSON.stringify(documentData, null, 2)}

TASK: Analyze this bank statement data and create professional journal entries with proper categorization.
Focus on accurately categorizing each transaction into the correct accounting category (Asset, Liability, Equity, Revenue, Expense).

Return valid JSON only:`;

      const response = await axios.post(this.baseURL, {
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.1-70b-versatile',
        temperature: 0.1,
        max_tokens: 4000
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const aiResponse = response.data.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('No response from Dedicated Bookkeeping AI');
      }

      console.log('📋 Raw AI Response length:', aiResponse.length);
      
      // Parse and validate the response
      return this.validateAndParseBookkeepingResponse(aiResponse);
      
    } catch (error) {
      console.error('❌ Dedicated Bookkeeping AI Error:', error);
      
      // Fallback with professional structure
      return this.generateFallbackBookkeeping(documentData, businessInfo);
    }
  }

  validateAndParseBookkeepingResponse(aiResponse) {
    try {
      // Clean the response
      let cleanResponse = aiResponse.trim();
      
      // Remove any markdown code blocks
      cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Remove any leading/trailing text
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd);
      }

      const parsedResponse = JSON.parse(cleanResponse);
      
      // Validate required fields
      if (!parsedResponse.journalEntries || !Array.isArray(parsedResponse.journalEntries)) {
        throw new Error('Invalid journal entries structure');
      }

      if (!parsedResponse.chartOfAccounts) {
        throw new Error('Missing chart of accounts');
      }

      console.log('✅ Dedicated AI response validated successfully');
      return parsedResponse;
      
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      console.log('🔧 Attempting JSON repair...');
      
      return this.repairJSON(aiResponse);
    }
  }

  repairJSON(brokenJson) {
    try {
      // Remove common issues
      let repaired = brokenJson
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .trim();

      // Find JSON boundaries
      const start = repaired.indexOf('{');
      const end = repaired.lastIndexOf('}') + 1;
      
      if (start !== -1 && end > start) {
        repaired = repaired.substring(start, end);
      }

      const parsed = JSON.parse(repaired);
      console.log('✅ JSON repaired successfully');
      return parsed;
      
    } catch (repairError) {
      console.error('❌ JSON repair failed:', repairError);
      throw new Error('Unable to parse AI response as valid JSON');
    }
  }

  generateFallbackBookkeeping(documentData, businessInfo) {
    console.log('🔄 Generating fallback bookkeeping structure...');
    
    const transactions = documentData.transactions || [];
    const fallbackEntries = [];
    
    transactions.forEach((transaction, index) => {
      const amount = Math.abs(parseFloat(transaction.amount) || 0);
      const description = transaction.description || `Transaction ${index + 1}`;
      
      // Smart categorization based on description
      let debitAccount, creditAccount, category, transactionType;
      
      if (description.toLowerCase().includes('payment') || description.toLowerCase().includes('fee') || description.toLowerCase().includes('consulting')) {
        // Revenue transaction
        debitAccount = "Cash - Operating";
        creditAccount = "Service Revenue";
        category = "Revenue";
        transactionType = "Income";
      } else if (description.toLowerCase().includes('rent')) {
        // Rent expense
        debitAccount = "Rent Expense";
        creditAccount = "Cash - Operating";
        category = "Expense";
        transactionType = "Expense";
      } else if (description.toLowerCase().includes('software') || description.toLowerCase().includes('subscription')) {
        // Software expense
        debitAccount = "Software Expense";
        creditAccount = "Cash - Operating";
        category = "Expense";
        transactionType = "Expense";
      } else if (description.toLowerCase().includes('internet') || description.toLowerCase().includes('utilities')) {
        // Utilities expense
        debitAccount = "Utilities Expense";
        creditAccount = "Cash - Operating";
        category = "Expense";
        transactionType = "Expense";
      } else if (description.toLowerCase().includes('equipment') || description.toLowerCase().includes('purchase')) {
        // Equipment purchase
        debitAccount = "Equipment";
        creditAccount = "Cash - Operating";
        category = "Asset";
        transactionType = "Asset Purchase";
      } else if (description.toLowerCase().includes('marketing') || description.toLowerCase().includes('campaign')) {
        // Marketing expense
        debitAccount = "Marketing Expense";
        creditAccount = "Cash - Operating";
        category = "Expense";
        transactionType = "Expense";
      } else {
        // Default to operating expense
        debitAccount = "Operating Expenses";
        creditAccount = "Cash - Operating";
        category = "Expense";
        transactionType = "Expense";
      }

      const entry = {
        entryId: `JE${String(index + 1).padStart(3, '0')}`,
        date: transaction.date || new Date().toISOString().split('T')[0],
        description: description,
        reference: transaction.reference || `REF-${index + 1}`,
        debits: [{ account: debitAccount, amount: amount }],
        credits: [{ account: creditAccount, amount: amount }],
        totalDebits: amount,
        totalCredits: amount,
        isBalanced: true,
        category: category,
        transactionType: transactionType
      };
      
      fallbackEntries.push(entry);
    });

    return {
      businessProfile: {
        businessName: businessInfo.companyName || 'Professional Services',
        industry: businessInfo.industry || 'General',
        accountingMethod: 'Accrual'
      },
      chartOfAccounts: {
        assets: [
          { code: "1000", name: "Cash - Operating", type: "Current Asset" },
          { code: "1100", name: "Accounts Receivable", type: "Current Asset" },
          { code: "1500", name: "Equipment", type: "Fixed Asset" }
        ],
        liabilities: [
          { code: "2000", name: "Accounts Payable", type: "Current Liability" },
          { code: "2100", name: "Credit Cards", type: "Current Liability" },
          { code: "2500", name: "Loans Payable", type: "Long-term Liability" }
        ],
        equity: [
          { code: "3000", name: "Owner's Equity", type: "Owner's Equity" },
          { code: "3100", name: "Retained Earnings", type: "Retained Earnings" }
        ],
        revenue: [
          { code: "4000", name: "Service Revenue", type: "Operating Revenue" },
          { code: "4100", name: "Product Sales", type: "Operating Revenue" },
          { code: "4900", name: "Other Income", type: "Other Revenue" }
        ],
        expenses: [
          { code: "5000", name: "Operating Expenses", type: "Operating Expense" },
          { code: "5100", name: "Rent Expense", type: "Operating Expense" },
          { code: "5200", name: "Utilities Expense", type: "Operating Expense" },
          { code: "5300", name: "Software Expense", type: "Operating Expense" },
          { code: "5400", name: "Marketing Expense", type: "Operating Expense" },
          { code: "5900", name: "Professional Fees", type: "Operating Expense" }
        ]
      },
      journalEntries: fallbackEntries,
      summary: {
        totalTransactions: fallbackEntries.length,
        totalDebits: fallbackEntries.reduce((sum, entry) => sum + entry.totalDebits, 0),
        totalCredits: fallbackEntries.reduce((sum, entry) => sum + entry.totalCredits, 0),
        isBalanced: true,
        categories: {
          revenue: fallbackEntries.filter(e => e.category === 'Revenue').reduce((sum, e) => sum + e.totalCredits, 0),
          expenses: fallbackEntries.filter(e => e.category === 'Expense').reduce((sum, e) => sum + e.totalDebits, 0)
        }
      },
      professionalRecommendations: [
        "Review and verify all categorizations for accuracy",
        "Consider setting up recurring transaction rules",
        "Ensure proper documentation for audit trails"
      ]
    };
  }
}

module.exports = new DedicatedBookkeepingAI();