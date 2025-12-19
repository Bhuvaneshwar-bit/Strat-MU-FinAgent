import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Plus, 
  Trash2, 
  Download, 
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Hash,
  Percent,
  Receipt,
  FileText,
  Package,
  Truck,
  CreditCard,
  History,
  Eye,
  ChevronLeft,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import '../styles/InvoiceGeneration.css';

// Indian States for Place of Supply
const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' }
];

// Convert number to Indian words
const numberToIndianWords = (num) => {
  if (num === 0) return 'Zero Rupees Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const numToWords = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
  };
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let result = numToWords(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + numToWords(paise) + ' Paise';
  }
  result += ' Only';
  
  return result;
};

// Format number in Indian currency format
const formatIndianCurrency = (num) => {
  const x = num.toFixed(2);
  const parts = x.split('.');
  let lastThree = parts[0].substring(parts[0].length - 3);
  const otherNumbers = parts[0].substring(0, parts[0].length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return '₹' + formatted + '.' + parts[1];
};

const InvoiceGeneration = ({ user }) => {
  const [invoiceData, setInvoiceData] = useState({
    // Invoice Header
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    
    // Supplier Details (From)
    supplierName: '',
    supplierGSTIN: '',
    supplierPAN: '',
    supplierAddress: '',
    supplierCity: '',
    supplierState: '27', // Default Maharashtra
    supplierPincode: '',
    supplierPhone: '',
    supplierEmail: '',
    
    // Buyer Details (To)
    buyerName: '',
    buyerGSTIN: '',
    buyerAddress: '',
    buyerCity: '',
    buyerState: '27',
    buyerPincode: '',
    buyerPhone: '',
    buyerEmail: '',
    
    // Place of Supply
    placeOfSupply: '27',
    
    // Reverse Charge Applicable
    reverseCharge: false,
    
    // Invoice Items
    items: [
      {
        id: 1,
        description: '',
        hsnSac: '',
        quantity: 1,
        unit: 'Nos',
        rate: 0,
        taxableValue: 0,
        gstRate: 18, // Default 18%
        cgstRate: 9,
        cgstAmount: 0,
        sgstRate: 9,
        sgstAmount: 0,
        igstRate: 18,
        igstAmount: 0,
        totalAmount: 0
      }
    ],
    
    // Invoice Totals
    totalTaxableValue: 0,
    totalCGST: 0,
    totalSGST: 0,
    totalIGST: 0,
    totalTax: 0,
    grandTotal: 0,
    amountInWords: '',
    
    // Bank Details
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    
    // Additional Fields
    notes: '',
    terms: 'Payment is due within 30 days from the date of invoice. Late payments may attract interest at 18% per annum.'
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Invoice History State
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'history'
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Fetch invoice history on component mount and when switching to history tab
  useEffect(() => {
    if (activeTab === 'history') {
      fetchInvoiceHistory();
    }
  }, [activeTab]);

  // Fetch invoice history from API
  const fetchInvoiceHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('🔐 Token for fetch:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      
      const response = await fetch(`${API_BASE_URL}/api/gst-invoices?search=${searchTerm}&status=${statusFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📥 Fetch response status:', response.status);
      const data = await response.json();
      console.log('📥 Fetch response data:', data);
      
      if (data.success) {
        setInvoiceHistory(data.invoices);
      }
    } catch (error) {
      console.error('Error fetching invoice history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Save invoice to database
  const saveInvoiceToDatabase = async (invoicePayload) => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔐 Token for save:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      console.log('📤 Saving invoice payload:', invoicePayload);
      
      const response = await fetch(`${API_BASE_URL}/api/gst-invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoicePayload)
      });
      
      console.log('📤 Save response status:', response.status);
      const data = await response.json();
      console.log('📤 Save response data:', data);
      
      if (!data.success) {
        console.error('Failed to save invoice:', data.error || data.message);
      }
      return data;
    } catch (error) {
      console.error('Error saving invoice:', error);
      return { success: false, error: error.message };
    }
  };

  // Check if intra-state or inter-state supply
  const isInterState = () => {
    return invoiceData.supplierState !== invoiceData.placeOfSupply;
  };

  // Calculate totals
  const calculateTotals = (items, supplierState, placeOfSupply) => {
    const interState = supplierState !== placeOfSupply;
    
    let totalTaxableValue = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    const updatedItems = items.map(item => {
      const taxableValue = item.quantity * item.rate;
      let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
      
      if (interState) {
        igstAmount = (taxableValue * item.gstRate) / 100;
      } else {
        cgstAmount = (taxableValue * (item.gstRate / 2)) / 100;
        sgstAmount = (taxableValue * (item.gstRate / 2)) / 100;
      }
      
      const totalAmount = taxableValue + cgstAmount + sgstAmount + igstAmount;
      
      totalTaxableValue += taxableValue;
      totalCGST += cgstAmount;
      totalSGST += sgstAmount;
      totalIGST += igstAmount;

      return {
        ...item,
        taxableValue,
        cgstRate: item.gstRate / 2,
        cgstAmount,
        sgstRate: item.gstRate / 2,
        sgstAmount,
        igstRate: item.gstRate,
        igstAmount,
        totalAmount
      };
    });

    const totalTax = totalCGST + totalSGST + totalIGST;
    const grandTotal = totalTaxableValue + totalTax;

    return {
      items: updatedItems,
      totalTaxableValue,
      totalCGST,
      totalSGST,
      totalIGST,
      totalTax,
      grandTotal,
      amountInWords: numberToIndianWords(grandTotal)
    };
  };

  // Update item
  const updateItem = (index, field, value) => {
    const newItems = [...invoiceData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    const totals = calculateTotals(newItems, invoiceData.supplierState, invoiceData.placeOfSupply);
    
    setInvoiceData(prev => ({
      ...prev,
      items: totals.items,
      totalTaxableValue: totals.totalTaxableValue,
      totalCGST: totals.totalCGST,
      totalSGST: totals.totalSGST,
      totalIGST: totals.totalIGST,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
      amountInWords: totals.amountInWords
    }));
  };

  // Add new item
  const addItem = () => {
    const newItem = {
      id: Date.now(),
      description: '',
      hsnSac: '',
      quantity: 1,
      unit: 'Nos',
      rate: 0,
      taxableValue: 0,
      gstRate: 18,
      cgstRate: 9,
      cgstAmount: 0,
      sgstRate: 9,
      sgstAmount: 0,
      igstRate: 18,
      igstAmount: 0,
      totalAmount: 0
    };
    
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  // Remove item
  const removeItem = (index) => {
    if (invoiceData.items.length === 1) return;
    
    const newItems = invoiceData.items.filter((_, i) => i !== index);
    const totals = calculateTotals(newItems, invoiceData.supplierState, invoiceData.placeOfSupply);
    
    setInvoiceData(prev => ({
      ...prev,
      items: totals.items,
      totalTaxableValue: totals.totalTaxableValue,
      totalCGST: totals.totalCGST,
      totalSGST: totals.totalSGST,
      totalIGST: totals.totalIGST,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
      amountInWords: totals.amountInWords
    }));
  };

  // Update state and recalculate
  const updateState = (field, value) => {
    setInvoiceData(prev => {
      const updated = { ...prev, [field]: value };
      // Recalculate if state changes affect IGST/CGST+SGST
      if (field === 'supplierState' || field === 'placeOfSupply') {
        const totals = calculateTotals(updated.items, 
          field === 'supplierState' ? value : updated.supplierState,
          field === 'placeOfSupply' ? value : updated.placeOfSupply
        );
        return {
          ...updated,
          items: totals.items,
          totalCGST: totals.totalCGST,
          totalSGST: totals.totalSGST,
          totalIGST: totals.totalIGST,
          totalTax: totals.totalTax,
          grandTotal: totals.grandTotal,
          amountInWords: totals.amountInWords
        };
      }
      return updated;
    });
  };

  // Validate GSTIN format (15 characters)
  const validateGSTIN = (gstin) => {
    if (!gstin) return true; // Optional field
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!invoiceData.invoiceNumber) newErrors.invoiceNumber = 'Invoice number is required';
    if (!invoiceData.supplierName) newErrors.supplierName = 'Supplier name is required';
    if (!invoiceData.supplierGSTIN) newErrors.supplierGSTIN = 'Supplier GSTIN is required';
    if (invoiceData.supplierGSTIN && !validateGSTIN(invoiceData.supplierGSTIN)) {
      newErrors.supplierGSTIN = 'Invalid GSTIN format';
    }
    if (!invoiceData.buyerName) newErrors.buyerName = 'Buyer name is required';
    if (!invoiceData.dueDate) newErrors.dueDate = 'Due date is required';
    if (invoiceData.items.some(item => !item.description)) newErrors.items = 'All items must have descriptions';
    if (invoiceData.items.some(item => !item.hsnSac)) newErrors.hsnSac = 'HSN/SAC code is required for all items';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Generate Invoice
  const generateInvoice = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // Prepare invoice payload for saving
      const invoicePayload = {
        ...invoiceData,
        supplyType: isInterState() ? 'inter-state' : 'intra-state',
        amountInWords: numberToIndianWords(invoiceData.grandTotal)
      };
      
      // Save to database
      const saveResult = await saveInvoiceToDatabase(invoicePayload);
      
      // Generate and download PDF
      await generateGSTPDF(invoiceData);
      
      if (saveResult.success) {
        alert('GST Invoice generated, downloaded, and saved successfully!');
      } else {
        alert('GST Invoice generated and downloaded! (Note: Could not save to history)');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Error generating invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // View invoice details from history
  const viewInvoiceDetails = async (invoiceId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/gst-invoices/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setSelectedInvoice(data.invoice);
      }
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    }
  };

  // Re-download invoice from history
  const redownloadInvoice = async (invoice) => {
    try {
      await generateGSTPDF(invoice);
    } catch (error) {
      console.error('Error re-downloading invoice:', error);
      alert('Error downloading invoice. Please try again.');
    }
  };

  // Get state name from code
  const getStateName = (code) => {
    const state = INDIAN_STATES.find(s => s.code === code);
    return state ? state.name : '';
  };

  // Generate GST-Compliant PDF
  const generateGSTPDF = async (invoice) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;
    const interState = invoice.supplierState !== invoice.placeOfSupply;

    // Border
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, pageWidth - 2 * margin, 277);

    // Header - TAX INVOICE
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', pageWidth / 2, 20, { align: 'center' });
    
    // Horizontal line
    doc.line(margin, 25, pageWidth - margin, 25);

    // Supplier Details (Left)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Supplier Details:', margin + 2, 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    let y = 38;
    doc.text(invoice.supplierName || 'N/A', margin + 2, y);
    y += 5;
    doc.text('GSTIN: ' + (invoice.supplierGSTIN || 'N/A'), margin + 2, y);
    if (invoice.supplierPAN) {
      y += 5;
      doc.text('PAN: ' + invoice.supplierPAN, margin + 2, y);
    }
    y += 5;
    doc.text((invoice.supplierAddress || '') + ', ' + (invoice.supplierCity || ''), margin + 2, y);
    y += 5;
    doc.text(getStateName(invoice.supplierState) + ' - ' + (invoice.supplierPincode || ''), margin + 2, y);
    if (invoice.supplierPhone) {
      y += 5;
      doc.text('Phone: ' + invoice.supplierPhone, margin + 2, y);
    }
    if (invoice.supplierEmail) {
      y += 5;
      doc.text('Email: ' + invoice.supplierEmail, margin + 2, y);
    }

    // Invoice Details (Right)
    const rightColX = pageWidth / 2 + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Invoice Details:', rightColX, 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    doc.text('Invoice No: ' + invoice.invoiceNumber, rightColX, 38);
    doc.text('Invoice Date: ' + new Date(invoice.invoiceDate).toLocaleDateString('en-IN'), rightColX, 43);
    doc.text('Due Date: ' + new Date(invoice.dueDate).toLocaleDateString('en-IN'), rightColX, 48);
    doc.text('Place of Supply: ' + getStateName(invoice.placeOfSupply) + ' (' + invoice.placeOfSupply + ')', rightColX, 53);
    doc.text('Reverse Charge: ' + (invoice.reverseCharge ? 'Yes' : 'No'), rightColX, 58);
    doc.text('Supply Type: ' + (interState ? 'Inter-State' : 'Intra-State'), rightColX, 63);

    // Vertical line between supplier and invoice details
    doc.line(pageWidth / 2, 25, pageWidth / 2, 75);
    
    // Horizontal line
    doc.line(margin, 75, pageWidth - margin, 75);

    // Buyer Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Buyer Details (Bill To):', margin + 2, 82);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    y = 88;
    doc.text(invoice.buyerName || 'N/A', margin + 2, y);
    if (invoice.buyerGSTIN) {
      y += 5;
      doc.text('GSTIN: ' + invoice.buyerGSTIN, margin + 2, y);
    }
    y += 5;
    doc.text((invoice.buyerAddress || '') + ', ' + (invoice.buyerCity || ''), margin + 2, y);
    y += 5;
    doc.text(getStateName(invoice.buyerState) + ' - ' + (invoice.buyerPincode || ''), margin + 2, y);
    if (invoice.buyerPhone) {
      y += 5;
      doc.text('Phone: ' + invoice.buyerPhone, margin + 2, y);
    }

    // Horizontal line before items
    doc.line(margin, 110, pageWidth - margin, 110);

    // Items Table
    const tableColumns = interState ? 
      [['S.No', 'Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Taxable Value', 'IGST %', 'IGST Amt', 'Total']] :
      [['S.No', 'Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Taxable Value', 'CGST %', 'CGST', 'SGST %', 'SGST', 'Total']];

    const tableData = invoice.items.map((item, index) => {
      if (interState) {
        return [
          (index + 1).toString(),
          item.description,
          item.hsnSac,
          item.quantity.toString(),
          item.unit,
          formatIndianCurrency(item.rate),
          formatIndianCurrency(item.taxableValue),
          item.igstRate + '%',
          formatIndianCurrency(item.igstAmount),
          formatIndianCurrency(item.totalAmount)
        ];
      } else {
        return [
          (index + 1).toString(),
          item.description,
          item.hsnSac,
          item.quantity.toString(),
          item.unit,
          formatIndianCurrency(item.rate),
          formatIndianCurrency(item.taxableValue),
          item.cgstRate + '%',
          formatIndianCurrency(item.cgstAmount),
          item.sgstRate + '%',
          formatIndianCurrency(item.sgstAmount),
          formatIndianCurrency(item.totalAmount)
        ];
      }
    });

    autoTable(doc, {
      startY: 115,
      head: tableColumns,
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 204, 41],
        textColor: [7, 10, 18],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [31, 41, 55]
      },
      columnStyles: interState ? {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 22, halign: 'right' },
        7: { cellWidth: 14, halign: 'center' },
        8: { cellWidth: 20, halign: 'right' },
        9: { cellWidth: 22, halign: 'right' }
      } : {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 32 },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 10, halign: 'center' },
        4: { cellWidth: 10, halign: 'center' },
        5: { cellWidth: 16, halign: 'right' },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 12, halign: 'center' },
        8: { cellWidth: 16, halign: 'right' },
        9: { cellWidth: 12, halign: 'center' },
        10: { cellWidth: 16, halign: 'right' },
        11: { cellWidth: 18, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    });

    // Totals Section
    const finalY = doc.lastAutoTable.finalY + 5;
    
    // Tax Summary Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Tax Summary:', margin + 2, finalY);
    
    doc.setFont('helvetica', 'normal');
    const totalsX = pageWidth - margin - 70;
    let totalsY = finalY;
    
    doc.text('Total Taxable Value:', totalsX, totalsY);
    doc.text(formatIndianCurrency(invoice.totalTaxableValue), pageWidth - margin - 2, totalsY, { align: 'right' });
    
    if (interState) {
      totalsY += 6;
      doc.text('Total IGST:', totalsX, totalsY);
      doc.text(formatIndianCurrency(invoice.totalIGST), pageWidth - margin - 2, totalsY, { align: 'right' });
    } else {
      totalsY += 6;
      doc.text('Total CGST:', totalsX, totalsY);
      doc.text(formatIndianCurrency(invoice.totalCGST), pageWidth - margin - 2, totalsY, { align: 'right' });
      totalsY += 6;
      doc.text('Total SGST:', totalsX, totalsY);
      doc.text(formatIndianCurrency(invoice.totalSGST), pageWidth - margin - 2, totalsY, { align: 'right' });
    }
    
    totalsY += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Grand Total:', totalsX, totalsY);
    doc.text(formatIndianCurrency(invoice.grandTotal), pageWidth - margin - 2, totalsY, { align: 'right' });

    // Amount in Words
    totalsY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Amount in Words:', margin + 2, totalsY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const wordsLines = doc.splitTextToSize(invoice.amountInWords || numberToIndianWords(invoice.grandTotal), pageWidth - 2 * margin - 4);
    doc.text(wordsLines, margin + 2, totalsY + 5);

    // Bank Details
    totalsY += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Bank Details:', margin + 2, totalsY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (invoice.bankName) {
      doc.text('Bank Name: ' + invoice.bankName, margin + 2, totalsY + 5);
      doc.text('Account No: ' + (invoice.accountNumber || 'N/A'), margin + 2, totalsY + 10);
      doc.text('IFSC Code: ' + (invoice.ifscCode || 'N/A'), margin + 2, totalsY + 15);
      doc.text('Branch: ' + (invoice.branchName || 'N/A'), margin + 2, totalsY + 20);
    }

    // Terms & Conditions
    if (invoice.terms) {
      totalsY += 30;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Terms & Conditions:', margin + 2, totalsY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const termsLines = doc.splitTextToSize(invoice.terms, pageWidth - 2 * margin - 4);
      doc.text(termsLines, margin + 2, totalsY + 5);
    }

    // Signature Area
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('For ' + (invoice.supplierName || 'Supplier'), pageWidth - margin - 50, 260);
    doc.line(pageWidth - margin - 60, 275, pageWidth - margin - 5, 275);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorised Signatory', pageWidth - margin - 45, 280);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(128);
    doc.text('This is a computer-generated invoice and does not require a physical signature.', pageWidth / 2, 285, { align: 'center' });

    // Download
    doc.save('GST-Invoice-' + invoice.invoiceNumber + '.pdf');
  };

  return (
    <div className="invoice-generation">
      <div className="invoice-header">
        <div className="header-content">
          <div className="header-icon">
            <Receipt />
          </div>
          <div>
            <h2>GST Invoice Generation</h2>
            <p>Create GST-compliant tax invoices as per Indian standards</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="tab-buttons">
            <button 
              className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              <Plus className="button-icon" />
              Create New
            </button>
            <button 
              className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History className="button-icon" />
              Invoice History
            </button>
          </div>
          {activeTab === 'create' && (
            <button 
              className="primary-button"
              onClick={generateInvoice}
              disabled={loading}
            >
              <Download className="button-icon" />
              {loading ? 'Generating...' : 'Generate Invoice'}
            </button>
          )}
        </div>
      </div>

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="invoice-history-section">
          {selectedInvoice ? (
            <div className="invoice-detail-view">
              <button className="back-button" onClick={() => setSelectedInvoice(null)}>
                <ChevronLeft /> Back to List
              </button>
              <div className="invoice-detail-card">
                <div className="detail-header">
                  <h3>Invoice #{selectedInvoice.invoiceNumber}</h3>
                  <span className={`status-badge ${selectedInvoice.status}`}>{selectedInvoice.status}</span>
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Buyer</label>
                    <span>{selectedInvoice.buyerName}</span>
                  </div>
                  <div className="detail-item">
                    <label>Invoice Date</label>
                    <span>{new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="detail-item">
                    <label>Due Date</label>
                    <span>{new Date(selectedInvoice.dueDate).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="detail-item">
                    <label>Supply Type</label>
                    <span>{selectedInvoice.supplyType}</span>
                  </div>
                  <div className="detail-item">
                    <label>Taxable Value</label>
                    <span>{formatIndianCurrency(selectedInvoice.totalTaxableValue)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Total Tax</label>
                    <span>{formatIndianCurrency(selectedInvoice.totalTax)}</span>
                  </div>
                  <div className="detail-item grand-total">
                    <label>Grand Total</label>
                    <span>{formatIndianCurrency(selectedInvoice.grandTotal)}</span>
                  </div>
                </div>
                <button 
                  className="primary-button"
                  onClick={() => redownloadInvoice(selectedInvoice)}
                >
                  <Download className="button-icon" /> Download PDF
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="history-controls">
                <div className="search-box">
                  <Search className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="filter-box">
                  <Filter className="filter-icon" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <button className="refresh-button" onClick={fetchInvoiceHistory}>
                  <RefreshCw className={historyLoading ? 'spinning' : ''} />
                </button>
              </div>

              {historyLoading ? (
                <div className="history-loading">
                  <RefreshCw className="spinning" />
                  <p>Loading invoices...</p>
                </div>
              ) : invoiceHistory.length === 0 ? (
                <div className="no-invoices">
                  <Receipt className="empty-icon" />
                  <h3>No Invoices Yet</h3>
                  <p>Create your first GST invoice to see it here</p>
                  <button 
                    className="primary-button"
                    onClick={() => setActiveTab('create')}
                  >
                    <Plus className="button-icon" /> Create Invoice
                  </button>
                </div>
              ) : (
                <div className="invoice-history-table">
                  <div className="history-table-header">
                    <div className="col-inv">Invoice #</div>
                    <div className="col-date">Date</div>
                    <div className="col-buyer">Buyer</div>
                    <div className="col-amount">Amount</div>
                    <div className="col-status">Status</div>
                    <div className="col-actions">Actions</div>
                  </div>
                  {invoiceHistory.map(inv => (
                    <div key={inv._id} className="history-table-row">
                      <div className="col-inv">{inv.invoiceNumber}</div>
                      <div className="col-date">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</div>
                      <div className="col-buyer">{inv.buyerName}</div>
                      <div className="col-amount">{formatIndianCurrency(inv.grandTotal)}</div>
                      <div className="col-status">
                        <span className={`status-badge ${inv.status}`}>{inv.status}</span>
                      </div>
                      <div className="col-actions">
                        <button 
                          className="action-btn view"
                          onClick={() => viewInvoiceDetails(inv._id)}
                          title="View Details"
                        >
                          <Eye />
                        </button>
                        <button 
                          className="action-btn download"
                          onClick={() => viewInvoiceDetails(inv._id).then(() => redownloadInvoice(inv))}
                          title="Download PDF"
                        >
                          <Download />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Create Invoice Tab */}
      {activeTab === 'create' && (
      <div className="invoice-form">
        {/* Invoice Details Section */}
        <div className="form-section">
          <h3><FileText className="section-icon" /> Invoice Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Invoice Number *</label>
              <div className="input-with-icon">
                <Hash className="input-icon" />
                <input
                  type="text"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  placeholder="INV/2024-25/001"
                  className={errors.invoiceNumber ? 'error' : ''}
                />
              </div>
              {errors.invoiceNumber && <span className="error-message">{errors.invoiceNumber}</span>}
            </div>

            <div className="form-group">
              <label>Invoice Date *</label>
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

            <div className="form-group">
              <label>Reverse Charge Applicable?</label>
              <select
                value={invoiceData.reverseCharge ? 'yes' : 'no'}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, reverseCharge: e.target.value === 'yes' }))}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Supplier Details Section */}
        <div className="form-section">
          <h3><Building className="section-icon" /> Supplier Details (From)</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Business Name *</label>
              <div className="input-with-icon">
                <Building className="input-icon" />
                <input
                  type="text"
                  value={invoiceData.supplierName}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, supplierName: e.target.value }))}
                  placeholder="Your Business Name"
                  className={errors.supplierName ? 'error' : ''}
                />
              </div>
              {errors.supplierName && <span className="error-message">{errors.supplierName}</span>}
            </div>

            <div className="form-group">
              <label>GSTIN *</label>
              <div className="input-with-icon">
                <FileText className="input-icon" />
                <input
                  type="text"
                  value={invoiceData.supplierGSTIN}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, supplierGSTIN: e.target.value.toUpperCase() }))}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className={errors.supplierGSTIN ? 'error' : ''}
                />
              </div>
              {errors.supplierGSTIN && <span className="error-message">{errors.supplierGSTIN}</span>}
            </div>

            <div className="form-group">
              <label>PAN</label>
              <input
                type="text"
                value={invoiceData.supplierPAN}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, supplierPAN: e.target.value.toUpperCase() }))}
                placeholder="AAAAA0000A"
                maxLength={10}
              />
            </div>

            <div className="form-group">
              <label>State *</label>
              <select
                value={invoiceData.supplierState}
                onChange={(e) => updateState('supplierState', e.target.value)}
              >
                {INDIAN_STATES.map(state => (
                  <option key={state.code} value={state.code}>
                    {state.code} - {state.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <div className="input-with-icon">
                <MapPin className="input-icon" />
                <input
                  type="text"
                  value={invoiceData.supplierAddress}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, supplierAddress: e.target.value }))}
                  placeholder="Building, Street, Area"
                />
              </div>
            </div>

            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                value={invoiceData.supplierCity}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, supplierCity: e.target.value }))}
                placeholder="Mumbai"
              />
            </div>

            <div className="form-group">
              <label>PIN Code</label>
              <input
                type="text"
                value={invoiceData.supplierPincode}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, supplierPincode: e.target.value }))}
                placeholder="400001"
                maxLength={6}
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <div className="input-with-icon">
                <Phone className="input-icon" />
                <input
                  type="tel"
                  value={invoiceData.supplierPhone}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, supplierPhone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <div className="input-with-icon">
                <Mail className="input-icon" />
                <input
                  type="email"
                  value={invoiceData.supplierEmail}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, supplierEmail: e.target.value }))}
                  placeholder="business@example.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Buyer Details Section */}
        <div className="form-section">
          <h3><User className="section-icon" /> Buyer Details (Bill To)</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Buyer Name / Business *</label>
              <div className="input-with-icon">
                <User className="input-icon" />
                <input
                  type="text"
                  value={invoiceData.buyerName}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, buyerName: e.target.value }))}
                  placeholder="Customer / Business Name"
                  className={errors.buyerName ? 'error' : ''}
                />
              </div>
              {errors.buyerName && <span className="error-message">{errors.buyerName}</span>}
            </div>

            <div className="form-group">
              <label>GSTIN (if registered)</label>
              <div className="input-with-icon">
                <FileText className="input-icon" />
                <input
                  type="text"
                  value={invoiceData.buyerGSTIN}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, buyerGSTIN: e.target.value.toUpperCase() }))}
                  placeholder="22BBBBB0000B1Z5"
                  maxLength={15}
                />
              </div>
            </div>

            <div className="form-group">
              <label>State</label>
              <select
                value={invoiceData.buyerState}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, buyerState: e.target.value }))}
              >
                {INDIAN_STATES.map(state => (
                  <option key={state.code} value={state.code}>
                    {state.code} - {state.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Place of Supply *</label>
              <div className="input-with-icon">
                <Truck className="input-icon" />
                <select
                  value={invoiceData.placeOfSupply}
                  onChange={(e) => updateState('placeOfSupply', e.target.value)}
                >
                  {INDIAN_STATES.map(state => (
                    <option key={state.code} value={state.code}>
                      {state.code} - {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <small className="helper-text">
                {isInterState() ? '⚠️ Inter-State Supply (IGST applicable)' : '✓ Intra-State Supply (CGST + SGST applicable)'}
              </small>
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <div className="input-with-icon">
                <MapPin className="input-icon" />
                <input
                  type="text"
                  value={invoiceData.buyerAddress}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, buyerAddress: e.target.value }))}
                  placeholder="Building, Street, Area"
                />
              </div>
            </div>

            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                value={invoiceData.buyerCity}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, buyerCity: e.target.value }))}
                placeholder="Delhi"
              />
            </div>

            <div className="form-group">
              <label>PIN Code</label>
              <input
                type="text"
                value={invoiceData.buyerPincode}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, buyerPincode: e.target.value }))}
                placeholder="110001"
                maxLength={6}
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <div className="input-with-icon">
                <Phone className="input-icon" />
                <input
                  type="tel"
                  value={invoiceData.buyerPhone}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, buyerPhone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <div className="input-with-icon">
                <Mail className="input-icon" />
                <input
                  type="email"
                  value={invoiceData.buyerEmail}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, buyerEmail: e.target.value }))}
                  placeholder="buyer@example.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items Section */}
        <div className="form-section">
          <div className="section-header">
            <h3><Package className="section-icon" /> Invoice Items</h3>
            <button 
              className="secondary-button"
              onClick={addItem}
              type="button"
            >
              <Plus className="button-icon" />
              Add Item
            </button>
          </div>

          <div className="items-table gst-table">
            <div className="table-header">
              <div className="col-description">Description</div>
              <div className="col-hsn">HSN/SAC</div>
              <div className="col-qty">Qty</div>
              <div className="col-unit">Unit</div>
              <div className="col-rate">Rate (₹)</div>
              <div className="col-gst">GST %</div>
              <div className="col-amount">Amount (₹)</div>
              <div className="col-actions">Actions</div>
            </div>

            {invoiceData.items.map((item, index) => (
              <div key={item.id} className="table-row">
                <div className="col-description">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Product/Service description"
                  />
                </div>
                <div className="col-hsn">
                  <input
                    type="text"
                    value={item.hsnSac}
                    onChange={(e) => updateItem(index, 'hsnSac', e.target.value)}
                    placeholder="9983"
                    maxLength={8}
                  />
                </div>
                <div className="col-qty">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="1"
                  />
                </div>
                <div className="col-unit">
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                  >
                    <option value="Nos">Nos</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Kg">Kg</option>
                    <option value="Ltr">Ltr</option>
                    <option value="Mtr">Mtr</option>
                    <option value="Hrs">Hrs</option>
                    <option value="Days">Days</option>
                    <option value="Box">Box</option>
                    <option value="Set">Set</option>
                  </select>
                </div>
                <div className="col-rate">
                  <input
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-gst">
                  <select
                    value={item.gstRate}
                    onChange={(e) => updateItem(index, 'gstRate', parseFloat(e.target.value))}
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
                <div className="col-amount">
                  <span className="amount-display">{formatIndianCurrency(item.totalAmount)}</span>
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
          {errors.hsnSac && <span className="error-message">{errors.hsnSac}</span>}
        </div>

        {/* Invoice Totals Section */}
        <div className="form-section">
          <h3><CreditCard className="section-icon" /> Tax Summary</h3>
          <div className="gst-totals-section">
            <div className="totals-display">
              <div className="total-row">
                <span>Total Taxable Value:</span>
                <span>{formatIndianCurrency(invoiceData.totalTaxableValue)}</span>
              </div>
              {isInterState() ? (
                <div className="total-row">
                  <span>Total IGST:</span>
                  <span>{formatIndianCurrency(invoiceData.totalIGST)}</span>
                </div>
              ) : (
                <>
                  <div className="total-row">
                    <span>Total CGST:</span>
                    <span>{formatIndianCurrency(invoiceData.totalCGST)}</span>
                  </div>
                  <div className="total-row">
                    <span>Total SGST:</span>
                    <span>{formatIndianCurrency(invoiceData.totalSGST)}</span>
                  </div>
                </>
              )}
              <div className="total-row final">
                <span>Grand Total:</span>
                <span>{formatIndianCurrency(invoiceData.grandTotal)}</span>
              </div>
              <div className="amount-in-words">
                <strong>Amount in Words:</strong> {invoiceData.amountInWords || numberToIndianWords(invoiceData.grandTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details Section */}
        <div className="form-section">
          <h3><Building className="section-icon" /> Bank Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Bank Name</label>
              <input
                type="text"
                value={invoiceData.bankName}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, bankName: e.target.value }))}
                placeholder="State Bank of India"
              />
            </div>
            <div className="form-group">
              <label>Account Number</label>
              <input
                type="text"
                value={invoiceData.accountNumber}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, accountNumber: e.target.value }))}
                placeholder="1234567890"
              />
            </div>
            <div className="form-group">
              <label>IFSC Code</label>
              <input
                type="text"
                value={invoiceData.ifscCode}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                placeholder="SBIN0001234"
              />
            </div>
            <div className="form-group">
              <label>Branch Name</label>
              <input
                type="text"
                value={invoiceData.branchName}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, branchName: e.target.value }))}
                placeholder="Andheri West Branch"
              />
            </div>
          </div>
        </div>

        {/* Terms & Conditions Section */}
        <div className="form-section">
          <h3>Additional Information</h3>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes for the buyer"
                rows="2"
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
      )}
    </div>
  );
};

export default InvoiceGeneration;
