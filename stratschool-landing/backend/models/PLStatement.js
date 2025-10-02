const mongoose = require('mongoose');

const PLStatementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  period: {
    type: String,
    required: true,
    enum: ['Weekly', 'Monthly', 'Yearly']
  },
  statement: {
    period: String,
    startDate: String,
    endDate: String,
    revenue: {
      totalRevenue: {
        type: Number,
        required: true,
        min: 0
      },
      breakdown: [{
        category: {
          type: String,
          required: true
        },
        amount: {
          type: Number,
          required: true,
          min: 0
        }
      }]
    },
    expenses: {
      totalExpenses: {
        type: Number,
        required: true,
        min: 0
      },
      breakdown: [{
        category: {
          type: String,
          required: true
        },
        amount: {
          type: Number,
          required: true,
          min: 0
        }
      }]
    },
    netProfit: {
      type: Number,
      required: true
    },
    profitMargin: {
      type: Number,
      required: true
    },
    kpis: {
      grossMargin: Number,
      netMargin: Number,
      expenseRatio: Number
    }
  },
  insights: [{
    type: {
      type: String,
      required: true,
      enum: ['positive', 'warning', 'insight', 'action']
    },
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000
    },
    impact: {
      type: String,
      required: true,
      enum: ['high', 'medium', 'low']
    },
    category: {
      type: String,
      default: 'general'
    }
  }],
  metadata: {
    originalFileName: String,
    fileSize: Number,
    fileType: String,
    analysisType: {
      type: String,
      default: 'AI-Generated'
    },
    aiModel: {
      type: String,
      default: 'claude-3.5-sonnet'
    },
    processingTime: Number, // in milliseconds
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 95
    },
    version: {
      type: String,
      default: '1.0'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['processing', 'completed', 'failed', 'archived'],
    default: 'processing'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  notes: {
    type: String,
    maxlength: 2000
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  exportHistory: [{
    format: {
      type: String,
      enum: ['pdf', 'excel', 'csv']
    },
    exportedAt: {
      type: Date,
      default: Date.now
    },
    downloadCount: {
      type: Number,
      default: 1
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
PLStatementSchema.index({ userId: 1, 'metadata.createdAt': -1 });
PLStatementSchema.index({ userId: 1, period: 1 });
PLStatementSchema.index({ status: 1 });
PLStatementSchema.index({ 'metadata.createdAt': -1 });

// Virtual for profit percentage
PLStatementSchema.virtual('profitPercentage').get(function() {
  if (this.statement && this.statement.revenue && this.statement.revenue.totalRevenue > 0) {
    return ((this.statement.netProfit / this.statement.revenue.totalRevenue) * 100).toFixed(2);
  }
  return 0;
});

// Virtual for expense ratio
PLStatementSchema.virtual('expenseRatio').get(function() {
  if (this.statement && this.statement.revenue && this.statement.revenue.totalRevenue > 0) {
    return ((this.statement.expenses.totalExpenses / this.statement.revenue.totalRevenue) * 100).toFixed(2);
  }
  return 0;
});

// Pre-save middleware to update timestamps
PLStatementSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

// Pre-save validation
PLStatementSchema.pre('save', function(next) {
  // Validate that revenue breakdown adds up to total revenue
  if (this.statement && this.statement.revenue) {
    const breakdownTotal = this.statement.revenue.breakdown.reduce((sum, item) => sum + item.amount, 0);
    const totalRevenue = this.statement.revenue.totalRevenue;
    
    // Allow for small rounding differences (within 1%)
    if (Math.abs(breakdownTotal - totalRevenue) > totalRevenue * 0.01) {
      return next(new Error('Revenue breakdown does not match total revenue'));
    }
  }
  
  // Validate that expense breakdown adds up to total expenses
  if (this.statement && this.statement.expenses) {
    const breakdownTotal = this.statement.expenses.breakdown.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = this.statement.expenses.totalExpenses;
    
    // Allow for small rounding differences (within 1%)
    if (Math.abs(breakdownTotal - totalExpenses) > totalExpenses * 0.01) {
      return next(new Error('Expense breakdown does not match total expenses'));
    }
  }
  
  next();
});

// Instance methods
PLStatementSchema.methods.addInsight = function(insight) {
  this.insights.push(insight);
  return this.save();
};

PLStatementSchema.methods.updateStatus = function(status) {
  this.status = status;
  this.metadata.updatedAt = new Date();
  return this.save();
};

PLStatementSchema.methods.addExport = function(format) {
  const existingExport = this.exportHistory.find(exp => exp.format === format);
  
  if (existingExport) {
    existingExport.downloadCount += 1;
    existingExport.exportedAt = new Date();
  } else {
    this.exportHistory.push({
      format,
      exportedAt: new Date(),
      downloadCount: 1
    });
  }
  
  return this.save();
};

// Static methods
PLStatementSchema.statics.findByPeriod = function(userId, period) {
  return this.find({ userId, period }).sort({ 'metadata.createdAt': -1 });
};

PLStatementSchema.statics.getAnalytics = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), status: 'completed' } },
    { $group: {
      _id: null,
      totalStatements: { $sum: 1 },
      avgRevenue: { $avg: '$statement.revenue.totalRevenue' },
      avgProfit: { $avg: '$statement.netProfit' },
      maxRevenue: { $max: '$statement.revenue.totalRevenue' },
      minRevenue: { $min: '$statement.revenue.totalRevenue' }
    }}
  ]);
};

PLStatementSchema.statics.getTrends = function(userId, limit = 12) {
  return this.find({ userId, status: 'completed' })
    .sort({ 'metadata.createdAt': -1 })
    .limit(limit)
    .select('period statement.revenue.totalRevenue statement.netProfit statement.profitMargin metadata.createdAt');
};

module.exports = mongoose.model('PLStatement', PLStatementSchema);