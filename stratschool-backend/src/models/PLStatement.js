const mongoose = require('mongoose');

// AGENTIC AI-OPTIMIZED P&L STATEMENT SCHEMA
// Designed for surgical precision with Gemini AI integration
const PLStatementSchema = new mongoose.Schema({
  userId: {
    type: String, // Flexible for any user ID format
    required: true,
    index: true
  },
  
  period: {
    type: String,
    required: true,
    enum: ['Weekly', 'Monthly', 'Yearly']
  },

  // RAW BANK STATEMENT DATA STORAGE
  rawBankData: {
    fileName: String,
    fileSize: Number,
    uploadDate: { type: Date, default: Date.now },
    extractedText: String, // Full extracted text for re-analysis
    transactionCount: { type: Number, default: 0 }
  },

  // GEMINI AI ANALYSIS RESULTS (Exact structure match)
  analysis: {
    period: String,
    totalRevenue: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    netIncome: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 }
  },

  // REVENUE BREAKDOWN (Dynamic categorization)
  revenue: [{
    category: String,
    amount: { type: Number, default: 0 },
    transactions: [mongoose.Schema.Types.Mixed] // Individual transaction details
  }],

  // EXPENSE BREAKDOWN (Dynamic categorization)  
  expenses: [{
    category: String,
    amount: { type: Number, default: 0 },
    transactions: [mongoose.Schema.Types.Mixed] // Individual transaction details
  }],

  // PROFIT & LOSS STATEMENT (Matches Gemini output exactly)
  profitLossStatement: {
    revenue: {
      totalRevenue: { type: Number, default: 0 },
      breakdown: mongoose.Schema.Types.Mixed, // Flexible for any revenue structure
      revenueStreams: [{ // For frontend compatibility
        name: String,
        category: String,
        amount: { type: Number, default: 0 }
      }]
    },
    expenses: {
      totalExpenses: { type: Number, default: 0 },
      breakdown: mongoose.Schema.Types.Mixed, // Flexible for any expense structure
      expenseCategories: [{ // For frontend compatibility
        name: String,
        category: String,
        amount: { type: Number, default: 0 }
      }]
    },
    profitability: {
      netIncome: { type: Number, default: 0 },
      grossProfit: { type: Number, default: 0 },
      profitMargin: { type: Number, default: 0 },
      netProfitMargin: { type: Number, default: 0 }
    }
  },

  // AI INSIGHTS AND RECOMMENDATIONS
  insights: [String], // Simple array of insight strings
  
  recommendations: [String], // AI-generated recommendations

  // EXECUTIVE SUMMARY
  executiveSummary: String,

  // METADATA FOR TRACKING
  metadata: {
    fileName: String,
    fileSize: Number,
    analysisType: { type: String, default: 'Gemini-AI-Powered' },
    aiModel: { type: String, default: 'gemini-1.5-flash' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },

  // PROCESSING STATUS
  status: {
    type: String,
    required: true,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },

  // RAW AI RESPONSE (For debugging and re-processing)
  rawAnalysis: mongoose.Schema.Types.Mixed

}, {
  timestamps: true,
  collection: 'plstatements' // Explicit collection name
});

// INDEXES FOR PERFORMANCE
PLStatementSchema.index({ userId: 1, 'metadata.createdAt': -1 });
PLStatementSchema.index({ userId: 1, period: 1 });
PLStatementSchema.index({ status: 1 });

// METHODS FOR AGENTIC WORKFLOW
PLStatementSchema.methods.updateFromGeminiAnalysis = function(geminiData) {
  // Update with surgical precision
  this.analysis = geminiData.analysis || {};
  this.revenue = geminiData.revenue || [];
  this.expenses = geminiData.expenses || [];
  this.profitLossStatement = geminiData.profitLossStatement || {};
  this.insights = geminiData.insights || [];
  this.rawAnalysis = geminiData;
  this.status = 'completed';
  this.metadata.updatedAt = new Date();
  return this.save();
};

// STATIC METHODS FOR RETRIEVAL
PLStatementSchema.statics.getLatestByUser = function(userId) {
  return this.findOne({ userId })
    .sort({ 'metadata.createdAt': -1 })
    .exec();
};

PLStatementSchema.statics.getByPeriod = function(userId, period) {
  return this.find({ userId, period })
    .sort({ 'metadata.createdAt': -1 })
    .exec();
};

module.exports = mongoose.model('PLStatement', PLStatementSchema);