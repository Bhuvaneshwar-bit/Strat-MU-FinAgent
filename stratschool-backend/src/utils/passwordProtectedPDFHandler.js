/**
 * PASSWORD-PROTECTED PDF HANDLER WITH AWS TEXTRACT
 * Handles password detection, unlocking, and text extraction
 */

const { PDFDocument } = require('pdf-lib');
const { TextractClient, DetectDocumentTextCommand, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
const pdf = require('pdf-parse');
const pdf2pic = require('pdf2pic');
const fs = require('fs');
const path = require('path');

class PasswordProtectedPDFHandler {
  constructor() {
    console.log('🔐 Password-Protected PDF Handler initialized');
    
    // Initialize AWS Textract
    this.textract = new TextractClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }

  /**
   * Check if PDF is password protected
   */
  async isPasswordProtected(pdfBuffer) {
    try {
      // Try to parse PDF without password
      await pdf(pdfBuffer);
      return false; // If successful, not password protected
    } catch (error) {
      // Check for specific password-related errors
      if (error.message.includes('password') || 
          error.message.includes('encrypted') ||
          error.message.includes('Invalid PDF') ||
          error.message.includes('owner password')) {
        console.log('🔒 Password-protected PDF detected');
        return true;
      }
      
      // Try with pdf-lib as secondary check
      try {
        await PDFDocument.load(pdfBuffer);
        return false;
      } catch (pdfLibError) {
        if (pdfLibError.message.includes('encrypted') || 
            pdfLibError.message.includes('password')) {
          console.log('🔒 Password-protected PDF confirmed (pdf-lib)');
          return true;
        }
        throw pdfLibError; // Different error, re-throw
      }
    }
  }

  /**
   * Unlock password-protected PDF
   */
  async unlockPDF(pdfBuffer, password) {
    try {
      console.log('🔓 Attempting to unlock PDF with provided password...');
      
      // Method 1: Try with pdf-parse and password
      try {
        const options = {
          password: password
        };
        const result = await pdf(pdfBuffer, options);
        console.log('✅ PDF unlocked successfully with pdf-parse');
        return result.text;
      } catch (pdfParseError) {
        console.log('⚠️ pdf-parse failed, trying pdf-lib...');
      }

      // Method 2: Try with pdf-lib
      try {
        const pdfDoc = await PDFDocument.load(pdfBuffer, { 
          password: password,
          ignoreEncryption: false 
        });
        
        // Extract text using pdf-lib (basic method)
        const pages = pdfDoc.getPages();
        let extractedText = '';
        
        // Convert to buffer for text extraction
        const unlockedPdfBytes = await pdfDoc.save();
        const textResult = await pdf(Buffer.from(unlockedPdfBytes));
        extractedText = textResult.text;
        
        console.log('✅ PDF unlocked successfully with pdf-lib');
        return extractedText;
      } catch (pdfLibError) {
        console.log('⚠️ pdf-lib failed, trying AWS Textract...');
      }

      // Method 3: Try AWS Textract with decrypted content but still encrypted PDF
      console.log('🔓 Attempting AWS Textract with encrypted PDF (Textract can handle some encrypted PDFs)...');
      
      // Method 3a: Try Textract directly on original encrypted PDF
      try {
        const textractResult = await this.extractWithTextract(pdfBuffer);
        console.log('✅ AWS Textract processed encrypted PDF directly');
        return textractResult;
      } catch (textractError) {
        console.log('⚠️ Direct Textract on encrypted PDF failed:', textractError.message);
      }
      
      // Method 3b: Create a truly unencrypted PDF by copying pages
      console.log('🔄 Creating truly unencrypted PDF by copying pages...');
      const encryptedDoc = await PDFDocument.load(pdfBuffer, { 
        password: password,
        ignoreEncryption: true 
      });
      
      // Create a new, unencrypted PDF document
      const newDoc = await PDFDocument.create();
      
      // Copy all pages from encrypted to new document
      const pageCount = encryptedDoc.getPageCount();
      console.log(`📄 Copying ${pageCount} pages to new unencrypted PDF...`);
      
      const pages = await newDoc.copyPages(encryptedDoc, Array.from({length: pageCount}, (_, i) => i));
      pages.forEach(page => newDoc.addPage(page));
      
      const unencryptedPdfBytes = await newDoc.save();
      console.log(`📄 Created unencrypted PDF size: ${unencryptedPdfBytes.length} bytes`);
      
      // Verify the new PDF is truly unencrypted
      try {
        await PDFDocument.load(unencryptedPdfBytes);
        console.log('✅ Unencrypted PDF validation successful');
      } catch (validationError) {
        console.log('⚠️ Unencrypted PDF validation failed:', validationError.message);
        throw new Error('Failed to create valid unencrypted PDF');
      }
      
      // Try Textract first on the unencrypted PDF
      try {
        const textractResult = await this.extractWithTextract(Buffer.from(unencryptedPdfBytes));
        console.log('✅ PDF unencrypted and processed with AWS Textract');
        return textractResult;
      } catch (textractError) {
        console.log('⚠️ Textract failed on unencrypted PDF, trying PDF-to-image conversion...');
        
        // Method 3c: Convert PDF to images and use Textract on images
        try {
          const imageTextractResult = await this.extractFromPDFViaImages(Buffer.from(unencryptedPdfBytes));
          console.log('✅ PDF converted to images and processed with AWS Textract');
          return imageTextractResult;
        } catch (imageError) {
          console.log('⚠️ PDF-to-image Textract failed, using fallback PDF parsing...');
          console.log('📄 This PDF format requires alternative processing');
          
          // Final fallback: Use regular PDF parsing on the unencrypted PDF
          const pdfResult = await pdf(Buffer.from(unencryptedPdfBytes));
          console.log('✅ PDF unencrypted and processed with standard PDF parser fallback');
          console.log('🔍 DEBUG - Extracted text content:', JSON.stringify(pdfResult.text.substring(0, 200)));
          console.log('🔍 DEBUG - Full text length:', pdfResult.text.length);
          console.log('🔍 DEBUG - PDF info:', {
            numpages: pdfResult.numpages,
            numrender: pdfResult.numrender,
            info: pdfResult.info
          });
          return pdfResult.text;
        }
      }

    } catch (error) {
      console.error('❌ Failed to unlock PDF:', error.message);
      throw new Error(`Failed to unlock PDF: ${error.message}`);
    }
  }

  /**
   * Convert PDF to images and extract text with Textract
   */
  async extractFromPDFViaImages(pdfBuffer) {
    const tempDir = path.join(__dirname, '../../temp');
    const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
    
    try {
      console.log('🔄 Converting PDF to images for Textract processing...');
      
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Write PDF to temporary file
      fs.writeFileSync(tempPdfPath, pdfBuffer);
      
      // Setup pdf2pic converter
      const convert = pdf2pic.fromPath(tempPdfPath, {
        density: 300, // High quality
        saveFilename: `page_${Date.now()}`,
        savePath: tempDir,
        format: 'png',
        width: 2000,
        height: 2000
      });
      
      // Convert first few pages (bank statements are usually 1-3 pages)
      const maxPages = 5; // Limit to avoid processing too many pages
      let allExtractedText = '';
      let pageCount = 0;
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          console.log(`🔄 Converting page ${pageNum}...`);
          const result = await convert(pageNum);
          
          if (result && result.path) {
            pageCount++;
            console.log(`🖼️ Processing image: ${path.basename(result.path)}`);
            
            const imageBuffer = fs.readFileSync(result.path);
            const pageText = await this.extractTextFromImage(imageBuffer);
            allExtractedText += pageText + '\n\n';
            console.log(`📄 Extracted ${pageText.length} characters from page ${pageNum}`);
            
            // Clean up image file
            try {
              fs.unlinkSync(result.path);
            } catch (cleanupError) {
              console.log('⚠️ Failed to cleanup image:', cleanupError.message);
            }
          } else {
            console.log(`📄 Page ${pageNum} not found, stopping conversion`);
            break;
          }
        } catch (pageError) {
          console.log(`⚠️ Failed to convert page ${pageNum}:`, pageError.message);
          if (pageNum === 1) {
            // If first page fails, there's a real problem
            throw pageError;
          }
          // For subsequent pages, just stop processing
          break;
        }
      }
      
      console.log(`📄 Converted PDF to ${pageCount} image(s)`);
      console.log(`✅ Total extracted text: ${allExtractedText.length} characters`);
      return allExtractedText;
      
    } catch (error) {
      console.error('❌ PDF-to-image conversion failed:', error.message);
      throw error;
    } finally {
      // Clean up temporary PDF file
      try {
        if (fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath);
        }
      } catch (cleanupError) {
        console.log('⚠️ Failed to cleanup temp PDF:', cleanupError.message);
      }
    }
  }

  /**
   * Extract text from image using AWS Textract
   */
  async extractTextFromImage(imageBuffer) {
    try {
      const params = {
        Document: {
          Bytes: imageBuffer
        }
      };

      const command = new DetectDocumentTextCommand(params);
      const response = await this.textract.send(command);

      let extractedText = '';
      if (response.Blocks) {
        const lineBlocks = response.Blocks.filter(block => block.BlockType === 'LINE');
        lineBlocks.forEach(block => {
          extractedText += block.Text + '\n';
        });
      }

      return extractedText;
    } catch (error) {
      console.error('❌ Image Textract failed:', error.message);
      throw error;
    }
  }

  /**
   * Extract text using AWS Textract
   */
  async extractWithTextract(pdfBuffer) {
    try {
      console.log('🤖 Extracting text with AWS Textract...');
      console.log(`📄 PDF buffer size: ${pdfBuffer.length} bytes (${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
      
      // Check Textract size limits (10MB for synchronous processing)
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (pdfBuffer.length > MAX_SIZE) {
        throw new Error(`PDF too large for Textract: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB (max: 10MB)`);
      }
      
      const params = {
        Document: {
          Bytes: pdfBuffer
        }
      };

      let response;
      
      // Try DetectDocumentText first (simpler, faster)
      try {
        console.log('📄 Trying DetectDocumentText...');
        const command = new DetectDocumentTextCommand(params);
        response = await this.textract.send(command);
      } catch (detectError) {
        console.log('⚠️ DetectDocumentText failed, trying AnalyzeDocument...');
        // Try AnalyzeDocument as fallback (more robust for complex PDFs)
        const analyzeParams = {
          Document: {
            Bytes: pdfBuffer
          },
          FeatureTypes: ['TABLES', 'FORMS'] // Good for bank statements
        };
        const analyzeCommand = new AnalyzeDocumentCommand(analyzeParams);
        response = await this.textract.send(analyzeCommand);
      }

      // Combine all detected text
      let extractedText = '';
      if (response.Blocks) {
        const lineBlocks = response.Blocks.filter(block => block.BlockType === 'LINE');
        console.log(`📄 Found ${lineBlocks.length} text lines`);
        
        lineBlocks.forEach(block => {
          extractedText += block.Text + '\n';
        });
      }

      console.log(`📄 Textract extracted ${extractedText.length} characters`);
      return extractedText;

    } catch (error) {
      console.error('❌ AWS Textract failed:', error.message);
      console.error('🔍 DEBUG - Textract error details:', {
        code: error.code,
        statusCode: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId,
        errorType: error.name
      });
      throw new Error(`AWS Textract extraction failed: ${error.message}`);
    }
  }

  /**
   * Main processing function for password-protected PDFs
   */
  async processPDF(pdfBuffer, password = null) {
    try {
      // Step 1: Check if password protected
      const isProtected = await this.isPasswordProtected(pdfBuffer);
      
      if (!isProtected) {
        console.log('📄 PDF is not password protected, processing normally...');
        const result = await pdf(pdfBuffer);
        return {
          isPasswordProtected: false,
          extractedText: result.text,
          method: 'standard'
        };
      }

      // Step 2: If password protected but no password provided
      if (isProtected && !password) {
        console.log('🔒 PDF is password protected, password required');
        return {
          isPasswordProtected: true,
          requiresPassword: true,
          extractedText: null,
          error: 'Password required to unlock this PDF'
        };
      }

      // Step 3: Unlock with password
      const extractedText = await this.unlockPDF(pdfBuffer, password);
      
      return {
        isPasswordProtected: true,
        requiresPassword: false,
        extractedText: extractedText,
        method: 'unlocked',
        success: true
      };

    } catch (error) {
      console.error('❌ PDF processing failed:', error.message);
      return {
        isPasswordProtected: true,
        requiresPassword: password ? false : true,
        extractedText: null,
        error: error.message,
        success: false
      };
    }
  }
}

module.exports = new PasswordProtectedPDFHandler();