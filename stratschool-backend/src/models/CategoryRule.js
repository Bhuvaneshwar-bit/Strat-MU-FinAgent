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
// Goal: Extract the unique identifying part (person/company name) that will match across transactions
CategoryRuleSchema.statics.extractEntityName = function(description) {
  const desc = description.trim();
  
  console.log('🔍 Extracting entity from:', desc);
  
  // Split by / and find the most meaningful segment (typically the name)
  const segments = desc.split('/').map(s => s.trim()).filter(s => s.length > 0);
  
  // For NEFT/UPI/IMPS - the pattern is usually:
  // NEFT/IOBAN.../NAME/BANK/...
  // UPI/P2A/.../NAME/BANK/...
  
  if (segments.length >= 3) {
    // Skip first segment (NEFT/UPI/IMPS) and second (reference number)
    // Look for a segment that looks like a name (not a bank, not a number)
    for (let i = 2; i < segments.length; i++) {
      const segment = segments[i];
      
      // Skip if it's ONLY a bank name (exact match, not part of company name)
      const bankNames = ['icici bank', 'hdfc bank', 'sbi', 'axis bank', 'kotak', 'idbi bank', 'indian overseas bank'];
      const isJustBank = bankNames.some(bank => segment.toLowerCase() === bank || segment.toLowerCase().replace(/\s+/g, ' ').trim() === bank);
      if (isJustBank) {
        continue;
      }
      
      // Skip if it's mostly numbers or a reference
      if (/^\d+$/.test(segment) || /^[A-Z0-9]{10,}$/i.test(segment)) {
        continue;
      }
      
      // Skip if it starts with IOBAN (reference number)
      if (/^IOBAN/i.test(segment)) {
        continue;
      }
      
      // Skip very short segments
      if (segment.length < 3) {
        continue;
      }
      
      // This is likely the name/entity
      console.log('✅ Extracted entity:', segment);
      return segment;
    }
  }
  
  // Fallback: Try regex patterns
  const patterns = [
    // UPI patterns: "UPI/P2A/565795231191/DINESH KA/ICICI Ban/UPI/"
    /UPI\/[^\/]+\/[^\/]+\/([^\/]+)\//i,
    // NEFT patterns: "NEFT/IOBAN.../NAME/BANK/..."
    /NEFT\/[^\/]+\/([^\/]+)\//i,
    // IMPS patterns
    /IMPS\/[^\/]+\/([^\/]+)\//i,
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
