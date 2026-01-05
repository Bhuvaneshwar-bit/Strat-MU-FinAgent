const mongoose = require('mongoose');

/**
 * SMART CATEGORY LEARNING SCHEMA
 * Stores user's category preferences for automatic categorization
 * When user manually changes a transaction's category, we learn from it
 */

const CategoryRuleSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // The entity/account name extracted from transaction description
  // e.g., "KAMALAKANNA N J", "Razorpay Software", "DINESH KA"
  entityName: {
    type: String,
    required: true,
    index: true
  },
  
  // Normalized version for matching (lowercase, trimmed)
  entityNameNormalized: {
    type: String,
    required: true,
    index: true
  },
  
  // The category user assigned
  category: {
    type: String,
    required: true
  },
  
  // Type: revenue or expenses
  type: {
    type: String,
    required: true,
    enum: ['revenue', 'expenses']
  },
  
  // How many times this rule has been applied
  timesApplied: {
    type: Number,
    default: 1
  },
  
  // Original transaction that created this rule (for reference)
  sourceTransaction: {
    description: String,
    amount: Number,
    date: Date
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for fast lookup
CategoryRuleSchema.index({ userId: 1, entityNameNormalized: 1 }, { unique: true });

// Static method to find matching rule for a transaction
CategoryRuleSchema.statics.findMatchingRule = async function(userId, description) {
  const normalizedDesc = description.toLowerCase().trim();
  
  // Find all rules for this user
  const rules = await this.find({ userId }).lean();
  
  // Check if any entity name is found in the description
  for (const rule of rules) {
    if (normalizedDesc.includes(rule.entityNameNormalized)) {
      return rule;
    }
  }
  
  return null;
};

// Static method to apply rules to a list of transactions
CategoryRuleSchema.statics.applyRulesToTransactions = async function(userId, transactions) {
  const rules = await this.find({ userId }).lean();
  
  if (!rules.length) return transactions;
  
  return transactions.map(txn => {
    const description = (txn.description || txn.particulars || '').toLowerCase().trim();
    
    for (const rule of rules) {
      if (description.includes(rule.entityNameNormalized)) {
        return {
          ...txn,
          category: {
            type: rule.type,
            category: rule.category
          },
          categorySource: 'user_rule' // Mark that this came from user's saved rule
        };
      }
    }
    
    return txn;
  });
};

// Normalize entity name for consistent matching
CategoryRuleSchema.statics.normalizeEntityName = function(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
};

// Extract entity name from transaction description
CategoryRuleSchema.statics.extractEntityName = function(description) {
  const desc = description.trim();
  
  // Common patterns in Indian bank statements
  const patterns = [
    // UPI patterns: "UPI/P2A/565795231191/DINESH KA/ICICI Ban/UPI/"
    /UPI\/[^\/]+\/[^\/]+\/([^\/]+)\//i,
    // NEFT patterns: "NEFT/IOBAN.../KAMALAKANNA N J/IDBI BANK/..."
    /NEFT\/[^\/]+\/([^\/]+)\//i,
    // IMPS patterns
    /IMPS\/[^\/]+\/([^\/]+)\//i,
    // Direct company names: "Razorpay Software Pvt Ltd Fund"
    /^([A-Za-z][A-Za-z\s]+(?:Pvt|Ltd|Private|Limited|Corp|Inc)?[A-Za-z\s]*)/i,
    // General pattern: Take first significant name
    /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)/
  ];
  
  for (const pattern of patterns) {
    const match = desc.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      // Only return if it's a meaningful name (at least 3 chars)
      if (extracted.length >= 3) {
        return extracted;
      }
    }
  }
  
  // Fallback: Use first 30 chars of description as identifier
  return desc.substring(0, 30).trim();
};

module.exports = mongoose.model('CategoryRule', CategoryRuleSchema);
