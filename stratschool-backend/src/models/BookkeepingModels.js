const mongoose = require('mongoose');

/**
 * PROFESSIONAL BOOKKEEPING SCHEMA
 * Designed for Elite Chartered Accountant AI with full audit trail
 * Production-ready with compliance and accuracy features
 */

// Chart of Accounts Schema
const ChartOfAccountsSchema = new mongoose.Schema({
  businessId: {
    type: String,
    required: true,
    index: true
  },
  accounts: {
    assets: [{
      code: { type: String, required: true },
      name: { type: String, required: true },
      type: { type: String, required: true }, // Current Asset, Fixed Asset, etc.
      balance: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true }
    }],
    liabilities: [{
      code: { type: String, required: true },
      name: { type: String, required: true },
      type: { type: String, required: true }, // Current Liability, Long-term Liability
      balance: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true }
    }],
    equity: [{
      code: { type: String, required: true },
      name: { type: String, required: true },
      type: { type: String, required: true }, // Owner's Equity, Retained Earnings
      balance: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true }
    }],
    revenue: [{
      code: { type: String, required: true },
      name: { type: String, required: true },
      type: { type: String, required: true }, // Operating Revenue, Other Revenue
      balance: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true }
    }],
    expenses: [{
      code: { type: String, required: true },
      name: { type: String, required: true },
      type: { type: String, required: true }, // Operating Expense, Other Expense
      balance: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true }
    }]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Journal Entry Schema (Double-Entry Bookkeeping)
const JournalEntrySchema = new mongoose.Schema({
  businessId: {
    type: String,
    required: true,
    index: true
  },
  entryId: {
    type: String,
    required: true,
    unique: true
  },
  entryDate: {
    type: Date,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  reference: {
    type: String, // Document reference, transaction ID, etc.
    required: true
  },
  sourceDocument: {
    fileName: String,
    documentType: String, // bank_statement, invoice, receipt
    uploadedAt: Date
  },
  debits: [{
    accountCode: { type: String, required: true },
    accountName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    description: String
  }],
  credits: [{
    accountCode: { type: String, required: true },
    accountName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    description: String
  }],
  totalDebits: {
    type: Number,
    required: true,
    validate: {
      validator: function() {
        const calculated = this.debits.reduce((sum, debit) => sum + debit.amount, 0);
        return Math.abs(calculated - this.totalDebits) < 0.01; // Penny precision
      },
      message: 'Total debits must equal sum of debit entries'
    }
  },
  totalCredits: {
    type: Number,
    required: true,
    validate: {
      validator: function() {
        const calculated = this.credits.reduce((sum, credit) => sum + credit.amount, 0);
        return Math.abs(calculated - this.totalCredits) < 0.01; // Penny precision
      },
      message: 'Total credits must equal sum of credit entries'
    }
  },
  isBalanced: {
    type: Boolean,
    required: true,
    validate: {
      validator: function() {
        return Math.abs(this.totalDebits - this.totalCredits) < 0.01;
      },
      message: 'Journal entry must be balanced (debits = credits)'
    }
  },
  auditTrail: {
    createdBy: { type: String, default: 'Elite Bookkeeping AI' },
    createdAt: { type: Date, default: Date.now },
    modifiedBy: String,
    modifiedAt: Date,
    reviewStatus: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected', 'flagged'], 
      default: 'pending' 
    },
    reviewNotes: String
  },
  tags: [String], // For categorization and searching
  isPosted: { type: Boolean, default: true },
  fiscalPeriod: String, // e.g., "2025-Q1", "2025-01"
  aiConfidence: { type: Number, min: 0, max: 1 }, // AI confidence score
  requiresReview: { type: Boolean, default: false }
});

// Business Profile Schema
const BusinessProfileSchema = new mongoose.Schema({
  businessId: {
    type: String,
    required: true,
    unique: true
  },
  businessName: {
    type: String,
    required: true
  },
  industry: {
    type: String,
    required: true
  },
  accountingMethod: {
    type: String,
    enum: ['cash', 'accrual'],
    default: 'accrual'
  },
  fiscalYearStart: {
    type: Number, // Month (1-12)
    default: 1 // January
  },
  currency: {
    type: String,
    default: 'USD'
  },
  taxSettings: {
    taxId: String,
    taxRate: Number,
    taxCategories: [String]
  },
  preferences: {
    autoApproveUnder: { type: Number, default: 100 }, // Auto-approve entries under this amount
    requireReviewOver: { type: Number, default: 10000 }, // Require manual review over this amount
    duplicateThreshold: { type: Number, default: 0.95 } // Duplicate detection threshold
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Document Processing Log Schema
const DocumentProcessingLogSchema = new mongoose.Schema({
  businessId: {
    type: String,
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: Number,
  mimeType: String,
  documentType: {
    type: String,
    enum: ['bank_statement', 'invoice', 'receipt', 'expense_report', 'other'],
    required: true
  },
  processingStatus: {
    type: String,
    enum: ['processing', 'completed', 'failed', 'requires_review'],
    default: 'processing'
  },
  extractedData: {
    totalTransactions: Number,
    totalAmount: Number,
    dateRange: {
      start: Date,
      end: Date
    },
    categories: [String]
  },
  journalEntriesCreated: [{
    entryId: String,
    amount: Number,
    status: String
  }],
  processingErrors: [String],
  processingWarnings: [String],
  aiAnalysis: {
    confidence: Number,
    recommendations: [String],
    flaggedItems: [String]
  },
  auditTrail: {
    uploadedAt: { type: Date, default: Date.now },
    processedAt: Date,
    completedAt: Date,
    processedBy: { type: String, default: 'Elite Bookkeeping AI' },
    reviewedBy: String,
    reviewedAt: Date
  }
});

// Financial Reports Cache Schema
const FinancialReportSchema = new mongoose.Schema({
  businessId: {
    type: String,
    required: true,
    index: true
  },
  reportType: {
    type: String,
    enum: ['trial_balance', 'income_statement', 'balance_sheet', 'cash_flow'],
    required: true
  },
  period: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    fiscalPeriod: String
  },
  reportData: mongoose.Schema.Types.Mixed, // Flexible JSON structure for reports
  generatedAt: { type: Date, default: Date.now },
  generatedBy: { type: String, default: 'Elite Bookkeeping AI' },
  isValid: { type: Boolean, default: true },
  cacheExpiry: Date
});

// Create indexes for performance
ChartOfAccountsSchema.index({ businessId: 1 });
JournalEntrySchema.index({ businessId: 1, entryDate: -1 });
JournalEntrySchema.index({ businessId: 1, entryId: 1 });
BusinessProfileSchema.index({ businessId: 1 });
DocumentProcessingLogSchema.index({ businessId: 1, 'auditTrail.uploadedAt': -1 });
FinancialReportSchema.index({ businessId: 1, reportType: 1, 'period.end': -1 });

// Create models
const ChartOfAccounts = mongoose.model('ChartOfAccounts', ChartOfAccountsSchema);
const JournalEntry = mongoose.model('JournalEntry', JournalEntrySchema);
const BusinessProfile = mongoose.model('BusinessProfile', BusinessProfileSchema);
const DocumentProcessingLog = mongoose.model('DocumentProcessingLog', DocumentProcessingLogSchema);
const FinancialReport = mongoose.model('FinancialReport', FinancialReportSchema);

module.exports = {
  ChartOfAccounts,
  JournalEntry,
  BusinessProfile,
  DocumentProcessingLog,
  FinancialReport
};