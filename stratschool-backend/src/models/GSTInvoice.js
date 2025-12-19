const mongoose = require('mongoose');

// GST Invoice Item Schema
const GSTInvoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Item description is required'],
    trim: true
  },
  hsnSac: {
    type: String,
    required: [true, 'HSN/SAC code is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity must be positive']
  },
  unit: {
    type: String,
    default: 'Nos',
    enum: ['Nos', 'Pcs', 'Kg', 'Ltr', 'Mtr', 'Hrs', 'Days', 'Box', 'Set']
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate must be positive']
  },
  taxableValue: {
    type: Number,
    required: true
  },
  gstRate: {
    type: Number,
    required: true,
    enum: [0, 5, 12, 18, 28]
  },
  cgstRate: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstRate: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  totalAmount: {
    type: Number,
    required: true
  }
});

// Main GST Invoice Schema
const GSTInvoiceSchema = new mongoose.Schema({
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
    trim: true
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
  
  // Supplier Details (From)
  supplierName: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true
  },
  supplierGSTIN: {
    type: String,
    required: [true, 'Supplier GSTIN is required'],
    trim: true,
    uppercase: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format']
  },
  supplierPAN: {
    type: String,
    trim: true,
    uppercase: true
  },
  supplierAddress: { type: String, trim: true },
  supplierCity: { type: String, trim: true },
  supplierState: {
    type: String,
    required: [true, 'Supplier state is required']
  },
  supplierPincode: { type: String, trim: true },
  supplierPhone: { type: String, trim: true },
  supplierEmail: { type: String, trim: true, lowercase: true },
  
  // Buyer Details (To)
  buyerName: {
    type: String,
    required: [true, 'Buyer name is required'],
    trim: true
  },
  buyerGSTIN: {
    type: String,
    trim: true,
    uppercase: true
  },
  buyerAddress: { type: String, trim: true },
  buyerCity: { type: String, trim: true },
  buyerState: { type: String },
  buyerPincode: { type: String, trim: true },
  buyerPhone: { type: String, trim: true },
  buyerEmail: { type: String, trim: true, lowercase: true },
  
  // Place of Supply
  placeOfSupply: {
    type: String,
    required: [true, 'Place of supply is required']
  },
  
  // Supply Type
  supplyType: {
    type: String,
    enum: ['intra-state', 'inter-state'],
    required: true
  },
  
  // Reverse Charge
  reverseCharge: {
    type: Boolean,
    default: false
  },
  
  // Invoice Items
  items: {
    type: [GSTInvoiceItemSchema],
    required: [true, 'At least one item is required'],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Invoice must have at least one item'
    }
  },
  
  // Invoice Totals
  totalTaxableValue: {
    type: Number,
    required: true,
    min: 0
  },
  totalCGST: { type: Number, default: 0 },
  totalSGST: { type: Number, default: 0 },
  totalIGST: { type: Number, default: 0 },
  totalTax: {
    type: Number,
    required: true,
    min: 0
  },
  grandTotal: {
    type: Number,
    required: true,
    min: 0
  },
  amountInWords: {
    type: String,
    required: true
  },
  
  // Bank Details
  bankName: { type: String, trim: true },
  accountNumber: { type: String, trim: true },
  ifscCode: { type: String, trim: true, uppercase: true },
  branchName: { type: String, trim: true },
  
  // Additional Information
  notes: { type: String, trim: true },
  terms: {
    type: String,
    trim: true,
    default: 'Payment is due within 30 days from the date of invoice. Late payments may attract interest at 18% per annum.'
  },
  
  // Invoice Status
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'sent'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
GSTInvoiceSchema.index({ userId: 1, createdAt: -1 });
GSTInvoiceSchema.index({ invoiceNumber: 1, userId: 1 });
GSTInvoiceSchema.index({ buyerName: 1 });
GSTInvoiceSchema.index({ status: 1 });

// Virtual for overdue status
GSTInvoiceSchema.virtual('isOverdue').get(function() {
  return this.status !== 'paid' && new Date() > new Date(this.dueDate);
});

// Pre-save middleware
GSTInvoiceSchema.pre('save', function(next) {
  // Set supply type based on supplier state and place of supply
  this.supplyType = this.supplierState !== this.placeOfSupply ? 'inter-state' : 'intra-state';
  next();
});

// Static method to generate next invoice number
GSTInvoiceSchema.statics.generateInvoiceNumber = async function(userId) {
  const currentFY = getFinancialYear();
  const lastInvoice = await this.findOne({ 
    userId,
    invoiceNumber: { $regex: `^INV/${currentFY}/` }
  }).sort({ createdAt: -1 }).select('invoiceNumber');
  
  if (!lastInvoice) {
    return `INV/${currentFY}/001`;
  }
  
  const parts = lastInvoice.invoiceNumber.split('/');
  const lastNumber = parseInt(parts[2]) || 0;
  const nextNumber = lastNumber + 1;
  return `INV/${currentFY}/${nextNumber.toString().padStart(3, '0')}`;
};

// Helper function to get current financial year
function getFinancialYear() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  // Financial year starts from April
  if (month >= 3) { // April onwards
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

module.exports = mongoose.model('GSTInvoice', GSTInvoiceSchema);
