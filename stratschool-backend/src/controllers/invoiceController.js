const Invoice = require('../models/Invoice');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
const createInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      invoiceDate,
      dueDate,
      companyName,
      companyAddress,
      companyCity,
      companyZip,
      companyPhone,
      companyEmail,
      clientName,
      clientCompany,
      clientAddress,
      clientCity,
      clientZip,
      clientPhone,
      clientEmail,
      items,
      subtotal,
      taxRate,
      taxAmount,
      discountRate,
      discountAmount,
      total,
      notes,
      terms
    } = req.body;

    // Validate required fields
    if (!invoiceNumber || !clientName || !clientEmail || !dueDate || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if invoice number already exists for this user
    const existingInvoice = await Invoice.findOne({ 
      userId: req.user.id, 
      invoiceNumber 
    });

    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number already exists'
      });
    }

    // Create invoice
    const invoice = await Invoice.create({
      userId: req.user.id,
      invoiceNumber,
      invoiceDate,
      dueDate,
      companyName,
      companyAddress,
      companyCity,
      companyZip,
      companyPhone,
      companyEmail,
      clientName,
      clientCompany,
      clientAddress,
      clientCity,
      clientZip,
      clientPhone,
      clientEmail,
      items,
      subtotal,
      taxRate,
      taxAmount,
      discountRate,
      discountAmount,
      total,
      notes,
      terms
    });

    // Generate PDF
    const pdfPath = await generateInvoicePDF(invoice);
    invoice.pdfPath = pdfPath;
    await invoice.save();

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created successfully'
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating invoice'
    });
  }
};

// @desc    Get all invoices for user
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    const query = { userId: req.user.id };
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { clientEmail: { $regex: search, $options: 'i' } },
        { clientCompany: { $regex: search, $options: 'i' } }
      ];
    }

    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'firstName lastName email');

    const total = await Invoice.countDocuments(query);

    res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching invoices'
    });
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('userId', 'firstName lastName email');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching invoice'
    });
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Don't allow updates to paid invoices
    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update paid invoices'
      });
    }

    // Update invoice
    Object.assign(invoice, req.body);
    await invoice.save();

    // Regenerate PDF if invoice content changed
    if (req.body.items || req.body.total || req.body.clientName) {
      const pdfPath = await generateInvoicePDF(invoice);
      invoice.pdfPath = pdfPath;
      await invoice.save();
    }

    res.status(200).json({
      success: true,
      data: invoice,
      message: 'Invoice updated successfully'
    });

  } catch (error) {
    console.error('Update invoice error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating invoice'
    });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Don't allow deletion of paid invoices
    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete paid invoices'
      });
    }

    // Delete PDF file if exists
    if (invoice.pdfPath && fs.existsSync(invoice.pdfPath)) {
      fs.unlinkSync(invoice.pdfPath);
    }

    await invoice.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully'
    });

  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting invoice'
    });
  }
};

// @desc    Download invoice PDF
// @route   GET /api/invoices/:id/download
// @access  Private
const downloadInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    let pdfPath = invoice.pdfPath;

    // Generate PDF if it doesn't exist
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      pdfPath = await generateInvoicePDF(invoice);
      invoice.pdfPath = pdfPath;
      await invoice.save();
    }

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`);

    // Stream the PDF file
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error downloading PDF'
    });
  }
};

// @desc    Mark invoice as paid
// @route   PUT /api/invoices/:id/pay
// @access  Private
const markInvoiceAsPaid = async (req, res) => {
  try {
    const { amount, paidDate } = req.body;
    
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    await invoice.markAsPaid(amount, paidDate);

    res.status(200).json({
      success: true,
      data: invoice,
      message: 'Invoice marked as paid successfully'
    });

  } catch (error) {
    console.error('Mark as paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking invoice as paid'
    });
  }
};

// @desc    Generate next invoice number
// @route   GET /api/invoices/next-number
// @access  Private
const getNextInvoiceNumber = async (req, res) => {
  try {
    const nextNumber = await Invoice.generateInvoiceNumber(req.user.id);
    
    res.status(200).json({
      success: true,
      data: { invoiceNumber: nextNumber }
    });

  } catch (error) {
    console.error('Get next invoice number error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating invoice number'
    });
  }
};

// Helper function to generate invoice PDF
const generateInvoicePDF = async (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '../../uploads/invoices');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `invoice-${invoice.invoiceNumber}-${Date.now()}.pdf`;
      const filePath = path.join(uploadsDir, fileName);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('INVOICE', 50, 50);
      
      // Company Info
      doc.fontSize(12)
         .text(invoice.companyName, 50, 100)
         .text(invoice.companyAddress, 50, 115)
         .text(`${invoice.companyCity}, ${invoice.companyZip}`, 50, 130)
         .text(invoice.companyPhone, 50, 145)
         .text(invoice.companyEmail, 50, 160);

      // Invoice Info
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, 400, 100)
         .text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, 400, 115)
         .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 400, 130);

      // Bill To
      doc.fontSize(14).text('Bill To:', 50, 200);
      doc.fontSize(12)
         .text(invoice.clientName, 50, 220)
         .text(invoice.clientCompany, 50, 235)
         .text(invoice.clientAddress, 50, 250)
         .text(`${invoice.clientCity}, ${invoice.clientZip}`, 50, 265)
         .text(invoice.clientEmail, 50, 280);

      // Items Table
      let y = 320;
      doc.fontSize(12).text('Description', 50, y)
         .text('Qty', 300, y)
         .text('Rate', 350, y)
         .text('Amount', 450, y);

      y += 20;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 10;

      invoice.items.forEach(item => {
        doc.text(item.description, 50, y)
           .text(item.quantity.toString(), 300, y)
           .text(`$${item.rate.toFixed(2)}`, 350, y)
           .text(`$${item.amount.toFixed(2)}`, 450, y);
        y += 20;
      });

      // Totals
      y += 20;
      doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, 400, y);
      y += 15;
      
      if (invoice.discountAmount > 0) {
        doc.text(`Discount (${invoice.discountRate}%): -$${invoice.discountAmount.toFixed(2)}`, 400, y);
        y += 15;
      }
      
      if (invoice.taxAmount > 0) {
        doc.text(`Tax (${invoice.taxRate}%): $${invoice.taxAmount.toFixed(2)}`, 400, y);
        y += 15;
      }
      
      doc.fontSize(14).text(`Total: $${invoice.total.toFixed(2)}`, 400, y);

      // Notes and Terms
      if (invoice.notes) {
        y += 40;
        doc.fontSize(12).text('Notes:', 50, y);
        doc.text(invoice.notes, 50, y + 15);
      }

      if (invoice.terms) {
        y += 60;
        doc.fontSize(12).text('Terms & Conditions:', 50, y);
        doc.text(invoice.terms, 50, y + 15);
      }

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  downloadInvoicePDF,
  markInvoiceAsPaid,
  getNextInvoiceNumber
};