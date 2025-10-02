const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Item description is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity must be positive']
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate must be positive']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  }
});

const InvoiceSchema = new mongoose.Schema({
  // User Association
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  
  // Invoice Header
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    trim: true,
    unique: true
  },
  invoiceDate: {
    type: Date,
    required: [true, 'Invoice date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  
  // Company Details (From)
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  companyAddress: {
    type: String,
    trim: true
  },
  companyCity: {
    type: String,
    trim: true
  },
  companyZip: {
    type: String,
    trim: true
  },
  companyPhone: {
    type: String,
    trim: true
  },
  companyEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  // Client Details (To)
  clientName: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  clientCompany: {
    type: String,
    trim: true
  },
  clientAddress: {
    type: String,
    trim: true
  },
  clientCity: {
    type: String,
    trim: true
  },
  clientZip: {
    type: String,
    trim: true
  },
  clientPhone: {
    type: String,
    trim: true
  },
  clientEmail: {
    type: String,
    required: [true, 'Client email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  // Invoice Items
  items: {
    type: [InvoiceItemSchema],
    required: [true, 'At least one item is required'],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Invoice must have at least one item'
    }
  },
  
  // Invoice Totals
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal must be positive']
  },
  taxRate: {
    type: Number,
    default: 0,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  },
  discountRate: {
    type: Number,
    default: 0,
    min: [0, 'Discount rate cannot be negative'],
    max: [100, 'Discount rate cannot exceed 100%']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
  },
  total: {
    type: Number,
    required: [true, 'Total is required'],
    min: [0, 'Total must be positive']
  },
  
  // Additional Information
  notes: {
    type: String,
    trim: true
  },
  terms: {
    type: String,
    trim: true,
    default: 'Payment due within 30 days of invoice date.'
  },
  
  // Invoice Status
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  
  // Payment Information
  paidDate: {
    type: Date
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  
  // File Information
  pdfPath: {
    type: String,
    trim: true
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
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
InvoiceSchema.index({ userId: 1, createdAt: -1 });
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ clientEmail: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ dueDate: 1 });

// Virtual for outstanding amount
InvoiceSchema.virtual('outstandingAmount').get(function() {
  return this.total - this.paidAmount;
});

// Virtual for days until due
InvoiceSchema.virtual('daysUntilDue').get(function() {
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  const timeDiff = dueDate.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Virtual for overdue status
InvoiceSchema.virtual('isOverdue').get(function() {
  return this.status !== 'paid' && new Date() > new Date(this.dueDate);
});

// Pre-save middleware to update timestamps
InvoiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-save validation for totals
InvoiceSchema.pre('save', function(next) {
  // Validate that calculated totals match
  const calculatedSubtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
  const calculatedDiscountAmount = calculatedSubtotal * (this.discountRate / 100);
  const taxableAmount = calculatedSubtotal - calculatedDiscountAmount;
  const calculatedTaxAmount = taxableAmount * (this.taxRate / 100);
  const calculatedTotal = taxableAmount + calculatedTaxAmount;
  
  // Allow for small floating point differences
  const tolerance = 0.01;
  
  if (Math.abs(this.subtotal - calculatedSubtotal) > tolerance) {
    return next(new Error('Subtotal calculation mismatch'));
  }
  
  if (Math.abs(this.total - calculatedTotal) > tolerance) {
    return next(new Error('Total calculation mismatch'));
  }
  
  next();
});

// Static method to generate next invoice number
InvoiceSchema.statics.generateInvoiceNumber = async function(userId) {
  const lastInvoice = await this.findOne({ userId })
    .sort({ createdAt: -1 })
    .select('invoiceNumber');
    
  if (!lastInvoice) {
    return 'INV-001';
  }
  
  const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1]) || 0;
  const nextNumber = lastNumber + 1;
  return `INV-${nextNumber.toString().padStart(3, '0')}`;
};

// Instance method to mark as paid
InvoiceSchema.methods.markAsPaid = function(amount, paidDate = new Date()) {
  this.status = 'paid';
  this.paidAmount = amount || this.total;
  this.paidDate = paidDate;
  return this.save();
};

// Instance method to send invoice
InvoiceSchema.methods.markAsSent = function() {
  if (this.status === 'draft') {
    this.status = 'sent';
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('Invoice', InvoiceSchema);