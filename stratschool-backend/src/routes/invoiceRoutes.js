const express = require('express');
const {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  downloadInvoicePDF,
  markInvoiceAsPaid,
  getNextInvoiceNumber
} = require('../controllers/invoiceController');
const authenticate = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authenticate);

// @route   GET /api/invoices/next-number
// @desc    Get next invoice number
// @access  Private
router.get('/next-number', getNextInvoiceNumber);

// @route   GET /api/invoices
// @desc    Get all invoices for user
// @access  Private
router.get('/', getInvoices);

// @route   POST /api/invoices
// @desc    Create new invoice
// @access  Private
router.post('/', createInvoice);

// @route   GET /api/invoices/:id
// @desc    Get single invoice
// @access  Private
router.get('/:id', getInvoice);

// @route   PUT /api/invoices/:id
// @desc    Update invoice
// @access  Private
router.put('/:id', updateInvoice);

// @route   DELETE /api/invoices/:id
// @desc    Delete invoice
// @access  Private
router.delete('/:id', deleteInvoice);

// @route   GET /api/invoices/:id/download
// @desc    Download invoice PDF
// @access  Private
router.get('/:id/download', downloadInvoicePDF);

// @route   PUT /api/invoices/:id/pay
// @desc    Mark invoice as paid
// @access  Private
router.put('/:id/pay', markInvoiceAsPaid);

module.exports = router;