const advancedDocumentParser = require('./stratschool-backend/src/utils/advancedDocumentParser');
const geminiAI = require('./stratschool-backend/src/utils/geminiAI');
const realTimeBookkeepingAI = require('./stratschool-backend/src/utils/realTimeBookkeepingAI');

function setupMocks() {
  advancedDocumentParser.parsePDF = async (fileBuffer, password = null) => {
    if (password === 'testpassword') {
      return {
        format: 'pdf',
        extractedText: 'This is a mocked response for a password-protected PDF.',
        transactions: [{
          date: '2024-01-01',
          description: 'Mock transaction',
          amount: 100,
          type: 'credit'
        }],
        totalCount: 1,
        summary: {
          totalTransactions: 1,
          totalDebits: 0,
          totalCredits: 100,
          netAmount: 100,
        },
        isPasswordProtected: true,
        processingMethod: 'mock',
        requiresPassword: false
      };
    }
  };

  geminiAI.analyzeBankStatementFromText = async (extractedText, fileName, period) => {
    if (extractedText === 'This is a mocked response for a password-protected PDF.') {
      return {
        analysis: {
          period: period,
          totalRevenue: 100,
          totalExpenses: 0,
          netIncome: 100,
          transactionCount: 1
        },
        revenue: [{
          category: "Mock Revenue",
          amount: 100,
          transactions: ["Mock transaction details"]
        }],
        expenses: [],
        insights: ["This is a mock insight."],
        profitLossStatement: {
          revenue: {
            totalRevenue: 100,
            breakdown: { "mockSales": 100 },
            revenueStreams: [{ "name": "Mock Sales", "category": "Sales", "amount": 100 }]
          },
          expenses: {
            totalExpenses: 0,
            breakdown: {},
            expenseCategories: []
          },
          profitability: {
            netIncome: 100,
            grossProfit: 100,
            profitMargin: 100,
            netProfitMargin: 100
          }
        }
      };
    }
  };

  realTimeBookkeepingAI.analyzeTransactions = async (transactions, businessInfo = {}) => {
    return {
      businessProfile: {
        businessName: 'Mock Business',
        industry: 'Testing',
        accountingMethod: 'Accrual'
      },
      chartOfAccounts: realTimeBookkeepingAI.getStandardChartOfAccounts(),
      journalEntries: [{
        entryId: 'JE123456',
        date: '2024-01-01',
        description: 'Mock Entry',
        reference: 'TXN-123456',
        debits: [{ accountCode: "1000", accountName: "Cash", amount: 100 }],
        credits: [{ accountCode: "4000", accountName: "Revenue", amount: 100 }],
        totalDebits: 100,
        totalCredits: 100,
        isBalanced: true,
        category: 'Revenue'
      }],
      summary: {
        totalTransactions: 1,
        totalDebits: 100,
        totalCredits: 100,
        isBalanced: true,
        categories: { revenue: 100, expenses: 0, assets: 100 }
      },
      professionalRecommendations: ["Mock recommendation"]
    };
  };
}

module.exports = {
  setupMocks,
};
