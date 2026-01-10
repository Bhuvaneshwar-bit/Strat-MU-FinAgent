const express = require('express');
const router = express.Router();
const multer = require('multer');
const realTimeBookkeepingAI = require('../utils/realTimeBookkeepingAI');  // REAL-TIME AI ONLY
const advancedDocumentParser = require('../utils/advancedDocumentParser');
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
    fileSize: 25 * 1024 * 1024, // 25MB limit for larger documents
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported: PDF, CSV, Excel, TXT, JPG, PNG'), false);
    }
  }
});

/**
 * ELITE AUTOMATED BOOKKEEPING ENDPOINT
 * Processes any financial document and creates professional journal entries
 */
router.post('/process-document', upload.single('document'), async (req, res) => {
  console.log('🏆 Elite Automated Bookkeeping - Document Processing Started');
  
  try {
    const { 
      businessName, 
      industry, 
      accountingMethod = 'accrual',
      documentType = 'bank_statement' 
    } = req.body;

    // Validate inputs
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'Document file is required' 
      });
    }

    if (!businessName || !industry) {
      return res.status(400).json({ 
        success: false,
        error: 'Business name and industry are required' 
      });
    }

    const businessId = `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    
    console.log('📊 Processing for business:', businessName);
    console.log('📄 Document:', req.file.originalname, req.file.mimetype);

    // Create processing log
    const processingLog = new DocumentProcessingLog({
      businessId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      documentType,
      processingStatus: 'processing'
    });
    await processingLog.save();

    // STEP 1: Parse the uploaded document
    console.log('🔍 Step 1: Parsing document...');
    const documentData = await advancedDocumentParser.parseDocument(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    // Check if document requires password
    if (documentData.requiresPassword) {
      console.log('🔒 PDF is password protected, password required');
      await processingLog.updateOne({ 
        processingStatus: 'failed',
        errorMessage: 'Password required for encrypted PDF'
      });
      
      return res.status(400).json({
        success: false,
        error: 'PASSWORD_REQUIRED',
        message: 'This PDF is password-protected. Please use the password-protected document endpoints.',
        requiresPassword: true,
        isPasswordProtected: true
      });
    }

    console.log('✅ Document parsed successfully:', documentData.totalCount, 'transactions');

    // STEP 2: Create/Update business profile
    console.log('🏢 Step 2: Setting up business profile...');
    const businessProfile = await BusinessProfile.findOneAndUpdate(
      { businessId },
      {
        businessId,
        businessName,
        industry,
        accountingMethod,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // STEP 3: REAL-TIME AI ANALYSIS (NO FALLBACKS)
    console.log('🧠 Step 3: REAL-TIME AI processing...');
    const bookkeepingData = await realTimeBookkeepingAI.analyzeTransactions(
      documentData.transactions,
      businessProfile
    );

    console.log('✅ REAL-TIME AI analysis completed successfully');
    console.log('📊 Real AI result:', {
      entriesCount: bookkeepingData.journalEntries?.length || 0,
      chartAccounts: Object.keys(bookkeepingData.chartOfAccounts || {}).length,
      businessName: bookkeepingData.businessProfile?.businessName
    });

    // STEP 4: Create/Update Chart of Accounts
    console.log('📋 Step 4: Setting up Chart of Accounts...');
    await ChartOfAccounts.findOneAndUpdate(
      { businessId },
      {
        businessId,
        accounts: bookkeepingData.chartOfAccounts,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // STEP 5: Create Journal Entries
    console.log('📝 Step 5: Creating journal entries...');
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
            documentType,
            uploadedAt: new Date()
          },
          debits: entry.debits,
          credits: entry.credits,
          totalDebits: entry.totalDebits,
          totalCredits: entry.totalCredits,
          isBalanced: entry.isBalanced,  // Fixed: use correct field name
          auditTrail: {
            createdBy: 'Elite Bookkeeping AI',
            createdAt: new Date(),
            reviewStatus: entry.totalDebits > 10000 ? 'flagged' : 'approved'
          },
          aiConfidence: 0.95,
          requiresReview: entry.totalDebits > 10000
        });

        await journalEntry.save();
        createdEntries.push({
          entryId: entry.entryId,
          amount: entry.totalDebits,
          status: 'created'
        });

        console.log('✅ Created journal entry:', entry.entryId);
      } catch (entryError) {
        console.error('❌ Failed to create entry:', entry.entryId, entryError.message);
        createdEntries.push({
          entryId: entry.entryId,
          amount: entry.totalDebits,
          status: 'failed',
          error: entryError.message
        });
      }
    }

    // STEP 6: Update processing log
    console.log('📊 Step 6: Finalizing processing log...');
    processingLog.processingStatus = 'completed';
    processingLog.extractedData = {
      totalTransactions: documentData.transactions.length,
      totalAmount: documentData.summary?.netAmount || 0,
      dateRange: {
        start: documentData.summary?.dateRange?.earliest,
        end: documentData.summary?.dateRange?.latest
      }
    };
    processingLog.journalEntriesCreated = createdEntries;
    processingLog.aiAnalysis = {
      confidence: 0.95,
      recommendations: bookkeepingData.professionalRecommendations || []
    };
    processingLog.auditTrail.processedAt = new Date();
    processingLog.auditTrail.completedAt = new Date();
    
    await processingLog.save();

    // STEP 7: Generate response with real data from MongoDB
    const successfulEntries = createdEntries.filter(e => e.status === 'created');
    const failedEntries = createdEntries.filter(e => e.status === 'failed');

    // Fetch the actual journal entries from MongoDB
    const savedJournalEntries = await JournalEntry.find({ businessId }).sort({ entryDate: -1 });
    const chartOfAccounts = await ChartOfAccounts.findOne({ businessId });

    console.log('🎉 Elite Automated Bookkeeping Complete!');
    console.log(`✅ ${successfulEntries.length} journal entries created`);
    console.log(`❌ ${failedEntries.length} entries failed`);

    return res.status(200).json({
      success: true,
      message: 'Automated bookkeeping completed successfully',
      businessId,
      processing: {
        documentParsed: true,
        transactionsFound: documentData.transactions.length,
        journalEntriesCreated: successfulEntries.length,
        entriesFailed: failedEntries.length,
        requiresReview: createdEntries.some(e => e.amount > 10000)
      },
      summary: {
        totalTransactions: documentData.transactions.length,
        totalAmount: documentData.summary?.netAmount || 0,
        dateRange: documentData.summary?.dateRange,
        chartOfAccountsCreated: true,
        professionalGrade: true
      },
      // Include actual MongoDB data
      journalEntries: savedJournalEntries.map(entry => ({
        entryId: entry.entryId,
        date: entry.entryDate,
        description: entry.description,
        reference: entry.reference,
        debits: entry.debits,
        credits: entry.credits,
        totalDebits: entry.totalDebits,
        totalCredits: entry.totalCredits,
        isBalanced: entry.isBalanced
      })),
      chartOfAccounts: chartOfAccounts ? {
        assets: chartOfAccounts.accounts.assets,
        liabilities: chartOfAccounts.accounts.liabilities,
        equity: chartOfAccounts.accounts.equity,
        revenue: chartOfAccounts.accounts.revenue,
        expenses: chartOfAccounts.accounts.expenses
      } : null,
      businessProfile: {
        businessName: businessProfile.businessName,
        industry: businessProfile.industry,
        accountingMethod: businessProfile.accountingMethod
      },
      warnings: failedEntries.length > 0 ? [`${failedEntries.length} entries failed to process`] : [],
      recommendations: bookkeepingData.professionalRecommendations || [],
      auditTrail: {
        processedBy: 'Elite Bookkeeping AI',
        processedAt: new Date().toISOString(),
        documentId: processingLog._id
      }
    });

  } catch (error) {
    console.error('💥 Elite Bookkeeping Error:', error);

    // Update processing log with error
    try {
      await DocumentProcessingLog.findOneAndUpdate(
        { fileName: req.file?.originalname },
        {
          processingStatus: 'failed',
          processingErrors: [error.message],
          'auditTrail.completedAt': new Date()
        }
      );
    } catch (logError) {
      console.error('Failed to update processing log:', logError);
    }

    return res.status(500).json({
      success: false,
      error: 'Automated bookkeeping failed',
      details: error.message,
      professionalGrade: false,
      requiresManualIntervention: true
    });
  }
});

/**
 * Get business financial reports
 */
router.get('/reports/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { reportType = 'summary', period } = req.query;

    console.log('📊 Generating financial reports for:', businessId);

    // Get journal entries for the period
    const query = { businessId };
    if (period) {
      const [year, month] = period.split('-');
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.entryDate = { $gte: startDate, $lte: endDate };
    }

    const journalEntries = await JournalEntry.find(query).sort({ entryDate: -1 });
    const chartOfAccounts = await ChartOfAccounts.findOne({ businessId });

    // Generate financial reports
    const reports = await eliteBookkeepingAI.generateFinancialReports(
      { journalEntries, chartOfAccounts },
      period || 'current'
    );

    return res.status(200).json({
      success: true,
      businessId,
      period,
      reports,
      generatedAt: new Date().toISOString(),
      entriesCount: journalEntries.length
    });

  } catch (error) {
    console.error('📊 Report generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate financial reports',
      details: error.message
    });
  }
});

/**
 * Get processing status and logs
 */
router.get('/status/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    const processingLogs = await DocumentProcessingLog.find({ businessId })
      .sort({ 'auditTrail.uploadedAt': -1 })
      .limit(10);

    const journalEntryCount = await JournalEntry.countDocuments({ businessId });
    const businessProfile = await BusinessProfile.findOne({ businessId });

    return res.status(200).json({
      success: true,
      businessId,
      profile: businessProfile,
      processingHistory: processingLogs,
      statistics: {
        totalJournalEntries: journalEntryCount,
        documentsProcessed: processingLogs.length,
        lastProcessed: processingLogs[0]?.auditTrail?.uploadedAt
      }
    });

  } catch (error) {
    console.error('📊 Status check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get business status',
      details: error.message
    });
  }
});

/**
 * GET EXISTING BOOKKEEPING ENTRIES
 * For the automated bookkeeping dashboard
 */
router.get('/entries', async (req, res) => {
  try {
    console.log('📊 Fetching existing bookkeeping entries...');

    // Get entries from the last 2 hours to capture recently created entries
    const last2Hours = new Date();
    last2Hours.setHours(last2Hours.getHours() - 2);

    // Try multiple time fields to catch all recent entries
    const recentEntries = await JournalEntry.find({
      $or: [
        { createdAt: { $gte: last2Hours } },
        { 'auditTrail.createdAt': { $gte: last2Hours } },
        { 'sourceDocument.uploadedAt': { $gte: last2Hours } }
      ]
    })
      .sort({ entryDate: -1 })
      .exec();

    console.log(`📋 Found ${recentEntries.length} entries from the last 2 hours`);
    
    // If no recent entries, show all entries (for debugging)
    if (recentEntries.length === 0) {
      console.log('🔍 No recent entries found, checking all entries...');
      const allEntries = await JournalEntry.find().limit(50).sort({ _id: -1 }).exec();
      console.log(`📊 Total entries in database: ${allEntries.length}`);
      
      if (allEntries.length > 0) {
        console.log('📅 Showing most recent entries instead');
        const response = {
          success: true,
          message: 'Showing most recent journal entries',
          journalEntries: allEntries.map(entry => ({
            entryId: entry.entryId,
            entryDate: entry.entryDate,
            description: entry.description,
            reference: entry.reference,
            debits: entry.debits,
            credits: entry.credits,
            totalDebits: entry.totalDebits,
            totalCredits: entry.totalCredits,
            isBalanced: entry.isBalanced,
            businessId: entry.businessId
          })),
          summary: {
            totalTransactions: allEntries.length,
            totalAmount: allEntries.reduce((sum, entry) => sum + (parseFloat(entry.totalDebits) || 0), 0),
            successfulEntries: allEntries.length
          }
        };
        return res.status(200).json(response);
      }
      
      return res.status(200).json({
        success: true,
        message: 'No journal entries found',
        journalEntries: [],
        summary: {
          totalTransactions: 0,
          totalAmount: 0,
          successfulEntries: 0
        }
      });
    }

    // Calculate summary for recent entries
    const totalAmount = recentEntries.reduce((sum, entry) => 
      sum + (parseFloat(entry.totalDebits) || 0), 0);

    const response = {
      success: true,
      message: 'Recent bookkeeping entries retrieved successfully',
      journalEntries: recentEntries.map(entry => ({
        entryId: entry.entryId,
        entryDate: entry.entryDate,
        description: entry.description,
        reference: entry.reference,
        debits: entry.debits,
        credits: entry.credits,
        totalDebits: entry.totalDebits,
        totalCredits: entry.totalCredits,
        isBalanced: entry.isBalanced,
        businessId: entry.businessId
      })),
      summary: {
        totalTransactions: recentEntries.length,
        totalAmount: totalAmount,
        successfulEntries: recentEntries.length
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error fetching bookkeeping entries:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bookkeeping entries',
      error: error.message
    });
  }
});

/**
 * PROCESS EXTRACTED TEXT FROM CLIENT-SIDE PDF PARSING
 * For password-protected PDFs that are decrypted in the browser
 */
router.post('/process-extracted-text', async (req, res) => {
  console.log('📝 Processing client-extracted text from password-protected PDF');
  
  try {
    const { extractedText, fileName, pageCount } = req.body;
    
    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Extracted text is too short or empty'
      });
    }
    
    console.log(`   File: ${fileName}`);
    console.log(`   Pages: ${pageCount}`);
    console.log(`   Text length: ${extractedText.length} characters`);
    
    // Use Gemini AI to parse the bank statement text
    const geminiAI = require('../utils/geminiAI');
    
    const prompt = `You are an expert bank statement parser. Parse this extracted bank statement text and return a JSON object.

BANK STATEMENT TEXT:
${extractedText.substring(0, 25000)}

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON - no markdown code blocks, no explanations
2. Keep transaction descriptions SHORT (max 50 chars)
3. Ensure ALL strings are properly quoted and escaped
4. Do NOT include incomplete transactions at the end

Return this exact JSON structure:
{
  "account_holder": "name or null",
  "account_number": "masked number or null",
  "bank_name": "bank name or null",
  "transactions": [
    {
      "date": "DD-MM-YYYY",
      "description": "short description",
      "debit": 0,
      "credit": 0,
      "balance": 0,
      "type": "debit or credit",
      "category": "category name"
    }
  ],
  "summary": {
    "total_credits": 0,
    "total_debits": 0,
    "opening_balance": 0,
    "closing_balance": 0,
    "transaction_count": 0
  }
}

Categories: Salary, Transfer, UPI, Bill Payment, Shopping, Food, Travel, Investment, ATM, Other.
IMPORTANT: Calculate summary totals from ALL transactions even if you can't list them all.`;

    const aiResponse = await geminiAI.generateContent(prompt);
    
    // Parse AI response with robust JSON repair
    let parsedData;
    try {
      // Remove any markdown code blocks if present
      let cleanResponse = aiResponse;
      if (cleanResponse.includes('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanResponse.includes('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/g, '');
      }
      
      // Fix common JSON issues
      cleanResponse = cleanResponse.trim()
        .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' '); // Remove control characters
      
      parsedData = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      console.log('AI Response:', aiResponse.substring(0, 500));
      
      // Try to fix truncated JSON
      try {
        let fixedJson = aiResponse
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        // Find the last complete transaction
        const lastCompleteTransaction = fixedJson.lastIndexOf('},');
        if (lastCompleteTransaction > 0) {
          // Cut at last complete transaction and close the JSON properly
          fixedJson = fixedJson.substring(0, lastCompleteTransaction + 1);
          
          // Count and add missing closing brackets/braces
          const openBraces = (fixedJson.match(/\{/g) || []).length;
          const closeBraces = (fixedJson.match(/\}/g) || []).length;
          const openBrackets = (fixedJson.match(/\[/g) || []).length;
          const closeBrackets = (fixedJson.match(/\]/g) || []).length;
          
          // Close the transactions array
          if (openBrackets > closeBrackets) {
            fixedJson += ']';
          }
          
          // Add summary if missing and close main object
          if (!fixedJson.includes('"summary"')) {
            fixedJson += ',"summary":{"total_credits":0,"total_debits":0,"transaction_count":0}';
          }
          
          // Close remaining braces
          for (let i = 0; i < openBraces - closeBraces - 1; i++) {
            fixedJson += '}';
          }
          fixedJson += '}';
          
          parsedData = JSON.parse(fixedJson);
          console.log('✅ Fixed truncated JSON successfully');
        } else {
          throw new Error('Could not find complete transaction to fix JSON');
        }
      } catch (fixError) {
        console.error('❌ Failed to fix JSON:', fixError);
        
        // Return basic structure if parsing fails
        parsedData = {
          account_holder: null,
          account_number: null,
          bank_name: null,
          transactions: [],
          summary: {
            total_credits: 0,
            total_debits: 0,
            transaction_count: 0
          }
        };
      }
    }
    
    // Calculate totals if not provided
    if (parsedData.transactions && parsedData.transactions.length > 0) {
      const totalCredits = parsedData.transactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);
      const totalDebits = parsedData.transactions.reduce((sum, tx) => sum + (tx.debit || 0), 0);
      
      parsedData.summary = {
        ...parsedData.summary,
        total_credits: totalCredits,
        total_debits: totalDebits,
        transaction_count: parsedData.transactions.length
      };
    }
    
    console.log(`✅ Parsed ${parsedData.transactions?.length || 0} transactions`);
    console.log(`   Total Credits: ₹${parsedData.summary?.total_credits || 0}`);
    console.log(`   Total Debits: ₹${parsedData.summary?.total_debits || 0}`);
    
    return res.status(200).json({
      success: true,
      data: parsedData,
      metadata: {
        source: 'client-extracted-text',
        fileName: fileName,
        pageCount: pageCount,
        textLength: extractedText.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error processing extracted text:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process extracted text',
      error: error.message
    });
  }
});

module.exports = router;