/**
 * AWS Textract Handler
 * Manages document analysis using AWS Textract
 * Extracts text, key-value pairs, tables, and forms from documents
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
const pdfParse = require('pdf-parse');

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
 * Falls back to pdf-parse if Textract doesn't extract enough text
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Object>} - Processed Textract results
 */
async function analyzeDocumentFromBufferComplete(pdfBuffer) {
  try {
    console.log('📄 Starting complete Textract analysis from buffer...');
    
    // Use multi-page handler which automatically splits if needed
    const textractResponse = await analyzeMultiPagePdfFromBuffer(pdfBuffer);
    
    // Process and structure the response
    let processedData = processTextractResponse(textractResponse);
    
    // Check if Textract extracted enough text (fallback threshold)
    const textBlockCount = processedData.text?.length || 0;
    const tableCount = processedData.tables?.length || 0;
    
    console.log(`   Textract extracted: ${textBlockCount} text blocks, ${tableCount} tables`);
    
    // If Textract didn't extract much, try pdf-parse as fallback
    if (textBlockCount < 20 && tableCount === 0) {
      console.log('⚠️  Textract found minimal content, trying pdf-parse fallback...');
      
      const pdfParseData = await extractTextWithPdfParse(pdfBuffer);
      
      if (pdfParseData && pdfParseData.text.length > textBlockCount) {
        console.log(`✅ pdf-parse extracted more content: ${pdfParseData.text.length} lines`);
        
        // Merge pdf-parse text with Textract data (keep any tables/forms from Textract)
        processedData = {
          ...processedData,
          text: pdfParseData.text,
          rawText: pdfParseData.rawText,
          source: 'pdf-parse-fallback',
          // Keep any key-value pairs or tables Textract found
          keyValuePairs: processedData.keyValuePairs || [],
          tables: processedData.tables || []
        };
      }
    }
    
    console.log('✅ Complete analysis finished');
    
    return processedData;
    
  } catch (error) {
    console.error('❌ Complete document analysis failed:', error.message);
    
    // Last resort: try pdf-parse only
    console.log('🔄 Attempting pdf-parse as last resort...');
    const pdfParseData = await extractTextWithPdfParse(pdfBuffer);
    if (pdfParseData && pdfParseData.text.length > 0) {
      console.log('✅ pdf-parse fallback succeeded');
      return pdfParseData;
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
  splitPdfPages,
  startDocumentAnalysis,
  getDocumentAnalysis,
  processTextractResponse,
  analyzeDocumentComplete,
  textractClient,
  createTextractClient
};
