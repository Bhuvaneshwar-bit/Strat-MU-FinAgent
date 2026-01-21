/**
 * AWS Textract Handler
 * Manages document analysis using AWS Textract
 * Extracts text, key-value pairs, tables, and forms from documents
 * Falls back to Gemini AI when Textract fails
 * 
 * @module textractHandler
 */

const {
  TextractClient,
  AnalyzeDocumentCommand,
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand
} = require('@aws-sdk/client-textract');
const { PDFDocument } = require('pdf-lib');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Filter out summary/total rows from transactions
 * These are not actual transactions but summaries
 */
function filterSummaryRows(transactions) {
  if (!transactions || !Array.isArray(transactions)) return [];
  
  const summaryPatterns = [
    /^total$/i,
    /^total\s*$/i,
    /total\s*debits?$/i,
    /total\s*credits?$/i,
    /total\s*dr\/cr/i,
    /total\s*transactions?/i,
    /grand\s*total/i,
    /sub\s*total/i,
    /statement\s*summary/i,
    /end\s*of\s*report/i,
    /end\s*of\s*statement/i,
    /opening\s*balance/i,
    /closing\s*balance/i,
    /balance\s*b\/f/i,
    /balance\s*c\/f/i,
  ];
  
  return transactions.filter(tx => {
    if (!tx || !tx.description) return true; // Keep if no description
    const desc = tx.description.toString().trim();
    
    // Check against patterns
    for (const pattern of summaryPatterns) {
      if (pattern.test(desc)) {
        console.log(`   ⏭️ Filtering out summary row: "${desc}"`);
        return false;
      }
    }
    return true;
  });
}

/**
 * Parse bank statement PDF directly using Gemini 1.5 Flash (supports PDF natively)
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Object>} - Structured transaction data
 */
async function parsePdfWithGemini(pdfBuffer) {
  try {
    console.log('🤖 Using Gemini 1.5 Flash to parse PDF directly...');
    console.log(`   PDF buffer size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not configured');
      return null;
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use gemini-2.0-flash which is the current model with PDF support
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Convert PDF buffer to base64
    const pdfBase64 = pdfBuffer.toString('base64');
    console.log(`   Base64 size: ${(pdfBase64.length / 1024).toFixed(2)} KB`);
    
    const prompt = `You are analyzing an Indian bank statement PDF. Extract ALL transactions from this document.

CRITICAL INSTRUCTIONS:
1. This is an Indian bank statement - amounts are in INR (₹)
2. Extract EVERY single transaction - do not skip any
3. For dates, use format DD-MM-YYYY
4. Identify transaction type: DEBIT (withdrawal/Dr) or CREDIT (deposit/Cr)
5. Extract the exact transaction amount
6. Return ONLY valid JSON, no markdown code blocks, no explanation

LOOK FOR:
- Account Number
- Account Holder Name  
- Bank Name (IDBI, HDFC, SBI, etc.)
- Transaction Date
- Description/Narration/Particulars
- Debit Amount (money going out)
- Credit Amount (money coming in)
- Balance after transaction

Return this EXACT JSON structure:
{
  "account_number": "account number or null",
  "account_holder": "name or null",
  "bank_name": "bank name or null",
  "transactions": [
    {
      "date": "DD-MM-YYYY",
      "description": "transaction description",
      "amount": 12345.67,
      "type": "debit" or "credit",
      "balance": balance after transaction or null
    }
  ],
  "summary": {
    "total_credits": sum of all credit amounts,
    "total_debits": sum of all debit amounts,
    "transaction_count": number of transactions
  }
}

Return ONLY the JSON, nothing else.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64
        }
      },
      prompt
    ]);
    
    const response = await result.response;
    let text = response.text();
    
    console.log(`   Gemini response length: ${text.length} chars`);
    
    // Clean up the response - remove markdown code blocks if present
    text = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    
    try {
      const parsed = JSON.parse(text);
      const txCount = parsed.transactions?.length || 0;
      console.log(`✅ Gemini extracted ${txCount} transactions from PDF`);
      
      if (txCount > 0) {
        return parsed;
      } else {
        console.log('⚠️ Gemini returned 0 transactions');
        return null;
      }
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response as JSON:', parseError.message);
      console.log('   Raw response (first 500 chars):', text.substring(0, 500));
      return null;
    }
    
  } catch (error) {
    console.error('❌ Gemini PDF parsing failed:', error.message);
    return null;
  }
}

/**
 * Parse bank statement transactions using Gemini AI
 * Used as fallback when Textract cannot extract tables from text-based PDFs
 * @param {string} rawText - Raw text extracted from PDF
 * @returns {Promise<Object>} - Structured transaction data
 */
async function parseTransactionsWithGemini(rawText) {
  try {
    console.log('🤖 Using Gemini 2.5 Flash to parse bank statement text...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not configured');
      return null;
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `You are a bank statement parser. Extract ALL transactions from this bank statement text.

IMPORTANT RULES:
1. Extract EVERY individual transaction line - do not skip any
2. Identify the date (DD-MM-YYYY or DD/MM/YYYY format)
3. Identify the description/narration
4. Identify if it's a DEBIT (money out) or CREDIT (money in)
5. Extract the transaction amount (ignore the balance column)
6. Return ONLY valid JSON, no markdown, no explanation

CRITICAL - EXCLUDE THESE (they are NOT transactions):
- Rows with description "Total" or "Grand Total" or "Sub Total"
- Rows labeled "Total Debits" or "Total Credits"
- Rows showing "Opening Balance" or "Closing Balance"
- Rows showing "Balance B/F" or "Balance C/F"
- Summary rows or totals at the end
- Header rows with column names

Look for patterns like:
- Date columns (transaction date, value date)
- Description/Particulars/Narration column
- Debit Amount column (withdrawals)
- Credit Amount column (deposits)
- Balance column (ignore this for transaction amount)

BANK STATEMENT TEXT:
${rawText.substring(0, 30000)}

Return a JSON object with this EXACT structure:
{
  "account_number": "extracted account number or null",
  "account_holder": "extracted name or null",
  "bank_name": "extracted bank name or null",
  "opening_balance": number or null,
  "closing_balance": number or null,
  "transactions": [
    {
      "date": "DD-MM-YYYY",
      "description": "transaction description",
      "amount": 12345.67,
      "type": "debit" or "credit",
      "balance": number or null
    }
  ],
  "summary": {
    "total_credits": total of all credit amounts,
    "total_debits": total of all debit amounts,
    "transaction_count": number of transactions
  }
}

Return ONLY the JSON object, nothing else.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean up the response - remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const parsed = JSON.parse(text);
      console.log(`✅ Gemini extracted ${parsed.transactions?.length || 0} transactions`);
      return parsed;
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response as JSON:', parseError.message);
      console.log('   Raw response:', text.substring(0, 500));
      return null;
    }
    
  } catch (error) {
    console.error('❌ Gemini parsing failed:', error.message);
    return null;
  }
}

/**
 * Process pre-extracted text from password-protected PDF using Gemini
 * This is used when pdf-parse successfully extracts text using the password
 * @param {string} extractedText - Raw text extracted from PDF using password
 * @returns {Promise<Object>} - Structured data compatible with the rest of the pipeline
 */
async function analyzePreExtractedText(extractedText) {
  try {
    console.log('📝 Processing pre-extracted text from password-protected PDF...');
    console.log(`   Text length: ${extractedText.length} characters`);
    
    if (!extractedText || extractedText.length < 50) {
      console.log('⚠️ Pre-extracted text is too short, skipping...');
      return null;
    }
    
    // Use Gemini to parse the extracted text
    const geminiResult = await parseTransactionsWithGemini(extractedText);
    
    if (geminiResult && geminiResult.transactions && geminiResult.transactions.length > 0) {
      // Filter out summary rows like "Total", "Grand Total", etc.
      const filteredTransactions = filterSummaryRows(geminiResult.transactions);
      console.log(`✅ Gemini parsed ${geminiResult.transactions.length} transactions, ${filteredTransactions.length} after filtering`);
      
      return {
        text: [],
        keyValuePairs: [],
        tables: [],
        rawText: extractedText,
        pageCount: 0,
        source: 'password-protected-pdf-parse',
        geminiParsed: geminiResult,
        parsedTransactions: filteredTransactions.map(tx => ({
          date: tx.date,
          description: tx.description,
          debit: tx.type === 'debit' ? tx.amount : 0,
          credit: tx.type === 'credit' ? tx.amount : 0,
          balance: tx.balance || 0
        })),
        summary: geminiResult.summary
      };
    }
    
    console.log('⚠️ Gemini could not parse transactions from pre-extracted text');
    return null;
    
  } catch (error) {
    console.error('❌ Pre-extracted text processing failed:', error.message);
    return null;
  }
}

/**
 * Parse bank statement PDF directly using Gemini 2.5 Pro Vision
 * Used when pdf-parse fails to extract text from corrupted/encoded PDFs
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Object>} - Structured transaction data
 */
async function parsePdfWithGeminiVision(pdfBuffer) {
  try {
    console.log('🤖 Using Gemini 2.5 Pro to parse PDF directly (vision mode)...');
    console.log(`   PDF buffer size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not configured');
      return null;
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try different models in order of capability
    const modelsToTry = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`   Trying model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // Convert PDF buffer to base64
        const pdfBase64 = pdfBuffer.toString('base64');
        console.log(`   Base64 size: ${(pdfBase64.length / 1024).toFixed(2)} KB`);
        
        const prompt = `You are analyzing an Indian bank statement PDF. Extract ALL transactions from this document.

IMPORTANT RULES:
1. This is an Indian bank statement - look for INR/Rs amounts
2. Extract EVERY transaction - do not skip any
3. Identify the date (DD-MM-YYYY or DD/MM/YYYY format, or DD MMM YYYY)
4. Identify the description/narration/particulars
5. Identify if it's a DEBIT (Dr, withdrawal, money out) or CREDIT (Cr, deposit, money in)
6. Extract the transaction amount
7. Look for account number, account holder name, bank name
8. Return ONLY valid JSON, no markdown, no explanation

Return a JSON object with this EXACT structure:
{
  "account_number": "extracted account number or null",
  "account_holder": "extracted name or null",
  "bank_name": "extracted bank name or null",
  "opening_balance": number or null,
  "closing_balance": number or null,
  "transactions": [
    {
      "date": "DD-MM-YYYY",
      "description": "transaction description",
      "amount": 12345.67,
      "type": "debit" or "credit",
      "balance": number or null
    }
  ],
  "summary": {
    "total_credits": total of all credit amounts,
    "total_debits": total of all debit amounts,
    "transaction_count": number of transactions
  }
}

Return ONLY the JSON object, nothing else.`;

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64
            }
          }
        ]);
        
        const response = await result.response;
        let text = response.text();
        
        // Clean up the response - remove markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        try {
          const parsed = JSON.parse(text);
          if (parsed.transactions && parsed.transactions.length > 0) {
            console.log(`✅ ${modelName} extracted ${parsed.transactions.length} transactions from PDF`);
            return parsed;
          } else {
            console.log(`⚠️ ${modelName} returned 0 transactions, trying next model...`);
          }
        } catch (parseError) {
          console.error(`❌ Failed to parse ${modelName} response as JSON:`, parseError.message);
          console.log('   Raw response:', text.substring(0, 300));
        }
        
      } catch (modelError) {
        console.log(`⚠️ ${modelName} failed: ${modelError.message}`);
        // Continue to next model
      }
    }
    
    console.error('❌ All Gemini models failed to parse PDF');
    return null;
    
  } catch (error) {
    console.error('❌ Gemini Vision PDF parsing failed:', error.message);
    return null;
  }
}

/**
 * Extract text directly from PDF using pdf-parse (fallback for text-based PDFs)
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Object>} - Extracted text data
 */
async function extractTextWithPdfParse(pdfBuffer) {
  try {
    console.log('📝 Using pdf-parse for text extraction (fallback)...');
    const data = await pdfParse(pdfBuffer);
    
    // Split text into lines and create block-like structure
    const lines = data.text.split('\n').filter(line => line.trim());
    console.log(`   Extracted ${lines.length} lines of text`);
    
    const textBlocks = lines.map((line, index) => ({
      text: line.trim(),
      confidence: 100,
      geometry: null,
      page: Math.floor(index / 50) + 1 // Approximate page number
    }));
    
    return {
      text: textBlocks,
      keyValuePairs: [],
      tables: [],
      rawText: data.text,
      pageCount: data.numpages,
      source: 'pdf-parse'
    };
  } catch (error) {
    console.error('❌ pdf-parse extraction failed:', error.message);
    return null;
  }
}

/**
 * Create Textract client with static credentials
 * This function ensures proper credential loading from environment variables
 */
function createTextractClient() {
  // Validate credentials exist
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env file');
  }

  console.log('🔑 Initializing AWS Textract client...');
  console.log(`   Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`   Access Key: ${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...`);

  return new TextractClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
}

// Initialize Textract Client
let textractClient = createTextractClient();

/**
 * Analyze document using Textract with PDF buffer (Direct upload, no S3)
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Object>} - Textract response with blocks
 */
async function analyzeDocumentFromBuffer(pdfBuffer) {
  try {
    console.log('🔍 Starting Textract analysis from buffer...');
    console.log(`   Buffer size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    
    // Validate buffer size (max 10MB for synchronous - increased limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (pdfBuffer.length > maxSize) {
      console.warn(`⚠️  PDF is large (${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB). This may take longer to process.`);
      // Don't throw error, just warn - Textract can handle up to 10MB
    }
    
    const params = {
      Document: {
        Bytes: pdfBuffer  // Direct buffer upload
      },
      FeatureTypes: [
        'TABLES',      // Extract tables
        'FORMS',       // Extract key-value pairs
        'LAYOUT'       // Extract layout elements (better for text-based PDFs)
      ]
    };
    
    const command = new AnalyzeDocumentCommand(params);
    
    console.log('   Sending request to AWS Textract...');
    const response = await textractClient.send(command);
    
    console.log(`✅ Textract analysis complete. Found ${response.Blocks?.length || 0} blocks`);
    
    return response;
    
  } catch (error) {
    console.error('❌ Textract analysis failed:', error);
    
    // Handle specific AWS errors
    if (error.name === 'InvalidClientTokenId') {
      throw new Error('INVALID_AWS_CREDENTIALS: The AWS access key ID is invalid. Check your AWS_ACCESS_KEY_ID in .env file');
    }
    
    if (error.name === 'SignatureDoesNotMatch') {
      throw new Error('INVALID_AWS_SECRET: The AWS secret access key is incorrect. Check your AWS_SECRET_ACCESS_KEY in .env file');
    }
    
    if (error.name === 'ExpiredToken' || error.name === 'ExpiredTokenException') {
      throw new Error('EXPIRED_AWS_CREDENTIALS: Your AWS credentials have expired. Update them in .env file');
    }
    
    if (error.name === 'AccessDeniedException') {
      throw new Error('TEXTRACT_ACCESS_DENIED: Your AWS user does not have permission to use Textract. Add AmazonTextractFullAccess policy');
    }
    
    if (error.name === 'InvalidParameterException') {
      throw new Error('INVALID_PDF: The PDF format is not supported by Textract');
    }
    
    if (error.name === 'UnsupportedDocumentException') {
      throw new Error('UNSUPPORTED_DOCUMENT: This document type is not supported by Textract');
    }
    
    if (error.message?.includes('too large')) {
      throw new Error('PDF_TOO_LARGE: File exceeds 5MB limit for direct upload');
    }
    
    throw new Error(`TEXTRACT_ERROR: ${error.message || error.name || 'Unknown error'}`);
  }
}

/**
 * Split a multi-page PDF into individual page buffers
 * @param {Buffer} pdfBuffer - Multi-page PDF buffer
 * @returns {Promise<Buffer[]>} - Array of single-page PDF buffers
 */
async function splitPdfPages(pdfBuffer) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    console.log(`📄 PDF has ${pageCount} page(s)`);
    
    if (pageCount === 1) {
      return [pdfBuffer];
    }
    
    const pageBuffers = [];
    for (let i = 0; i < pageCount; i++) {
      const singlePagePdf = await PDFDocument.create();
      const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
      singlePagePdf.addPage(copiedPage);
      const pageBytes = await singlePagePdf.save();
      pageBuffers.push(Buffer.from(pageBytes));
      console.log(`   ✓ Extracted page ${i + 1}/${pageCount}`);
    }
    
    return pageBuffers;
  } catch (error) {
    console.error('❌ Failed to split PDF pages:', error.message);
    throw new Error(`PDF_SPLIT_ERROR: ${error.message}`);
  }
}

/**
 * Analyze multi-page PDF by splitting and processing each page
 * @param {Buffer} pdfBuffer - PDF file buffer (can be multi-page)
 * @returns {Promise<Object>} - Combined Textract response from all pages
 */
async function analyzeMultiPagePdfFromBuffer(pdfBuffer) {
  try {
    console.log('🔍 Starting multi-page Textract analysis...');
    
    // Split PDF into individual pages
    const pageBuffers = await splitPdfPages(pdfBuffer);
    
    if (pageBuffers.length === 1) {
      // Single page - use regular processing
      return await analyzeDocumentFromBuffer(pdfBuffer);
    }
    
    console.log(`📑 Processing ${pageBuffers.length} pages with Textract...`);
    
    // Process each page
    const allBlocks = [];
    let pageOffset = 0;
    
    for (let i = 0; i < pageBuffers.length; i++) {
      console.log(`   Processing page ${i + 1}/${pageBuffers.length}...`);
      try {
        const response = await analyzeDocumentFromBuffer(pageBuffers[i]);
        
        // Add page number to blocks and offset IDs to avoid collisions
        if (response.Blocks) {
          response.Blocks.forEach(block => {
            block.Page = i + 1;
            allBlocks.push(block);
          });
        }
        
        // Small delay to avoid rate limiting
        if (i < pageBuffers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (pageError) {
        console.warn(`   ⚠️ Page ${i + 1} failed: ${pageError.message}`);
        // Continue with other pages
      }
    }
    
    console.log(`✅ Multi-page analysis complete. Total blocks: ${allBlocks.length}`);
    
    return {
      Blocks: allBlocks,
      DocumentMetadata: {
        Pages: pageBuffers.length
      }
    };
    
  } catch (error) {
    console.error('❌ Multi-page analysis failed:', error.message);
    throw error;
  }
}

/**
 * Analyze document using Textract (S3-based - for backward compatibility)
 * @param {string} s3Bucket - S3 bucket name
 * @param {string} s3Key - S3 object key
 * @returns {Promise<Object>} - Textract response with blocks
 */
async function analyzeDocument(s3Bucket, s3Key) {
  try {
    console.log('🔍 Starting Textract S3 analysis...');
    
    const params = {
      Document: {
        S3Object: {
          Bucket: s3Bucket,
          Name: s3Key
        }
      },
      FeatureTypes: ['TABLES', 'FORMS']
    };
    
    const command = new AnalyzeDocumentCommand(params);
    const response = await textractClient.send(command);
    
    console.log(`✅ Textract analysis complete. Found ${response.Blocks?.length || 0} blocks`);
    
    return response;
    
  } catch (error) {
    console.error('❌ Textract S3 analysis failed:', error.message);
    
    if (error.name === 'InvalidS3ObjectException') {
      throw new Error('TEXTRACT_S3_ERROR: Cannot access the S3 object. Check bucket and key.');
    }
    
    if (error.name === 'AccessDeniedException') {
      throw new Error('TEXTRACT_ACCESS_DENIED: Check your AWS credentials and IAM permissions');
    }
    
    throw new Error(`TEXTRACT_ERROR: ${error.message}`);
  }
}

/**
 * Start asynchronous document analysis (for multi-page documents)
 * @param {string} s3Bucket - S3 bucket name
 * @param {string} s3Key - S3 object key
 * @returns {Promise<string>} - Job ID
 */
async function startDocumentAnalysis(s3Bucket, s3Key) {
  try {
    console.log('🚀 Starting Textract asynchronous analysis...');
    
    const params = {
      DocumentLocation: {
        S3Object: {
          Bucket: s3Bucket,
          Name: s3Key
        }
      },
      FeatureTypes: ['TABLES', 'FORMS', 'SIGNATURES', 'LAYOUT']
    };
    
    const command = new StartDocumentAnalysisCommand(params);
    const response = await textractClient.send(command);
    
    console.log(`✅ Textract job started. Job ID: ${response.JobId}`);
    
    return response.JobId;
    
  } catch (error) {
    console.error('❌ Failed to start Textract job:', error.message);
    throw new Error(`TEXTRACT_START_ERROR: ${error.message}`);
  }
}

/**
 * Get results of asynchronous document analysis
 * @param {string} jobId - Textract job ID
 * @param {number} maxRetries - Maximum polling attempts
 * @returns {Promise<Object>} - Complete Textract response
 */
async function getDocumentAnalysis(jobId, maxRetries = 60) {
  try {
    console.log(`⏳ Polling Textract job: ${jobId}`);
    
    let attempts = 0;
    let response;
    
    while (attempts < maxRetries) {
      const command = new GetDocumentAnalysisCommand({ JobId: jobId });
      response = await textractClient.send(command);
      
      if (response.JobStatus === 'SUCCEEDED') {
        console.log('✅ Textract job completed successfully');
        return response;
      }
      
      if (response.JobStatus === 'FAILED') {
        throw new Error(`Textract job failed: ${response.StatusMessage}`);
      }
      
      // Job still in progress - wait and retry
      console.log(`⏳ Job status: ${response.JobStatus}. Retrying in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
    
    throw new Error('TEXTRACT_TIMEOUT: Job did not complete within expected time');
    
  } catch (error) {
    console.error('❌ Failed to get Textract results:', error.message);
    throw new Error(`TEXTRACT_GET_ERROR: ${error.message}`);
  }
}

/**
 * Process Textract response and extract structured data
 * @param {Object} textractResponse - Raw Textract response
 * @returns {Object} - Structured extracted data
 */
function processTextractResponse(textractResponse) {
  const blocks = textractResponse.Blocks || [];
  
  // Initialize result structure
  const result = {
    text: [],
    keyValuePairs: [],
    tables: [],
    metadata: {
      totalBlocks: blocks.length,
      documentMetadata: textractResponse.DocumentMetadata
    }
  };
  
  // Block maps for relationships
  const blockMap = {};
  blocks.forEach(block => {
    blockMap[block.Id] = block;
  });
  
  // Extract different types of data
  blocks.forEach(block => {
    switch (block.BlockType) {
      case 'LINE':
        // Extract text lines
        if (block.Text) {
          result.text.push({
            text: block.Text,
            confidence: block.Confidence,
            geometry: block.Geometry
          });
        }
        break;
        
      case 'KEY_VALUE_SET':
        // Extract form key-value pairs
        if (block.EntityTypes && block.EntityTypes.includes('KEY')) {
          const keyValue = extractKeyValue(block, blockMap);
          if (keyValue) {
            result.keyValuePairs.push(keyValue);
          }
        }
        break;
        
      case 'TABLE':
        // Extract tables
        const table = extractTable(block, blockMap);
        if (table) {
          result.tables.push(table);
        }
        break;
    }
  });
  
  return result;
}

/**
 * Extract key-value pair from KEY block
 * @param {Object} keyBlock - KEY block from Textract
 * @param {Object} blockMap - Map of all blocks
 * @returns {Object|null} - Key-value pair
 */
function extractKeyValue(keyBlock, blockMap) {
  try {
    const key = getBlockText(keyBlock, blockMap);
    
    // Find associated VALUE block
    const valueRelationship = keyBlock.Relationships?.find(
      rel => rel.Type === 'VALUE'
    );
    
    if (!valueRelationship) return null;
    
    const valueBlockId = valueRelationship.Ids[0];
    const valueBlock = blockMap[valueBlockId];
    const value = getBlockText(valueBlock, blockMap);
    
    return {
      key: key.trim(),
      value: value.trim(),
      confidence: Math.min(keyBlock.Confidence || 0, valueBlock?.Confidence || 0)
    };
  } catch (error) {
    console.warn('Failed to extract key-value pair:', error.message);
    return null;
  }
}

/**
 * Extract table from TABLE block
 * @param {Object} tableBlock - TABLE block from Textract
 * @param {Object} blockMap - Map of all blocks
 * @returns {Object|null} - Structured table data
 */
function extractTable(tableBlock, blockMap) {
  try {
    const table = {
      rows: [],
      rowCount: 0,
      columnCount: 0
    };
    
    // Find CELL blocks
    const cellRelationships = tableBlock.Relationships?.find(
      rel => rel.Type === 'CHILD'
    );
    
    if (!cellRelationships) return null;
    
    const cells = cellRelationships.Ids
      .map(id => blockMap[id])
      .filter(block => block && block.BlockType === 'CELL');
    
    // Group cells by row
    const rowMap = {};
    cells.forEach(cell => {
      const rowIndex = cell.RowIndex;
      if (!rowMap[rowIndex]) {
        rowMap[rowIndex] = [];
      }
      rowMap[rowIndex].push({
        columnIndex: cell.ColumnIndex,
        text: getBlockText(cell, blockMap).trim(),
        confidence: cell.Confidence
      });
    });
    
    // Convert to array and sort
    Object.keys(rowMap).sort((a, b) => a - b).forEach(rowIndex => {
      const row = rowMap[rowIndex].sort((a, b) => a.columnIndex - b.columnIndex);
      table.rows.push(row.map(cell => cell.text));
      table.columnCount = Math.max(table.columnCount, row.length);
    });
    
    table.rowCount = table.rows.length;
    
    return table;
  } catch (error) {
    console.warn('Failed to extract table:', error.message);
    return null;
  }
}

/**
 * Get text content from a block and its children
 * @param {Object} block - Textract block
 * @param {Object} blockMap - Map of all blocks
 * @returns {string} - Extracted text
 */
function getBlockText(block, blockMap) {
  if (block.Text) {
    return block.Text;
  }
  
  // Get text from child blocks
  const childRelationship = block.Relationships?.find(rel => rel.Type === 'CHILD');
  if (!childRelationship) return '';
  
  const childTexts = childRelationship.Ids
    .map(id => blockMap[id])
    .filter(child => child && child.Text)
    .map(child => child.Text);
  
  return childTexts.join(' ');
}

/**
 * Main function: Analyze document from buffer (RECOMMENDED)
 * Automatically handles multi-page PDFs by splitting them
 * Falls back to Gemini AI if Textract doesn't extract enough
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Object>} - Processed Textract results
 */
async function analyzeDocumentFromBufferComplete(pdfBuffer) {
  try {
    console.log('📄 Starting complete Textract analysis from buffer...');
    
    // STEP 1: Try direct PDF analysis with Textract (works for most bank statements)
    const textractResponse = await analyzeMultiPagePdfFromBuffer(pdfBuffer);
    let processedData = processTextractResponse(textractResponse);
    
    // Check if Textract extracted enough content
    const textBlockCount = processedData.text?.length || 0;
    const tableCount = processedData.tables?.length || 0;
    
    console.log(`   Textract extracted: ${textBlockCount} text blocks, ${tableCount} tables`);
    
    // If we have tables, use existing Textract flow (works for HDFC, SBI, etc.)
    if (tableCount > 0) {
      console.log('✅ Tables found - using standard Textract table extraction flow');
      return processedData;
    }
    
    // If we have enough text blocks, use Textract results
    if (textBlockCount >= 50) {
      console.log('✅ Sufficient text extracted - using standard Textract flow');
      return processedData;
    }
    
    // STEP 2: Textract failed to extract data - use Gemini AI as fallback
    console.log('⚠️  Textract found minimal content, using Gemini AI as fallback...');
    
    const geminiResult = await parsePdfWithGemini(pdfBuffer);
    
    if (geminiResult && geminiResult.transactions && geminiResult.transactions.length > 0) {
      // Filter out summary rows
      const filteredTransactions = filterSummaryRows(geminiResult.transactions);
      console.log(`✅ Gemini AI extracted ${geminiResult.transactions.length} transactions, ${filteredTransactions.length} after filtering`);
      
      return {
        text: [],
        keyValuePairs: [],
        tables: [],
        rawText: '',
        pageCount: 0,
        source: 'gemini-ai',
        geminiParsed: geminiResult,
        parsedTransactions: filteredTransactions.map(tx => ({
          date: tx.date,
          description: tx.description,
          debit: tx.type === 'debit' ? tx.amount : 0,
          credit: tx.type === 'credit' ? tx.amount : 0,
          balance: tx.balance || 0
        })),
        summary: geminiResult.summary
      };
    }
    
    // Return whatever we got from Textract as last fallback
    console.log('⚠️  Gemini also found no transactions, returning original Textract results');
    return processedData;
    
  } catch (error) {
    console.error('❌ Complete document analysis failed:', error.message);
    
    // Last resort: try Gemini directly
    console.log('🔄 Attempting Gemini AI as last resort...');
    try {
      const geminiResult = await parsePdfWithGemini(pdfBuffer);
      if (geminiResult && geminiResult.transactions?.length > 0) {
        // Filter out summary rows
        const filteredTransactions = filterSummaryRows(geminiResult.transactions);
        console.log('✅ Last resort Gemini analysis succeeded');
        return {
          text: [],
          source: 'gemini-ai',
          geminiParsed: geminiResult,
          parsedTransactions: filteredTransactions.map(tx => ({
            date: tx.date,
            description: tx.description,
            debit: tx.type === 'debit' ? tx.amount : 0,
            credit: tx.type === 'credit' ? tx.amount : 0,
            balance: tx.balance || 0
          })),
          summary: geminiResult.summary
        };
      }
    } catch (fallbackError) {
      console.error('❌ Gemini fallback also failed:', fallbackError.message);
    }
    
    throw error;
  }
}

/**
 * Main function: Analyze document with automatic method selection (S3-based)
 * @param {string} s3Bucket - S3 bucket name
 * @param {string} s3Key - S3 object key
 * @param {boolean} async - Force async processing
 * @returns {Promise<Object>} - Processed Textract results
 */
async function analyzeDocumentComplete(s3Bucket, s3Key, async = false) {
  try {
    let textractResponse;
    
    if (async) {
      // Use asynchronous processing for multi-page documents
      const jobId = await startDocumentAnalysis(s3Bucket, s3Key);
      textractResponse = await getDocumentAnalysis(jobId);
    } else {
      // Use synchronous processing for single-page documents
      textractResponse = await analyzeDocument(s3Bucket, s3Key);
    }
    
    // Process and structure the response
    const processedData = processTextractResponse(textractResponse);
    
    return processedData;
    
  } catch (error) {
    console.error('❌ Complete document analysis failed:', error.message);
    throw error;
  }
}

module.exports = {
  analyzeDocument,
  analyzeDocumentFromBuffer,
  analyzeDocumentFromBufferComplete,
  analyzeMultiPagePdfFromBuffer,
  analyzePreExtractedText,
  splitPdfPages,
  startDocumentAnalysis,
  getDocumentAnalysis,
  processTextractResponse,
  analyzeDocumentComplete,
  extractTextWithPdfParse,
  parseTransactionsWithGemini,
  parsePdfWithGeminiVision,
  textractClient,
  createTextractClient
};
