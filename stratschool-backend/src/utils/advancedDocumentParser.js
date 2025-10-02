/**
 * ADVANCED DOCUMENT PARSER FOR AUTOMATED BOOKKEEPING
 * Handles CSV, PDF, Excel, Images with OCR capabilities
 * Production-ready with error handling and validation
 */

const csv = require('csv-parser');
const XLSX = require('xlsx');
const pdf = require('pdf-parse');
const { Readable } = require('stream');
const passwordProtectedPDFHandler = require('./passwordProtectedPDFHandler');

class AdvancedDocumentParser {
  constructor() {
    console.log('📄 Advanced Document Parser initialized');
    this.supportedFormats = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];
  }

  /**
   * Master document processing function with password support
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} mimeType - File MIME type
   * @param {string} originalName - Original filename
   * @param {string} password - Optional password for encrypted PDFs
   * @returns {Object} Structured financial data
   */
  async parseDocument(fileBuffer, mimeType, originalName, password = null) {
    try {
      console.log('🔍 Parsing document:', originalName, 'Type:', mimeType);

      let extractedData;

      switch (mimeType) {
        case 'text/csv':
          extractedData = await this.parseCSV(fileBuffer);
          break;
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          extractedData = await this.parseExcel(fileBuffer);
          break;
        case 'application/pdf':
          extractedData = await this.parsePDF(fileBuffer, password);
          break;
        case 'text/plain':
          extractedData = await this.parseText(fileBuffer);
          break;
        case 'image/jpeg':
        case 'image/png':
          extractedData = await this.parseImage(fileBuffer);
          break;
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Standardize and validate the extracted data
      const structuredData = await this.structureFinancialData(extractedData, originalName);
      
      console.log('✅ Document parsed successfully:', structuredData.transactions?.length || 0, 'transactions');
      return structuredData;

    } catch (error) {
      console.error('❌ Document parsing failed:', error.message);
      throw new Error(`Failed to parse document: ${error.message}`);
    }
  }

  /**
   * Parse CSV bank statements and financial data
   */
  async parseCSV(fileBuffer) {
    return new Promise((resolve, reject) => {
      const transactions = [];
      const csvData = fileBuffer.toString();
      
      const stream = Readable.from([csvData]);
      
      stream
        .pipe(csv({
          skipEmptyLines: true,
          skipLinesWithError: true
        }))
        .on('data', (row) => {
          // Standardize column names (handle different bank formats)
          const standardizedRow = this.standardizeCSVColumns(row);
          if (this.isValidTransaction(standardizedRow)) {
            transactions.push(standardizedRow);
          }
        })
        .on('end', () => {
          resolve({
            format: 'csv',
            transactions: transactions,
            totalCount: transactions.length,
            summary: this.generateTransactionSummary(transactions)
          });
        })
        .on('error', (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        });
    });
  }

  /**
   * Parse Excel files (bank statements, invoices)
   */
  async parseExcel(fileBuffer) {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: '',
        raw: false 
      });

      // Process Excel data similar to CSV
      const transactions = [];
      const headers = jsonData[0] || [];
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = jsonData[i][index] || '';
        });
        
        const standardizedRow = this.standardizeCSVColumns(row);
        if (this.isValidTransaction(standardizedRow)) {
          transactions.push(standardizedRow);
        }
      }

      return {
        format: 'excel',
        sheetName: sheetName,
        transactions: transactions,
        totalCount: transactions.length,
        summary: this.generateTransactionSummary(transactions)
      };

    } catch (error) {
      throw new Error(`Excel parsing error: ${error.message}`);
    }
  }

  /**
   * Parse PDF documents (bank statements, invoices) with password support
   */
  async parsePDF(fileBuffer, password = null) {
    try {
      console.log('📄 Processing PDF document...');
      
      // Use the password-protected handler for all PDFs
      const pdfResult = await passwordProtectedPDFHandler.processPDF(fileBuffer, password);
      
      // If password is required, return special response
      if (pdfResult.requiresPassword) {
        return {
          format: 'pdf',
          requiresPassword: true,
          isPasswordProtected: true,
          error: 'Password required to unlock this PDF',
          extractedText: null,
          transactions: [],
          totalCount: 0
        };
      }

      // If processing failed
      if (!pdfResult.success && pdfResult.error) {
        throw new Error(pdfResult.error);
      }

      const text = pdfResult.extractedText || '';
      console.log(`📝 Extracted ${text.length} characters from PDF`);
      console.log(`🔍 Debug - pdfResult structure:`, {
        hasExtractedText: !!pdfResult.extractedText,
        textLength: text.length,
        isPasswordProtected: pdfResult.isPasswordProtected,
        method: pdfResult.method,
        success: pdfResult.success
      });
      
      // Extract transactions from PDF text using patterns
      const transactions = this.extractTransactionsFromText(text);
      
      return {
        format: 'pdf',
        extractedText: text,
        transactions: transactions,
        totalCount: transactions.length,
        summary: this.generateTransactionSummary(transactions),
        isPasswordProtected: pdfResult.isPasswordProtected,
        processingMethod: pdfResult.method || 'standard',
        requiresPassword: false
      };

    } catch (error) {
      console.error('❌ PDF parsing error:', error.message);
      
      // Check if it's a password-related error
      if (error.message.includes('password') || error.message.includes('encrypted')) {
        return {
          format: 'pdf',
          requiresPassword: true,
          isPasswordProtected: true,
          error: 'Password required to unlock this PDF',
          extractedText: null,
          transactions: [],
          totalCount: 0
        };
      }
      
      throw new Error(`PDF parsing error: ${error.message}`);
    }
  }

  /**
   * Parse plain text files
   */
  async parseText(fileBuffer) {
    try {
      const text = fileBuffer.toString();
      const transactions = this.extractTransactionsFromText(text);
      
      return {
        format: 'text',
        extractedText: text,
        transactions: transactions,
        totalCount: transactions.length,
        summary: this.generateTransactionSummary(transactions)
      };

    } catch (error) {
      throw new Error(`Text parsing error: ${error.message}`);
    }
  }

  /**
   * Parse images using OCR (placeholder for future implementation)
   */
  async parseImage(fileBuffer) {
    // TODO: Implement OCR with Tesseract.js or cloud OCR service
    console.log('🖼️ Image OCR processing (placeholder)');
    
    return {
      format: 'image',
      message: 'Image OCR processing will be implemented',
      transactions: [],
      totalCount: 0,
      requiresOCR: true
    };
  }

  /**
   * Standardize column names from different bank formats
   */
  standardizeCSVColumns(row) {
    const standardized = {};
    
    // Map common column variations to standard names
    const columnMappings = {
      date: ['date', 'transaction date', 'posted date', 'value date', 'trans date'],
      description: ['description', 'particulars', 'narration', 'details', 'memo', 'reference'],
      amount: ['amount', 'transaction amount', 'debit amount', 'credit amount'],
      debit: ['debit', 'debit amount', 'withdrawal', 'outgoing'],
      credit: ['credit', 'credit amount', 'deposit', 'incoming'],
      balance: ['balance', 'running balance', 'available balance'],
      reference: ['reference', 'ref no', 'transaction id', 'txn id', 'cheque no']
    };

    // Convert all keys to lowercase for matching
    const lowerRow = {};
    Object.keys(row).forEach(key => {
      lowerRow[key.toLowerCase().trim()] = row[key];
    });

    // Map to standardized columns
    for (const [standardKey, variations] of Object.entries(columnMappings)) {
      for (const variation of variations) {
        if (lowerRow[variation] !== undefined) {
          standardized[standardKey] = lowerRow[variation];
          break;
        }
      }
    }

    // Handle amount vs debit/credit
    if (!standardized.amount && (standardized.debit || standardized.credit)) {
      if (standardized.debit && parseFloat(standardized.debit) !== 0) {
        standardized.amount = -Math.abs(parseFloat(standardized.debit));
        standardized.type = 'debit';
      } else if (standardized.credit && parseFloat(standardized.credit) !== 0) {
        standardized.amount = Math.abs(parseFloat(standardized.credit));
        standardized.type = 'credit';
      }
    }

    return standardized;
  }

  /**
   * Validate if a row contains a valid transaction
   */
  isValidTransaction(row) {
    // Must have date and amount
    if (!row.date || (!row.amount && !row.debit && !row.credit)) {
      return false;
    }

    // Must have a valid amount
    const amount = parseFloat(row.amount) || parseFloat(row.debit) || parseFloat(row.credit);
    if (isNaN(amount) || amount === 0) {
      return false;
    }

    // Must have some description
    if (!row.description || row.description.trim() === '') {
      return false;
    }

    return true;
  }

  /**
   * Extract transactions from unstructured text (PDF, text files)
   */
  extractTransactionsFromText(text) {
    const transactions = [];
    const lines = text.split('\n');
    
    // Common patterns for bank statements
    const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
    const amountPattern = /[\$₹€£]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;
    
    for (const line of lines) {
      const dateMatch = line.match(datePattern);
      const amountMatches = line.match(new RegExp(amountPattern.source, 'g'));
      
      if (dateMatch && amountMatches && amountMatches.length > 0) {
        // Extract transaction details
        const transaction = {
          date: dateMatch[1],
          description: line.replace(datePattern, '').replace(amountPattern, '').trim(),
          amount: parseFloat(amountMatches[0].replace(/[^\d.-]/g, '')),
          rawLine: line
        };
        
        if (this.isValidTransaction(transaction)) {
          transactions.push(transaction);
        }
      }
    }
    
    return transactions;
  }

  /**
   * Generate transaction summary for validation
   */
  generateTransactionSummary(transactions) {
    const summary = {
      totalTransactions: transactions.length,
      totalDebits: 0,
      totalCredits: 0,
      dateRange: { earliest: null, latest: null },
      categories: new Set()
    };

    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount) || 0;
      
      if (amount < 0) {
        summary.totalDebits += Math.abs(amount);
      } else {
        summary.totalCredits += amount;
      }

      // Track date range
      const transDate = new Date(transaction.date);
      if (!summary.dateRange.earliest || transDate < summary.dateRange.earliest) {
        summary.dateRange.earliest = transDate;
      }
      if (!summary.dateRange.latest || transDate > summary.dateRange.latest) {
        summary.dateRange.latest = transDate;
      }
    });

    summary.netAmount = summary.totalCredits - summary.totalDebits;
    return summary;
  }

  /**
   * Structure the extracted data for bookkeeping AI
   */
  async structureFinancialData(extractedData, fileName) {
    return {
      documentInfo: {
        fileName: fileName,
        format: extractedData.format,
        processedAt: new Date().toISOString(),
        totalTransactions: extractedData.totalCount
      },
      transactions: extractedData.transactions || [],
      summary: extractedData.summary,
      metadata: {
        extractedText: extractedData.extractedText || null,
        sheetName: extractedData.sheetName || null,
        pages: extractedData.pages || null,
        requiresOCR: extractedData.requiresOCR || false
      },
      validationStatus: {
        isValid: (extractedData.transactions || []).length > 0,
        errors: [],
        warnings: []
      }
    };
  }
}

module.exports = new AdvancedDocumentParser();