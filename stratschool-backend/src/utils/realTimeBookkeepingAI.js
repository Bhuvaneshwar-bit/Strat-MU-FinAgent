/**
 * SIMPLE REAL-TIME BOOKKEEPING AI
 * Direct AI analysis without fallbacks - REAL DATA ONLY
 */

const axios = require('axios');

class RealTimeBookkeepingAI {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseURL = 'https://api.groq.com/openai/v1/chat/completions';
    console.log('🚀 Real-Time Bookkeeping AI initialized - NO FALLBACKS');
  }

  async analyzeTransactions(transactions, businessInfo = {}) {
    console.log('🎯 Real-time AI analysis starting...');
    
    // Create simple transaction list for AI
    const transactionList = transactions.map((t, i) => 
      `${i+1}. ${t.date}: ${t.description} - $${t.amount}`
    ).join('\n');

    // Generate unique timestamp for entry IDs
    const timestamp = Date.now().toString().slice(-6);

    const prompt = `Analyze these bank transactions and create journal entries. Return ONLY JSON:

TRANSACTIONS:
${transactionList}

Create journal entries with proper accounting:
- Client payments = Cash debit, Revenue credit
- Rent = Rent Expense debit, Cash credit  
- Software = Software Expense debit, Cash credit
- Equipment = Equipment debit, Cash credit
- Utilities = Utilities Expense debit, Cash credit
- Marketing = Marketing Expense debit, Cash credit

Use entry IDs: JE${timestamp}001, JE${timestamp}002, etc.

Return JSON with this exact structure:
{
  "journalEntries": [
    {
      "entryId": "JE${timestamp}001",
      "date": "2024-02-01", 
      "description": "Client Payment - PQR Corp",
      "reference": "TXN-${timestamp}001",
      "debits": [{"accountCode": "1000", "accountName": "Cash - Operating", "amount": 4000.00, "description": "Cash received"}],
      "credits": [{"accountCode": "4000", "accountName": "Service Revenue", "amount": 4000.00, "description": "Revenue earned"}],
      "totalDebits": 4000.00,
      "totalCredits": 4000.00,
      "isBalanced": true,
      "category": "Revenue"
    }
  ]
}`;

    try {
      const response = await axios.post(this.baseURL, {
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant', // Use faster model
        temperature: 0.1,
        max_tokens: 8000  // Increased for large datasets
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const aiResponse = response.data.choices[0]?.message?.content;
      console.log('🤖 AI Response:', aiResponse?.substring(0, 200) + '...');
      
      // Parse the JSON response
      const parsed = this.parseAIResponse(aiResponse);
      
      // Add business profile and chart of accounts
      const result = {
        businessProfile: {
          businessName: businessInfo.companyName || 'StratSchool',
          industry: businessInfo.industry || 'Technology',
          accountingMethod: 'Accrual'
        },
        chartOfAccounts: this.getStandardChartOfAccounts(),
        journalEntries: parsed.journalEntries || [],
        summary: this.calculateSummary(parsed.journalEntries || []),
        professionalRecommendations: [
          "All transactions processed with real-time AI analysis",
          "Double-entry bookkeeping principles applied",
          "Professional categorization completed"
        ]
      };

      console.log('✅ Real-time AI analysis completed!');
      console.log(`📊 Created ${result.journalEntries.length} journal entries`);
      
      return result;

    } catch (aiError) {
      console.error('❌ AI Analysis failed completely:', aiError.message);
      throw new Error('Real-time AI analysis failed - no fallback available');
    }
  }

  parseAIResponse(aiResponse) {
    try {
      // Clean the response
      let cleaned = aiResponse.trim();
      
      // Remove markdown if present
      cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Find JSON boundaries
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}') + 1;
      
      if (start !== -1 && end > start) {
        cleaned = cleaned.substring(start, end);
      }

      return JSON.parse(cleaned);
      
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      throw new Error('Unable to parse AI response - real-time analysis failed');
    }
  }

  getStandardChartOfAccounts() {
    return {
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
    };
  }

  calculateSummary(journalEntries) {
    const totalDebits = journalEntries.reduce((sum, entry) => sum + (entry.totalDebits || 0), 0);
    const totalCredits = journalEntries.reduce((sum, entry) => sum + (entry.totalCredits || 0), 0);
    
    return {
      totalTransactions: journalEntries.length,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      categories: {
        revenue: journalEntries.filter(e => e.category === 'Revenue').reduce((sum, e) => sum + e.totalCredits, 0),
        expenses: journalEntries.filter(e => e.category === 'Expense').reduce((sum, e) => sum + e.totalDebits, 0),
        assets: journalEntries.filter(e => e.category === 'Asset').reduce((sum, e) => sum + e.totalDebits, 0)
      }
    };
  }
}

module.exports = new RealTimeBookkeepingAI();