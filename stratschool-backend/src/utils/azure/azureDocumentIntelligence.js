/**
 * Azure Document Intelligence Handler
 * Fallback for when AWS Textract cannot extract data from PDFs
 * Uses Azure's Layout API for document analysis
 */

const { DocumentAnalysisClient, AzureKeyCredential } = require('@azure/ai-form-recognizer');

/**
 * Analyze document using Azure Document Intelligence
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Object>} - Parsed bank statement data
 */
async function analyzeWithAzure(pdfBuffer) {
  try {
    console.log('🔷 Using Azure Document Intelligence as fallback...');
    console.log(`   PDF buffer size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    
    const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    
    if (!endpoint || !key) {
      console.error('❌ Azure Document Intelligence credentials not configured');
      return null;
    }
    
    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
    
    // Use prebuilt-layout model for table extraction
    console.log('   Starting Azure Layout analysis...');
    const poller = await client.beginAnalyzeDocument('prebuilt-layout', pdfBuffer);
    
    console.log('   Waiting for analysis to complete...');
    const result = await poller.pollUntilDone();
    
    console.log(`   ✅ Azure analysis complete`);
    console.log(`   Pages: ${result.pages?.length || 0}`);
    console.log(`   Tables: ${result.tables?.length || 0}`);
    console.log(`   Paragraphs: ${result.paragraphs?.length || 0}`);
    
    // Extract transactions from tables
    const transactions = [];
    let accountNumber = null;
    let accountHolder = null;
    let bankName = null;
    
    // Extract text content for account details
    const fullText = result.content || '';
    
    // Try to find account number
    const accountMatch = fullText.match(/(?:Account\s*(?:No|Number|#)?[:\s]*|A\/C\s*(?:No)?[:\s]*)(\d{10,20})/i);
    if (accountMatch) {
      accountNumber = accountMatch[1];
    }
    
    // Try to find bank name
    const bankPatterns = ['IDBI', 'HDFC', 'ICICI', 'SBI', 'AXIS', 'KOTAK', 'YES BANK', 'PNB', 'BOB', 'CANARA'];
    for (const bank of bankPatterns) {
      if (fullText.toUpperCase().includes(bank)) {
        bankName = bank + ' Bank';
        break;
      }
    }
    
    // Process tables for transactions
    if (result.tables && result.tables.length > 0) {
      console.log('   Processing tables for transactions...');
      
      for (const table of result.tables) {
        const headers = [];
        const rows = [];
        
        // Organize cells into rows
        const rowMap = {};
        for (const cell of table.cells) {
          const rowIndex = cell.rowIndex;
          if (!rowMap[rowIndex]) {
            rowMap[rowIndex] = [];
          }
          rowMap[rowIndex][cell.columnIndex] = cell.content?.trim() || '';
        }
        
        // First row is typically headers
        const sortedRowIndices = Object.keys(rowMap).map(Number).sort((a, b) => a - b);
        
        if (sortedRowIndices.length > 0) {
          const headerRow = rowMap[sortedRowIndices[0]];
          
          // Find column indices for date, description, debit, credit, balance
          let dateCol = -1, descCol = -1, debitCol = -1, creditCol = -1, balanceCol = -1;
          
          headerRow.forEach((header, idx) => {
            const h = (header || '').toLowerCase();
            if (h.includes('date') || h.includes('txn') || h.includes('value')) {
              if (dateCol === -1) dateCol = idx;
            }
            if (h.includes('particular') || h.includes('description') || h.includes('narration') || h.includes('details')) {
              descCol = idx;
            }
            if (h.includes('debit') || h.includes('withdraw') || h.includes('dr')) {
              debitCol = idx;
            }
            if (h.includes('credit') || h.includes('deposit') || h.includes('cr')) {
              creditCol = idx;
            }
            if (h.includes('balance') || h.includes('closing')) {
              balanceCol = idx;
            }
          });
          
          console.log(`   Column mapping: Date=${dateCol}, Desc=${descCol}, Debit=${debitCol}, Credit=${creditCol}, Balance=${balanceCol}`);
          
          // Process data rows
          for (let i = 1; i < sortedRowIndices.length; i++) {
            const row = rowMap[sortedRowIndices[i]];
            
            // Extract values
            const dateStr = dateCol >= 0 ? (row[dateCol] || '') : '';
            const desc = descCol >= 0 ? (row[descCol] || '') : '';
            const debitStr = debitCol >= 0 ? (row[debitCol] || '') : '';
            const creditStr = creditCol >= 0 ? (row[creditCol] || '') : '';
            const balanceStr = balanceCol >= 0 ? (row[balanceCol] || '') : '';
            
            // Parse amounts (remove commas, handle Indian number format)
            const parseAmount = (str) => {
              if (!str) return 0;
              const cleaned = str.replace(/[₹,\s]/g, '').replace(/[^0-9.-]/g, '');
              return parseFloat(cleaned) || 0;
            };
            
            const debit = parseAmount(debitStr);
            const credit = parseAmount(creditStr);
            const balance = parseAmount(balanceStr);
            
            // Only add if we have a valid date and some amount
            if (dateStr && (debit > 0 || credit > 0)) {
              transactions.push({
                date: dateStr,
                description: desc || 'Transaction',
                debit: debit,
                credit: credit,
                balance: balance,
                type: debit > 0 ? 'debit' : 'credit',
                amount: debit > 0 ? debit : credit
              });
            }
          }
        }
      }
    }
    
    // If no tables found, try to extract from paragraphs/lines
    if (transactions.length === 0 && result.paragraphs) {
      console.log('   No table transactions found, trying paragraph extraction...');
      
      // Look for transaction patterns in text
      const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/gi;
      const amountPattern = /(?:₹|Rs\.?|INR)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
      
      for (const para of result.paragraphs) {
        const text = para.content || '';
        const dateMatch = text.match(datePattern);
        const amountMatches = [...text.matchAll(amountPattern)];
        
        if (dateMatch && amountMatches.length > 0) {
          const amount = parseFloat(amountMatches[0][1].replace(/,/g, '')) || 0;
          if (amount > 0) {
            transactions.push({
              date: dateMatch[0],
              description: text.substring(0, 100),
              amount: amount,
              debit: text.toLowerCase().includes('dr') ? amount : 0,
              credit: text.toLowerCase().includes('cr') ? amount : 0,
              type: text.toLowerCase().includes('dr') ? 'debit' : 'credit',
              balance: 0
            });
          }
        }
      }
    }
    
    // Calculate summary
    const totalDebits = transactions.reduce((sum, tx) => sum + (tx.debit || 0), 0);
    const totalCredits = transactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);
    
    console.log(`   ✅ Azure extracted ${transactions.length} transactions`);
    console.log(`   Total Debits: ₹${totalDebits.toFixed(2)}`);
    console.log(`   Total Credits: ₹${totalCredits.toFixed(2)}`);
    
    return {
      account_number: accountNumber,
      account_holder: accountHolder,
      bank_name: bankName,
      transactions: transactions,
      summary: {
        total_debits: totalDebits,
        total_credits: totalCredits,
        transaction_count: transactions.length
      },
      source: 'azure-document-intelligence',
      rawContent: fullText.substring(0, 5000) // Store first 5000 chars for debugging
    };
    
  } catch (error) {
    console.error('❌ Azure Document Intelligence failed:', error.message);
    return null;
  }
}

module.exports = {
  analyzeWithAzure
};
