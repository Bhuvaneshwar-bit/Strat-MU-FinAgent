/**
 * PASSWORD-PROTECTED DOCUMENT ROUTES
 * Handles password-protected PDF processing with autonomous flow
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const advancedDocumentParser = require('../utils/advancedDocumentParser');
const geminiAI = require('../utils/geminiAI');
const realTimeBookkeepingAI = require('../utils/realTimeBookkeepingAI');
const PLStatement = require('../models/PLStatement');
const { 
  ChartOfAccounts, 
  JournalEntry, 
  BusinessProfile, 
  DocumentProcessingLog 
} = require('../models/BookkeepingModels');

// Configure multer for document uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

/**
 * Step 1: Check if document requires password
 */
router.post('/check-password', upload.single('document'), async (req, res) => {
  try {
    console.log('🔍 Checking if document requires password...');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Only check PDFs for password protection
    if (req.file.mimetype !== 'application/pdf') {
      return res.json({
        requiresPassword: false,
        isPasswordProtected: false,
        canProcess: true,
        message: 'Document can be processed directly'
      });
    }

    // Use password handler directly for checking
    const passwordHandler = require('../utils/passwordProtectedPDFHandler');
    const isProtected = await passwordHandler.isPasswordProtected(req.file.buffer);

    console.log('🔍 Password protection check result:', isProtected);

    if (isProtected) {
      return res.json({
        requiresPassword: true,
        isPasswordProtected: true,
        canProcess: false,
        message: 'Password required to unlock this PDF',
        fileInfo: {
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size
        }
      });
    }

    res.json({
      requiresPassword: false,
      isPasswordProtected: false,
      canProcess: true,
      message: 'Document can be processed directly'
    });

  } catch (error) {
    console.error('❌ Password check failed:', error.message);
    res.status(500).json({
      error: 'Failed to check document password requirement',
      details: error.message
    });
  }
});

/**
 * Step 2: Process password-protected document with complete autonomous flow
 */
router.post('/process-with-password', upload.single('document'), async (req, res) => {
  try {
    console.log('🔐 Processing password-protected document...');
    
    const { password, period = 'Monthly', businessName = 'Your Business' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    console.log('📄 File:', req.file.originalname, 'Size:', req.file.size);

    // Step 1: Parse document with password
    console.log('🔓 Step 1: Unlocking and parsing document...');
    let documentData;
    try {
      documentData = await advancedDocumentParser.parseDocument(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        password
      );
      console.log('🔍 Debug - Raw documentData from parser:', {
        hasData: !!documentData,
        keys: documentData ? Object.keys(documentData) : 'N/A',
        extractedTextLength: documentData?.extractedText?.length || 'N/A'
      });
    } catch (parseError) {
      console.error('❌ Advanced parser error:', parseError);
      throw parseError;
    }

    if (documentData.requiresPassword) {
      return res.status(401).json({
        error: 'Incorrect password',
        message: 'The provided password could not unlock the document'
      });
    }

    if (documentData.totalCount === 0) {
      return res.status(400).json({
        error: 'No transactions found',
        message: 'Could not extract financial data from the document'
      });
    }

    // Extract the correct data from the structured format
    const extractedText = documentData.metadata?.extractedText || null;
    const totalCount = documentData.documentInfo?.totalTransactions || 0;
    const transactions = documentData.transactions || [];

    console.log(`✅ Document unlocked! Found ${totalCount} transactions`);

    // Debug: Check what we actually got from the parser
    console.log('📊 Debug - Document data structure:');
    console.log(`   - extractedText: ${extractedText ? extractedText.length + ' chars' : 'NULL/UNDEFINED'}`);
    console.log(`   - totalCount: ${totalCount}`);
    console.log(`   - transactions: ${transactions.length}`);

    // Step 2: Generate P&L Analysis with Gemini AI using extracted text
    console.log('🤖 Step 2: Generating P&L analysis with Gemini AI using extracted text...');
    console.log(`📄 Using extracted text (${extractedText?.length || 0} characters)`);
    
    const analysisData = await geminiAI.analyzeBankStatementFromText(
      extractedText,
      req.file.originalname,
      period
    );

    // Save P&L Statement
    const plStatement = new PLStatement({
      userId: 'autonomous-user',
      businessName: businessName,
      period: period,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      analysis: analysisData,
      createdAt: new Date(),
      isPasswordProtected: true,
      processingMethod: 'password-unlocked',
      rawAnalysis: analysisData
    });

    const savedStatement = await plStatement.save();
    console.log(`✅ P&L statement saved with ID: ${savedStatement._id}`);

    // Step 3: Automated Bookkeeping
    console.log('📊 Step 3: Creating automated bookkeeping entries...');
    
    const businessId = `autonomous_${savedStatement._id}`;
    
    // Create business profile
    const businessProfile = await BusinessProfile.findOneAndUpdate(
      { businessId },
      {
        businessId,
        businessName: businessName,
        industry: 'General Business',
        accountingMethod: 'accrual',
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Generate journal entries
    const bookkeepingData = await realTimeBookkeepingAI.analyzeTransactions(
      transactions,
      businessProfile
    );

    // Create Chart of Accounts
    await ChartOfAccounts.findOneAndUpdate(
      { businessId },
      {
        businessId,
        accounts: bookkeepingData.chartOfAccounts,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Create Journal Entries
    const createdEntries = [];
    for (const entry of bookkeepingData.journalEntries) {
      try {
        const journalEntry = new JournalEntry({
          businessId,
          entryId: entry.entryId,
          entryDate: new Date(entry.date),
          description: entry.description,
          reference: entry.reference,
          sourceDocument: {
            fileName: req.file.originalname,
            documentType: 'password_protected_pdf',
            uploadedAt: new Date(),
            plStatementId: savedStatement._id,
            wasPasswordProtected: true
          },
          debits: entry.debits,
          credits: entry.credits,
          totalDebits: entry.totalDebits,
          totalCredits: entry.totalCredits,
          isBalanced: entry.isBalanced,
          auditTrail: {
            createdBy: 'Autonomous Agentic AI',
            createdAt: new Date(),
            reviewStatus: 'approved'
          },
          aiConfidence: 0.95,
          requiresReview: false
        });

        await journalEntry.save();
        createdEntries.push(entry);
        console.log('✅ Created journal entry:', entry.entryId);
      } catch (entryError) {
        console.error('❌ Failed to create entry:', entry.entryId, entryError.message);
      }
    }

    console.log('🎉 Autonomous processing complete!');

    // Return comprehensive results
    res.json({
      success: true,
      message: 'Password-protected document processed successfully',
      processing: {
        documentUnlocked: true,
        transactionsFound: documentData.totalCount,
        processingMethod: documentData.processingMethod
      },
      plAnalysis: {
        statementId: savedStatement._id,
        totalRevenue: analysisData.totalRevenue,
        totalExpenses: analysisData.totalExpenses,
        netProfit: analysisData.netProfit,
        period: period
      },
      bookkeeping: {
        businessId: businessId,
        entriesCreated: createdEntries.length,
        chartOfAccountsCreated: bookkeepingData.chartOfAccounts?.length || 0
      },
      autonomous: {
        processed: true,
        passwordRequired: true,
        passwordAccepted: true,
        fullFlow: 'completed'
      }
    });

  } catch (error) {
    console.error('❌ Autonomous processing failed:', error.message);
    res.status(500).json({
      error: 'Autonomous processing failed',
      details: error.message,
      autonomous: {
        processed: false,
        passwordRequired: true,
        fullFlow: 'failed'
      }
    });
  }
});

module.exports = router;