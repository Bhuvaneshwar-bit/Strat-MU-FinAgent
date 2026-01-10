/**
 * PDF Decryption Utility
 * Handles password-protected PDFs and converts them to unlocked temporary files
 * 
 * @module decryptPdf
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { execSync } = require('child_process');

/**
 * Check if a PDF is password protected (requires user password to open)
 * Note: PDFs with only "owner password" (edit restrictions) are NOT considered password protected
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Promise<{isProtected: boolean, canBypass: boolean}>} - Protection status
 */
async function isPdfPasswordProtected(pdfBuffer) {
  try {
    // First try: Load WITHOUT ignoring encryption - strict check
    await PDFDocument.load(pdfBuffer, { ignoreEncryption: false });
    return { isProtected: false, canBypass: false };
  } catch (strictError) {
    // If strict loading fails, try with ignoreEncryption: true
    // This handles PDFs with "owner password" only (edit restrictions, but viewable)
    try {
      await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      console.log('🔓 PDF has owner password (edit restrictions) but can be read without user password');
      return { isProtected: false, canBypass: true };
    } catch (bypassError) {
      // Even ignoring encryption failed - this is truly password protected
      if (strictError.message.includes('encrypted') || 
          strictError.message.includes('password') ||
          strictError.message.includes('Encrypted')) {
        return { isProtected: true, canBypass: false };
      }
      // Re-throw if it's a different error (corrupt PDF, etc.)
      throw strictError;
    }
  }
}

/**
 * Decrypt a password-protected PDF and extract text
 * @param {Buffer} pdfBuffer - The encrypted PDF buffer
 * @param {string} password - The password to decrypt the PDF
 * @returns {Promise<{buffer: Buffer, extractedText: string|null}>} - Decrypted PDF buffer and extracted text
 */
async function decryptPdf(pdfBuffer, password) {
  try {
    console.log('🔓 Starting PDF decryption with password...');
    
    let extractedText = null;
    
    // Method 1: Try pdf-parse with password to extract text directly
    // This is the most reliable method for password-protected PDFs
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(pdfBuffer, { password: password });
      extractedText = data.text;
      console.log(`✅ pdf-parse extracted ${extractedText.length} characters with password`);
    } catch (parseError) {
      console.log('⚠️ pdf-parse with password failed:', parseError.message);
    }
    
    // Method 2: Try pdf-lib to create an unencrypted buffer (for Textract fallback)
    let decryptedBuffer = pdfBuffer; // Default to original
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer, { 
        password: password,
        ignoreEncryption: false 
      });
      const decryptedPdfBytes = await pdfDoc.save();
      decryptedBuffer = Buffer.from(decryptedPdfBytes);
      console.log('✅ PDF buffer decrypted with pdf-lib');
    } catch (pdfLibError) {
      console.log('⚠️ pdf-lib decryption failed, will use extracted text:', pdfLibError.message);
      // If pdf-lib fails but we have extracted text, that's still okay
    }
    
    return {
      buffer: decryptedBuffer,
      extractedText: extractedText
    };
    
  } catch (error) {
    console.error('❌ PDF decryption failed:', error.message);
    
    if (error.message.includes('password') || error.message.includes('Incorrect')) {
      throw new Error('INCORRECT_PASSWORD: The provided password is incorrect');
    }
    
    throw new Error(`PDF_DECRYPTION_ERROR: ${error.message}`);
  }
}

/**
 * Create a temporary file path for unlocked PDF
 * @param {string} originalFilename - Original file name
 * @returns {string} - Temporary file path
 */
function getTempFilePath(originalFilename) {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const basename = path.basename(originalFilename, '.pdf');
  const tempDir = path.join(__dirname, '../../../temp');
  
  return path.join(tempDir, `${basename}_unlocked_${timestamp}_${randomId}.pdf`);
}

/**
 * Save decrypted PDF to temporary file
 * @param {Buffer} pdfBuffer - Decrypted PDF buffer
 * @param {string} originalFilename - Original filename
 * @returns {Promise<string>} - Path to temporary file
 */
async function saveDecryptedPdfToTemp(pdfBuffer, originalFilename) {
  try {
    const tempFilePath = getTempFilePath(originalFilename);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(tempFilePath);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Write the decrypted PDF to temp file
    await fs.writeFile(tempFilePath, pdfBuffer);
    
    console.log(`💾 Decrypted PDF saved to: ${tempFilePath}`);
    return tempFilePath;
    
  } catch (error) {
    console.error('❌ Failed to save decrypted PDF:', error.message);
    throw new Error(`TEMP_FILE_ERROR: ${error.message}`);
  }
}

/**
 * Delete temporary file
 * @param {string} filePath - Path to file to delete
 * @returns {Promise<void>}
 */
async function deleteTempFile(filePath) {
  try {
    await fs.unlink(filePath);
    console.log(`🗑️  Temporary file deleted: ${filePath}`);
  } catch (error) {
    // Don't throw error if file doesn't exist
    if (error.code !== 'ENOENT') {
      console.warn(`⚠️  Failed to delete temp file ${filePath}:`, error.message);
    }
  }
}

/**
 * Main function: Process PDF (detect protection, decrypt if needed)
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} password - Password (optional if not protected)
 * @param {string} originalFilename - Original filename
 * @returns {Promise<{buffer: Buffer, tempPath: string, wasEncrypted: boolean, extractedText: string|null}>}
 */
async function processPdf(pdfBuffer, password, originalFilename) {
  try {
    console.log('📄 Processing PDF:', originalFilename);
    
    // Check if PDF is password protected
    const { isProtected, canBypass } = await isPdfPasswordProtected(pdfBuffer);
    
    // CASE 1: Truly password protected (requires user password to open)
    if (isProtected) {
      console.log('🔒 PDF is password protected (requires user password)');
      
      if (!password) {
        throw new Error('PASSWORD_REQUIRED: This PDF is password protected but no password was provided');
      }
      
      // Decrypt the PDF and extract text
      const decryptResult = await decryptPdf(pdfBuffer, password);
      
      // Save to temp file
      const tempPath = await saveDecryptedPdfToTemp(decryptResult.buffer, originalFilename);
      
      return {
        buffer: decryptResult.buffer,
        tempPath: tempPath,
        wasEncrypted: true,
        extractedText: decryptResult.extractedText // Pass extracted text for Gemini parsing
      };
    }
    
    // CASE 2: Has owner password (edit restrictions) but user provided a password anyway
    // This is the bank statement case - try to use password for extraction
    if (canBypass && password) {
      console.log('🔓 PDF has owner password - user provided password, extracting with password...');
      
      let extractedText = null;
      
      // Try pdf-parse with the provided password
      try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(pdfBuffer, { password: password });
        extractedText = data.text;
        console.log(`✅ Extracted ${extractedText.length} characters using provided password`);
      } catch (parseError) {
        console.log('⚠️ pdf-parse with password failed, trying without password...');
        // Try without password (owner password PDFs can sometimes be read without user password)
        try {
          const pdfParse = require('pdf-parse');
          const data = await pdfParse(pdfBuffer);
          extractedText = data.text;
          console.log(`✅ Extracted ${extractedText.length} characters without password`);
        } catch (noPassError) {
          console.log('⚠️ pdf-parse without password also failed:', noPassError.message);
        }
      }
      
      // Create unencrypted buffer for Textract fallback
      let unlockedBuffer = pdfBuffer;
      try {
        const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
        const unlockedBytes = await pdfDoc.save();
        unlockedBuffer = Buffer.from(unlockedBytes);
      } catch (bypassError) {
        console.warn('⚠️ pdf-lib bypass failed:', bypassError.message);
      }
      
      const tempPath = await saveDecryptedPdfToTemp(unlockedBuffer, originalFilename);
      
      return {
        buffer: unlockedBuffer,
        tempPath: tempPath,
        wasEncrypted: false,
        extractedText: extractedText // Pass extracted text for Gemini parsing
      };
    }
    
    // CASE 3: Has owner password (edit restrictions) but NO password provided
    if (canBypass) {
      console.log('🔓 PDF has edit restrictions but is viewable - bypassing encryption');
      
      try {
        const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
        const unlockedBytes = await pdfDoc.save();
        const unlockedBuffer = Buffer.from(unlockedBytes);
        
        const tempPath = await saveDecryptedPdfToTemp(unlockedBuffer, originalFilename);
        
        return {
          buffer: unlockedBuffer,
          tempPath: tempPath,
          wasEncrypted: false,
          extractedText: null
        };
      } catch (bypassError) {
        console.warn('⚠️ Bypass failed, using original buffer:', bypassError.message);
        const tempPath = await saveDecryptedPdfToTemp(pdfBuffer, originalFilename);
        return {
          buffer: pdfBuffer,
          tempPath: tempPath,
          wasEncrypted: false,
          extractedText: null
        };
      }
    }
    
    // CASE 4: Not password protected at all
    console.log('🔓 PDF is not password protected');
    
    const tempPath = await saveDecryptedPdfToTemp(pdfBuffer, originalFilename);
    
    return {
      buffer: pdfBuffer,
      tempPath: tempPath,
      wasEncrypted: false,
      extractedText: null // No extracted text, use Textract normally
    };
    
  } catch (error) {
    console.error('❌ PDF processing failed:', error.message);
    throw error;
  }
}

module.exports = {
  isPdfPasswordProtected,
  decryptPdf,
  processPdf,
  saveDecryptedPdfToTemp,
  deleteTempFile,
  getTempFilePath
};
