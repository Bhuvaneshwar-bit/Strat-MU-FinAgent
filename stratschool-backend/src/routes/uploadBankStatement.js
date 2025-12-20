/**
 * Bank Statement Upload Route
 * Handles PDF upload, password protection handling, AWS Textract processing
 * 
 * @route POST /api/upload/bank-statement
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const { processPdf, deleteTempFile } = require('../utils/aws/decryptPdf');
const { analyzeDocumentFromBufferComplete } = require('../utils/aws/textractHandler');
const { parseBankStatement } = require('../utils/aws/parseBankStatement');
const authenticate = require('../middleware/auth');
const PLStatement = require('../models/PLStatement');

// Configure multer for memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE: Only PDF files are allowed'), false);
    }
  }
});

/**
 * Optional authentication middleware - allows both authenticated and guest uploads
 */
const optionalAuth = (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } else {
      req.user = { id: 'guest', userId: 'guest' };
    }
    next();
  } catch (error) {
    // If token is invalid, still allow as guest
    req.user = { id: 'guest', userId: 'guest' };
    next();
  }
};

/**
 * @route   POST /api/upload/bank-statement
 * @desc    Upload and process password-protected bank statement PDF
 * @access  Public (Optional Auth)
 * @body    {file} pdf - PDF file (multipart/form-data)
 * @body    {string} password - PDF password (optional)
 * @body    {boolean} async - Use async Textract processing (default: false)
 */
router.post('/bank-statement', optionalAuth, upload.single('pdf'), async (req, res) => {
  let tempFilePath = null;
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('📤 BANK STATEMENT UPLOAD REQUEST');
    console.log('='.repeat(60));
    
    // Validate request
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'NO_FILE',
        message: 'No PDF file uploaded'
      });
    }
    
    const { password } = req.body;
    const userId = req.user?.id || req.user?.userId || 'anonymous';
    
    console.log(`📄 File: ${req.file.originalname}`);
    console.log(`📊 Size: ${(req.file.size / 1024).toFixed(2)} KB`);
    console.log(`👤 User: ${userId}`);
    console.log(`🔐 Password provided: ${password ? 'Yes' : 'No'}`);
    
    // Step 1: Process PDF (decrypt if password-protected)
    console.log('\n🔐 STEP 1: PDF Processing...');
    console.log('-'.repeat(60));
    let pdfResult;
    try {
      pdfResult = await processPdf(
        req.file.buffer,
        password,
        req.file.originalname
      );
      tempFilePath = pdfResult.tempPath;
      
      console.log(`✅ PDF processed successfully`);
      console.log(`   Was encrypted: ${pdfResult.wasEncrypted}`);
      console.log(`   Buffer size: ${(pdfResult.buffer.length / 1024).toFixed(2)} KB`);
      
    } catch (error) {
      console.error(`❌ PDF processing failed: ${error.message}`);
      
      if (error.message.includes('PASSWORD_REQUIRED')) {
        return res.status(400).json({
          success: false,
          error: 'PASSWORD_REQUIRED',
          message: 'This PDF is password protected. Please provide the password.',
          passwordRequired: true
        });
      }
      
      if (error.message.includes('INCORRECT_PASSWORD')) {
        return res.status(400).json({
          success: false,
          error: 'INCORRECT_PASSWORD',
          message: 'The provided password is incorrect',
          passwordRequired: true
        });
      }
      
      throw error;
    }
    
    // Step 2: Process with AWS Textract (Direct buffer upload - NO S3!)
    console.log('\n🔍 STEP 2: AWS Textract Analysis...');
    console.log('-'.repeat(60));
    let textractData;
    try {
      textractData = await analyzeDocumentFromBufferComplete(pdfResult.buffer);
      
      console.log(`✅ Textract analysis completed`);
      console.log(`   Text blocks: ${textractData.text?.length || 0}`);
      console.log(`   Key-value pairs: ${textractData.keyValuePairs?.length || 0}`);
      console.log(`   Tables found: ${textractData.tables?.length || 0}`);
      
    } catch (error) {
      console.error(`❌ Textract analysis failed: ${error.message}`);
      throw error;
    }
    
    // Step 3: Parse bank statement
    console.log('\n📊 STEP 3: Bank Statement Parsing...');
    console.log('-'.repeat(60));
    let bankStatement;
    try {
      // Check if Gemini already parsed the transactions (either from text or vision)
      if ((textractData.source === 'gemini-ai' || textractData.source === 'gemini-vision') && 
          textractData.parsedTransactions && textractData.parsedTransactions.length > 0) {
        console.log(`   Using ${textractData.source === 'gemini-vision' ? 'Gemini Vision' : 'Gemini AI'} parsed transactions...`);
        const geminiData = textractData.geminiParsed;
        
        // Convert Gemini format to standard format
        bankStatement = {
          account_number: geminiData.account_number || 'Unknown',
          account_holder: geminiData.account_holder || 'Unknown',
          bank_name: geminiData.bank_name || 'Unknown Bank',
          opening_balance: geminiData.opening_balance || 0,
          closing_balance: geminiData.closing_balance || 0,
          transactions: textractData.parsedTransactions.map(tx => ({
            date: tx.date,
            description: tx.description,
            amount: tx.debit > 0 ? -tx.debit : tx.credit,
            type: tx.debit > 0 ? 'debit' : 'credit',
            debit: tx.debit,
            credit: tx.credit,
            balance: tx.balance,
            category: 'Uncategorized'
          })),
          summary: textractData.summary || {
            total_credits: textractData.parsedTransactions.reduce((sum, tx) => sum + (tx.credit || 0), 0),
            total_debits: textractData.parsedTransactions.reduce((sum, tx) => sum + (tx.debit || 0), 0),
            transaction_count: textractData.parsedTransactions.length
          },
          source: textractData.source
        };
        
        console.log(`✅ ${textractData.source === 'gemini-vision' ? 'Gemini Vision' : 'Gemini AI'} parsed ${bankStatement.transactions.length} transactions`);
      } else {
        // Use traditional Textract parsing
        bankStatement = parseBankStatement(textractData);
      }
      
      console.log(`✅ Bank statement parsed successfully`);
      console.log(`   Account: ${bankStatement.account_number || 'Not found'}`);
      console.log(`   Holder: ${bankStatement.account_holder || 'Not found'}`);
      console.log(`   Transactions: ${bankStatement.transactions?.length || 0}`);
      
    } catch (error) {
      console.error(`❌ Parsing failed: ${error.message}`);
      throw new Error(`Bank statement parsing failed: ${error.message}`);
    }
    
    // Step 4: Cleanup temp file
    console.log('\n🧹 STEP 4: Cleanup...');
    console.log('-'.repeat(60));
    if (tempFilePath) {
      await deleteTempFile(tempFilePath);
      console.log(`✅ Temporary file deleted`);
    }
    
    // Success response
    console.log('\n' + '='.repeat(60));
    console.log('✅ PROCESSING COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   Account: ${bankStatement.account_number}`);
    console.log(`   Transactions: ${bankStatement.transactions?.length || 0}`);
    console.log(`   Total Credits: ₹${bankStatement.summary?.total_credits || 0}`);
    console.log(`   Total Debits: ₹${bankStatement.summary?.total_debits || 0}`);
    console.log('='.repeat(60) + '\n');
    
    // 🔥 SAVE TO DATABASE FOR CROSS-DEVICE SYNC
    console.log('💾 Saving to database for cross-device sync...');
    try {
      const userId = req.user?.userId || req.body?.userId || 'anonymous-user';
      console.log(`   User ID: ${userId}`);
      
      // Calculate financial metrics from bank statement
      const totalRevenue = bankStatement.summary?.total_credits || 0;
      const totalExpenses = bankStatement.summary?.total_debits || 0;
      const netIncome = totalRevenue - totalExpenses;
      const transactionCount = bankStatement.transactions?.length || 0;
      
      // Categorize transactions for P&L breakdown (as arrays for schema)
      const revenueCategories = [];
      const expenseCategories = [];
      const categoryTotals = {};
      
      if (bankStatement.transactions && Array.isArray(bankStatement.transactions)) {
        bankStatement.transactions.forEach(txn => {
          const category = txn.category || 'Uncategorized';
          const amount = Math.abs(parseFloat(txn.amount) || 0);
          
          if (!categoryTotals[category]) {
            categoryTotals[category] = { credits: 0, debits: 0, transactions: [] };
          }
          
          if (txn.type === 'credit' || parseFloat(txn.amount) > 0) {
            categoryTotals[category].credits += amount;
          } else {
            categoryTotals[category].debits += amount;
          }
          categoryTotals[category].transactions.push(txn);
        });
        
        // Convert to arrays for schema
        Object.entries(categoryTotals).forEach(([category, data]) => {
          if (data.credits > 0) {
            revenueCategories.push({ category, amount: data.credits, transactions: data.transactions.filter(t => t.type === 'credit') });
          }
          if (data.debits > 0) {
            expenseCategories.push({ category, amount: data.debits, transactions: data.transactions.filter(t => t.type === 'debit') });
          }
        });
      }
      
      // Create P&L statement document matching the schema
      const plData = {
        userId: userId,
        period: 'Monthly',
        status: 'completed',
        
        // Raw bank data
        rawBankData: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          uploadDate: new Date(),
          transactionCount: transactionCount
        },
        
        // Analysis (matches schema)
        analysis: {
          period: 'Monthly',
          totalRevenue: totalRevenue,
          totalExpenses: totalExpenses,
          netIncome: netIncome,
          transactionCount: transactionCount
        },
        
        // Revenue breakdown (array format for schema)
        revenue: revenueCategories,
        
        // Expenses breakdown (array format for schema)
        expenses: expenseCategories,
        
        // Profit Loss Statement (matches schema)
        profitLossStatement: {
          revenue: {
            totalRevenue: totalRevenue,
            breakdown: Object.fromEntries(revenueCategories.map(r => [r.category, r.amount])),
            revenueStreams: revenueCategories.map(r => ({ name: r.category, category: r.category, amount: r.amount }))
          },
          expenses: {
            totalExpenses: totalExpenses,
            breakdown: Object.fromEntries(expenseCategories.map(e => [e.category, e.amount])),
            expenseCategories: expenseCategories.map(e => ({ name: e.category, category: e.category, amount: e.amount }))
          },
          profitability: {
            netIncome: netIncome,
            grossProfit: netIncome,
            profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
            netProfitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
          }
        },
        
        // Store for Dashboard compatibility (rawAnalysis is flexible Mixed type)
        rawAnalysis: {
          analysisMetrics: {
            totalRevenue: totalRevenue,
            totalExpenses: totalExpenses,
            netProfit: netIncome,
            transactionCount: transactionCount,
            profitMargin: totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(2) + '%' : '0%',
            burnRate: totalExpenses,
            runway: totalExpenses > 0 ? Math.floor(netIncome / totalExpenses) : 0
          },
          plStatement: {
            revenue: {
              total: totalRevenue,
              categories: revenueCategories.map(r => ({ name: r.category, amount: r.amount }))
            },
            expenses: {
              total: totalExpenses,
              categories: expenseCategories.map(e => ({ name: e.category, amount: e.amount }))
            },
            netIncome: netIncome
          },
          transactions: bankStatement.transactions || []
        },
        
        // Metadata
        metadata: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          analysisType: 'AWS-Textract',
          aiModel: 'textract',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
      
      // Upsert - update if exists for this user, create if not
      const savedPL = await PLStatement.findOneAndUpdate(
        { userId: userId },
        plData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      
      console.log(`✅ Saved to database! Document ID: ${savedPL._id}`);
    } catch (dbError) {
      console.error('⚠️ Database save failed (non-fatal):', dbError.message);
      // Don't fail the whole request if DB save fails - still return data to frontend
    }
    
    return res.status(200).json({
      success: true,
      message: 'Bank statement processed successfully',
      data: {
        ...bankStatement,
        metadata: {
          filename: req.file.originalname,
          fileSize: req.file.size,
          wasPasswordProtected: pdfResult.wasEncrypted,
          processedAt: new Date().toISOString(),
          processingMethod: 'AWS Textract Direct Upload (No S3)'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Bank statement processing failed:', error);
    
    // Cleanup on error
    if (tempFilePath) {
      await deleteTempFile(tempFilePath).catch(err => 
        console.warn('Failed to cleanup temp file:', err)
      );
    }
    
    // Determine error status code
    let statusCode = 500;
    let errorCode = 'PROCESSING_ERROR';
    
    if (error.message.includes('PASSWORD')) {
      statusCode = 400;
      errorCode = 'PASSWORD_ERROR';
    } else if (error.message.includes('S3')) {
      statusCode = 500;
      errorCode = 'S3_ERROR';
    } else if (error.message.includes('TEXTRACT')) {
      statusCode = 500;
      errorCode = 'TEXTRACT_ERROR';
    } else if (error.message.includes('PARSING')) {
      statusCode = 422;
      errorCode = 'PARSING_ERROR';
    }
    
    return res.status(statusCode).json({
      success: false,
      error: errorCode,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/upload/health
 * @desc    Check if AWS Textract is configured
 * @access  Public
 */
router.get('/health', (req, res) => {
  const awsConfigured = !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION
  );
  
  const config = {
    textractConfigured: awsConfigured,
    awsRegion: process.env.AWS_REGION || 'not-set',
    accessKeySet: !!process.env.AWS_ACCESS_KEY_ID,
    secretKeySet: !!process.env.AWS_SECRET_ACCESS_KEY,
    method: 'Direct Buffer Upload (No S3 required)'
  };
  
  return res.status(awsConfigured ? 200 : 503).json({
    success: awsConfigured,
    message: awsConfigured 
      ? 'AWS Textract service is ready (Direct upload mode)' 
      : 'AWS Textract not configured. Set AWS credentials in .env',
    configuration: config
  });
});

/**
 * @route   POST /api/upload/test-textract
 * @desc    Test Textract with sample document (development only)
 * @access  Private
 */
router.post('/test-textract', authenticate, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'This endpoint is only available in development'
    });
  }
  
  try {
    const { s3Bucket, s3Key } = req.body;
    
    if (!s3Bucket || !s3Key) {
      return res.status(400).json({
        success: false,
        message: 's3Bucket and s3Key are required'
      });
    }
    
    const { analyzeDocumentComplete } = require('../utils/aws/textractHandler');
    const result = await analyzeDocumentComplete(s3Bucket, s3Key, false);
    
    return res.status(200).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
