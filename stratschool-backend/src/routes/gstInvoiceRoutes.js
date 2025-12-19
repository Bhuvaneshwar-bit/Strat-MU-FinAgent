const express = require('express');
const GSTInvoice = require('../models/GSTInvoice');
const authenticate = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authenticate);

// @route   GET /api/gst-invoices/next-number
// @desc    Get next invoice number for GST invoice
// @access  Private
router.get('/next-number', async (req, res) => {
  try {
    const nextNumber = await GSTInvoice.generateInvoiceNumber(req.user.userId);
    res.json({ success: true, invoiceNumber: nextNumber });
  } catch (error) {
    console.error('Error generating invoice number:', error);
    res.status(500).json({ success: false, error: 'Failed to generate invoice number' });
  }
});

// @route   GET /api/gst-invoices
// @desc    Get all GST invoices for user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query
    const query = { userId: req.user.userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { buyerName: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get total count
    const total = await GSTInvoice.countDocuments(query);
    
    // Get paginated results
    const invoices = await GSTInvoice.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('invoiceNumber invoiceDate dueDate buyerName grandTotal status supplyType createdAt');
    
    res.json({
      success: true,
      invoices,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching GST invoices:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

// @route   POST /api/gst-invoices
// @desc    Create new GST invoice
// @access  Private
router.post('/', async (req, res) => {
  try {
    const invoiceData = {
      ...req.body,
      userId: req.user.userId
    };
    
    const invoice = new GSTInvoice(invoiceData);
    await invoice.save();
    
    res.status(201).json({
      success: true,
      message: 'GST Invoice created successfully',
      invoice
    });
  } catch (error) {
    console.error('Error creating GST invoice:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, error: errors.join(', ') });
    }
    
    res.status(500).json({ success: false, error: 'Failed to create invoice' });
  }
});

// @route   GET /api/gst-invoices/:id
// @desc    Get single GST invoice
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const invoice = await GSTInvoice.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Error fetching GST invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoice' });
  }
});

// @route   PUT /api/gst-invoices/:id
// @desc    Update GST invoice
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const invoice = await GSTInvoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    res.json({ success: true, message: 'Invoice updated successfully', invoice });
  } catch (error) {
    console.error('Error updating GST invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to update invoice' });
  }
});

// @route   DELETE /api/gst-invoices/:id
// @desc    Delete GST invoice
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await GSTInvoice.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting GST invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to delete invoice' });
  }
});

// @route   PUT /api/gst-invoices/:id/status
// @desc    Update invoice status
// @access  Private
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    
    const invoice = await GSTInvoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { status } },
      { new: true }
    );
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    res.json({ success: true, message: 'Invoice status updated', invoice });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// @route   GET /api/gst-invoices/stats/summary
// @desc    Get invoice statistics
// @access  Private
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await GSTInvoice.aggregate([
      { $match: { userId: req.user.userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$grandTotal' }
        }
      }
    ]);
    
    const totalInvoices = await GSTInvoice.countDocuments({ userId: req.user.userId });
    const totalRevenue = await GSTInvoice.aggregate([
      { $match: { userId: req.user.userId, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    
    res.json({
      success: true,
      stats: {
        byStatus: stats,
        totalInvoices,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
