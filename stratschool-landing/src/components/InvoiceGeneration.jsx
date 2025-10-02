import React, { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  Plus, 
  Trash2, 
  Download, 
  Save, 
  Calculator,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Hash,
  DollarSign,
  Percent,
  FileText,
  Receipt
} from 'lucide-react';
import '../styles/InvoiceGeneration.css';

const InvoiceGeneration = ({ user }) => {
  const [invoiceData, setInvoiceData] = useState({
    // Invoice Header
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    
    // Company Details (From)
    companyName: 'StratSchool AI CFO',
    companyAddress: '',
    companyCity: '',
    companyZip: '',
    companyPhone: '',
    companyEmail: '',
    
    // Client Details (To)
    clientName: '',
    clientCompany: '',
    clientAddress: '',
    clientCity: '',
    clientZip: '',
    clientPhone: '',
    clientEmail: '',
    
    // Invoice Items
    items: [
      {
        id: 1,
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0
      }
    ],
    
    // Invoice Totals
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    discountRate: 0,
    discountAmount: 0,
    total: 0,
    
    // Additional Fields
    notes: '',
    terms: 'Payment due within 30 days of invoice date.'
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Calculate totals
  const calculateTotals = (items, taxRate, discountRate) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discountAmount = subtotal * (discountRate / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = taxableAmount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total
    };
  };

  // Update item
  const updateItem = (index, field, value) => {
    const newItems = [...invoiceData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate amount for this item
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }

    const totals = calculateTotals(newItems, invoiceData.taxRate, invoiceData.discountRate);
    
    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      ...totals
    }));
  };

  // Add new item
  const addItem = () => {
    const newItem = {
      id: Date.now(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  // Remove item
  const removeItem = (index) => {
    if (invoiceData.items.length === 1) return; // Keep at least one item
    
    const newItems = invoiceData.items.filter((_, i) => i !== index);
    const totals = calculateTotals(newItems, invoiceData.taxRate, invoiceData.discountRate);
    
    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      ...totals
    }));
  };

  // Update tax or discount rate
  const updateRate = (field, value) => {
    const rate = parseFloat(value) || 0;
    const totals = calculateTotals(invoiceData.items, 
      field === 'taxRate' ? rate : invoiceData.taxRate,
      field === 'discountRate' ? rate : invoiceData.discountRate
    );
    
    setInvoiceData(prev => ({
      ...prev,
      [field]: rate,
      ...totals
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!invoiceData.invoiceNumber) newErrors.invoiceNumber = 'Invoice number is required';
    if (!invoiceData.clientName) newErrors.clientName = 'Client name is required';
    if (!invoiceData.clientEmail) newErrors.clientEmail = 'Client email is required';
    if (!invoiceData.dueDate) newErrors.dueDate = 'Due date is required';
    if (invoiceData.items.some(item => !item.description)) newErrors.items = 'All items must have descriptions';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Generate Invoice
  const generateInvoice = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // For now, generate PDF directly since backend might not be running
      // This will work even without backend connection
      await generatePDF(invoiceData);
      
      // Try to save to MongoDB (optional - will fail gracefully if backend not running)
      try {
        const response = await fetch('/api/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            ...invoiceData,
            userId: user?.id || 'demo-user',
            createdAt: new Date().toISOString()
          })
        });

        if (response.ok) {
          console.log('Invoice saved to database successfully');
        }
      } catch (dbError) {
        console.log('Database save failed (backend not running), but PDF generated successfully');
      }
      
      // Reset form
      setInvoiceData(prev => ({
        ...prev,
        invoiceNumber: '',
        clientName: '',
        clientCompany: '',
        clientAddress: '',
        clientCity: '',
        clientZip: '',
        clientPhone: '',
        clientEmail: '',
        items: [{ id: 1, description: '', quantity: 1, rate: 0, amount: 0 }],
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        total: 0,
        notes: ''
      }));

      alert('Invoice generated and downloaded successfully!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Error generating invoice. Please check your input and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate PDF (professional implementation with jsPDF)
  const generatePDF = async (invoice) => {
    try {
      const doc = new jsPDF();
      
      // Set font
      doc.setFont('helvetica');
      
      // Header Section
      doc.setFontSize(24);
      doc.setTextColor(31, 41, 55); // Dark gray
      doc.text('INVOICE', 20, 30);
      
      // Company Logo/Branding Area (placeholder for future logo)
      doc.setFontSize(16);
      doc.setTextColor(79, 70, 229); // Primary blue
      doc.text('StratSchool AI CFO', 20, 45);
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // Medium gray
      doc.text('Professional Financial Solutions', 20, 52);
      
      // Invoice Info Box
      doc.setDrawColor(229, 231, 235); // Light gray border
      doc.rect(130, 20, 60, 40);
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, 135, 30);
      doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, 135, 37);
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 135, 44);
      doc.text(`Total: $${invoice.total.toFixed(2)}`, 135, 51);
      
      // Company Details (From)
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text('From:', 20, 75);
      doc.setFontSize(10);
      doc.text(invoice.companyName || 'StratSchool AI CFO', 20, 82);
      if (invoice.companyAddress) doc.text(invoice.companyAddress, 20, 89);
      if (invoice.companyCity && invoice.companyZip) {
        doc.text(`${invoice.companyCity}, ${invoice.companyZip}`, 20, 96);
      }
      if (invoice.companyPhone) doc.text(`Phone: ${invoice.companyPhone}`, 20, 103);
      if (invoice.companyEmail) doc.text(`Email: ${invoice.companyEmail}`, 20, 110);
      
      // Client Details (Bill To)
      doc.setFontSize(12);
      doc.text('Bill To:', 110, 75);
      doc.setFontSize(10);
      doc.text(invoice.clientName, 110, 82);
      if (invoice.clientCompany) doc.text(invoice.clientCompany, 110, 89);
      if (invoice.clientAddress) doc.text(invoice.clientAddress, 110, 96);
      if (invoice.clientCity && invoice.clientZip) {
        doc.text(`${invoice.clientCity}, ${invoice.clientZip}`, 110, 103);
      }
      if (invoice.clientPhone) doc.text(`Phone: ${invoice.clientPhone}`, 110, 110);
      doc.text(`Email: ${invoice.clientEmail}`, 110, 117);
      
      // Items Table
      const tableData = invoice.items.map(item => [
        item.description,
        item.quantity.toString(),
        `$${item.rate.toFixed(2)}`,
        `$${item.amount.toFixed(2)}`
      ]);
      
      doc.autoTable({
        startY: 130,
        head: [['Description', 'Qty', 'Rate', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229], // Primary blue
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [31, 41, 55]
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: 20, right: 20 }
      });
      
      // Totals Section
      const finalY = doc.lastAutoTable.finalY + 20;
      const totalsX = 130;
      
      doc.setFontSize(10);
      doc.text(`Subtotal:`, totalsX, finalY);
      doc.text(`$${invoice.subtotal.toFixed(2)}`, totalsX + 40, finalY);
      
      let currentY = finalY;
      
      if (invoice.discountAmount > 0) {
        currentY += 7;
        doc.setTextColor(220, 38, 38); // Red for discount
        doc.text(`Discount (${invoice.discountRate}%):`, totalsX, currentY);
        doc.text(`-$${invoice.discountAmount.toFixed(2)}`, totalsX + 40, currentY);
        doc.setTextColor(31, 41, 55); // Reset to dark
      }
      
      if (invoice.taxAmount > 0) {
        currentY += 7;
        doc.text(`Tax (${invoice.taxRate}%):`, totalsX, currentY);
        doc.text(`$${invoice.taxAmount.toFixed(2)}`, totalsX + 40, currentY);
      }
      
      // Total line with emphasis
      currentY += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229); // Primary blue
      doc.text('Total:', totalsX, currentY);
      doc.text(`$${invoice.total.toFixed(2)}`, totalsX + 40, currentY);
      
      // Notes Section
      if (invoice.notes) {
        currentY += 20;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text('Notes:', 20, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const notesLines = doc.splitTextToSize(invoice.notes, 170);
        doc.text(notesLines, 20, currentY + 7);
        currentY += (notesLines.length * 5) + 10;
      }
      
      // Terms & Conditions
      if (invoice.terms) {
        currentY += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Terms & Conditions:', 20, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const termsLines = doc.splitTextToSize(invoice.terms, 170);
        doc.text(termsLines, 20, currentY + 7);
      }
      
      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text('Generated by StratSchool AI CFO Platform', 20, pageHeight - 15);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, pageHeight - 10);
      
      // Download the PDF
      doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF');
    }
  };

  return (
    <div className="invoice-generation">
      <div className="invoice-header">
        <div className="header-content">
          <div className="header-icon">
            <Receipt />
          </div>
          <div>
            <h2>Invoice Generation</h2>
            <p>Create professional invoices for your clients</p>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="primary-button"
            onClick={generateInvoice}
            disabled={loading}
          >
            <Download className="button-icon" />
            {loading ? 'Generating...' : 'Generate Invoice'}
          </button>
        </div>
      </div>

      <div className="invoice-form">
        {/* Invoice Details Section */}
        <div className="form-section">
          <h3>Invoice Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Invoice Number *</label>
              <div className="input-with-icon">
                <Hash className="input-icon" />
                <input
                  type="text"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  placeholder="INV-001"
                  className={errors.invoiceNumber ? 'error' : ''}
                />
              </div>
              {errors.invoiceNumber && <span className="error-message">{errors.invoiceNumber}</span>}
            </div>

            <div className="form-group">
              <label>Invoice Date</label>
              <div className="input-with-icon">
                <Calendar className="input-icon" />
                <input
                  type="date"
                  value={invoiceData.invoiceDate}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Due Date *</label>
              <div className="input-with-icon">
                <Calendar className="input-icon" />
                <input
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className={errors.dueDate ? 'error' : ''}
                />
              </div>
              {errors.dueDate && <span className="error-message">{errors.dueDate}</span>}
            </div>
          </div>
        </div>

        {/* Company Details Section */}
        <div className="form-section">
          <h3>From (Your Company)</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Company Name</label>
              <div className="input-with-icon">
                <Building className="input-icon" />
                <input
                  type="text"
                  value={invoiceData.companyName}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Your Company Name"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <div className="input-with-icon">
                <Mail className="input-icon" />
                <input
                  type="email"
                  value={invoiceData.companyEmail}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, companyEmail: e.target.value }))}
                  placeholder="company@example.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Phone</label>
              <div className="input-with-icon">
                <Phone className="input-icon" />
                <input
                  type="tel"
                  value={invoiceData.companyPhone}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, companyPhone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <div className="input-with-icon">
                <MapPin className="input-icon" />
                <input
                  type="text"
                  value={invoiceData.companyAddress}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, companyAddress: e.target.value }))}
                  placeholder="123 Business Street"
                />
              </div>
            </div>

            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                value={invoiceData.companyCity}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, companyCity: e.target.value }))}
                placeholder="New York"
              />
            </div>

            <div className="form-group">
              <label>ZIP Code</label>
              <input
                type="text"
                value={invoiceData.companyZip}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, companyZip: e.target.value }))}
                placeholder="10001"
              />
            </div>
          </div>
        </div>

        {/* Client Details Section */}
        <div className="form-section">
          <h3>Bill To (Client)</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Client Name *</label>
              <div className="input-with-icon">
                <User className="input-icon" />
                <input
                  type="text"
                  value={invoiceData.clientName}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, clientName: e.target.value }))}
                  placeholder="John Doe"
                  className={errors.clientName ? 'error' : ''}
                />
              </div>
              {errors.clientName && <span className="error-message">{errors.clientName}</span>}
            </div>

            <div className="form-group">
              <label>Company</label>
              <div className="input-with-icon">
                <Building className="input-icon" />
                <input
                  type="text"
                  value={invoiceData.clientCompany}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, clientCompany: e.target.value }))}
                  placeholder="Client Company Inc."
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email *</label>
              <div className="input-with-icon">
                <Mail className="input-icon" />
                <input
                  type="email"
                  value={invoiceData.clientEmail}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, clientEmail: e.target.value }))}
                  placeholder="client@example.com"
                  className={errors.clientEmail ? 'error' : ''}
                />
              </div>
              {errors.clientEmail && <span className="error-message">{errors.clientEmail}</span>}
            </div>

            <div className="form-group">
              <label>Phone</label>
              <div className="input-with-icon">
                <Phone className="input-icon" />
                <input
                  type="tel"
                  value={invoiceData.clientPhone}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, clientPhone: e.target.value }))}
                  placeholder="+1 (555) 987-6543"
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <div className="input-with-icon">
                <MapPin className="input-icon" />
                <input
                  type="text"
                  value={invoiceData.clientAddress}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, clientAddress: e.target.value }))}
                  placeholder="456 Client Avenue"
                />
              </div>
            </div>

            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                value={invoiceData.clientCity}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, clientCity: e.target.value }))}
                placeholder="Los Angeles"
              />
            </div>

            <div className="form-group">
              <label>ZIP Code</label>
              <input
                type="text"
                value={invoiceData.clientZip}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, clientZip: e.target.value }))}
                placeholder="90210"
              />
            </div>
          </div>
        </div>

        {/* Invoice Items Section */}
        <div className="form-section">
          <div className="section-header">
            <h3>Invoice Items</h3>
            <button 
              className="secondary-button"
              onClick={addItem}
              type="button"
            >
              <Plus className="button-icon" />
              Add Item
            </button>
          </div>

          <div className="items-table">
            <div className="table-header">
              <div className="col-description">Description</div>
              <div className="col-quantity">Qty</div>
              <div className="col-rate">Rate</div>
              <div className="col-amount">Amount</div>
              <div className="col-actions">Actions</div>
            </div>

            {invoiceData.items.map((item, index) => (
              <div key={item.id} className="table-row">
                <div className="col-description">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Service or product description"
                  />
                </div>
                <div className="col-quantity">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-rate">
                  <div className="input-with-icon">
                    <DollarSign className="input-icon" />
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="col-amount">
                  <span className="amount-display">${item.amount.toFixed(2)}</span>
                </div>
                <div className="col-actions">
                  {invoiceData.items.length > 1 && (
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="delete-icon" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {errors.items && <span className="error-message">{errors.items}</span>}
        </div>

        {/* Invoice Totals Section */}
        <div className="form-section">
          <div className="totals-section">
            <div className="totals-inputs">
              <div className="form-group">
                <label>Discount (%)</label>
                <div className="input-with-icon">
                  <Percent className="input-icon" />
                  <input
                    type="number"
                    value={invoiceData.discountRate}
                    onChange={(e) => updateRate('discountRate', e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Tax (%)</label>
                <div className="input-with-icon">
                  <Percent className="input-icon" />
                  <input
                    type="number"
                    value={invoiceData.taxRate}
                    onChange={(e) => updateRate('taxRate', e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div className="totals-display">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>${invoiceData.subtotal.toFixed(2)}</span>
              </div>
              {invoiceData.discountAmount > 0 && (
                <div className="total-row discount">
                  <span>Discount ({invoiceData.discountRate}%):</span>
                  <span>-${invoiceData.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {invoiceData.taxAmount > 0 && (
                <div className="total-row">
                  <span>Tax ({invoiceData.taxRate}%):</span>
                  <span>${invoiceData.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="total-row final">
                <span>Total:</span>
                <span>${invoiceData.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="form-section">
          <h3>Additional Information</h3>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes or information for the client"
                rows="3"
              ></textarea>
            </div>

            <div className="form-group full-width">
              <label>Terms & Conditions</label>
              <textarea
                value={invoiceData.terms}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, terms: e.target.value }))}
                placeholder="Payment terms and conditions"
                rows="3"
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGeneration;