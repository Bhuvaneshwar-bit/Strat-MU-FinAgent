/**
 * Client-side PDF Text Extraction using pdf.js
 * Handles password-protected PDFs by extracting text in the browser
 * No server-side decryption needed - completely secure
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract text from a PDF file (handles password-protected PDFs)
 * @param {File} file - The PDF file object
 * @param {string} password - Password for protected PDFs (optional)
 * @returns {Promise<{success: boolean, text: string, pageCount: number, error?: string}>}
 */
export async function extractTextFromPDF(file, password = null) {
  try {
    console.log('📄 Starting client-side PDF extraction...');
    console.log(`   File: ${file.name}`);
    console.log(`   Size: ${(file.size / 1024).toFixed(2)} KB`);
    console.log(`   Password provided: ${password ? 'Yes' : 'No'}`);

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF with password if provided
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password || undefined,
    });

    const pdf = await loadingTask.promise;
    console.log(`✅ PDF loaded successfully. Pages: ${pdf.numPages}`);

    // Extract text from all pages
    let fullText = '';
    const pageTexts = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items with proper spacing
      let pageText = '';
      let lastY = null;
      
      for (const item of textContent.items) {
        // Add newline if Y position changed significantly (new line)
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        }
        pageText += item.str + ' ';
        lastY = item.transform[5];
      }
      
      pageTexts.push(pageText.trim());
      fullText += pageText + '\n\n';
      
      console.log(`   ✓ Page ${pageNum}/${pdf.numPages} extracted (${pageText.length} chars)`);
    }

    console.log(`✅ Total extracted: ${fullText.length} characters from ${pdf.numPages} pages`);

    return {
      success: true,
      text: fullText.trim(),
      pageCount: pdf.numPages,
      pageTexts: pageTexts
    };

  } catch (error) {
    console.error('❌ PDF extraction failed:', error.message);

    // Handle specific error types
    if (error.name === 'PasswordException') {
      if (error.code === 1) {
        // Need password
        return {
          success: false,
          error: 'PASSWORD_REQUIRED',
          message: 'This PDF is password protected. Please enter the password.'
        };
      } else if (error.code === 2) {
        // Incorrect password
        return {
          success: false,
          error: 'INCORRECT_PASSWORD',
          message: 'Incorrect password. Please try again.'
        };
      }
    }

    return {
      success: false,
      error: 'EXTRACTION_FAILED',
      message: error.message || 'Failed to extract text from PDF'
    };
  }
}

/**
 * Check if a PDF is password protected
 * @param {File} file - The PDF file object
 * @returns {Promise<{isProtected: boolean, error?: string}>}
 */
export async function checkPDFPasswordProtection(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
    });

    await loadingTask.promise;
    return { isProtected: false };

  } catch (error) {
    if (error.name === 'PasswordException') {
      return { isProtected: true };
    }
    // Other errors - might not be a valid PDF
    return { isProtected: false, error: error.message };
  }
}

/**
 * Parse bank statement text to extract transactions
 * Simple parser that looks for common patterns
 * @param {string} text - Extracted text from PDF
 * @returns {Array} - Array of transaction objects
 */
export function parseTransactionsFromText(text) {
  const transactions = [];
  const lines = text.split('\n');
  
  // Common date patterns
  const datePatterns = [
    /(\d{2}[-\/]\d{2}[-\/]\d{4})/,  // DD-MM-YYYY or DD/MM/YYYY
    /(\d{2}[-\/]\d{2}[-\/]\d{2})/,  // DD-MM-YY
    /(\d{4}[-\/]\d{2}[-\/]\d{2})/,  // YYYY-MM-DD
    /(\d{2}\s+\w{3}\s+\d{4})/,       // DD Mon YYYY
    /(\d{2}-\w{3}-\d{4})/,           // DD-Mon-YYYY
  ];
  
  // Amount patterns (Indian format with commas)
  const amountPattern = /(?:Rs\.?|₹|INR)?\s*([\d,]+\.?\d*)/gi;
  
  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;
    
    // Check if line contains a date
    let dateMatch = null;
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        dateMatch = match[1];
        break;
      }
    }
    
    if (dateMatch) {
      // This line likely contains a transaction
      const amounts = [];
      let match;
      while ((match = amountPattern.exec(line)) !== null) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0) {
          amounts.push(amount);
        }
      }
      
      if (amounts.length > 0) {
        transactions.push({
          date: dateMatch,
          description: line.replace(dateMatch, '').trim(),
          rawLine: line,
          amounts: amounts
        });
      }
    }
  }
  
  console.log(`📊 Parsed ${transactions.length} potential transactions from text`);
  return transactions;
}

export default {
  extractTextFromPDF,
  checkPDFPasswordProtection,
  parseTransactionsFromText
};
