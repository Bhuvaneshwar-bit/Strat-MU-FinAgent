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
 * Decrypt a password-protected PDF
 * @param {Buffer} pdfBuffer - The encrypted PDF buffer
 * @param {string} password - The password to decrypt the PDF
 * @returns {Promise<Buffer>} - Decrypted PDF buffer
 */
async function decryptPdf(pdfBuffer, password) {
  try {
    console.log('🔓 Starting PDF decryption...');
    
    // Load the encrypted PDF with the password
    const pdfDoc = await PDFDocument.load(pdfBuffer, { 
      password: password,
      ignoreEncryption: false 
    });
    
    // Save as a new, unencrypted PDF
    const decryptedPdfBytes = await pdfDoc.save();
    
    console.log('✅ PDF successfully decrypted');
    return Buffer.from(decryptedPdfBytes);
    
  } catch (error) {
    console.error('❌ PDF decryption failed:', error.message);
    
    // Provide specific error messages
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
 * @returns {Promise<{buffer: Buffer, tempPath: string, wasEncrypted: boolean}>}
 */
async function processPdf(pdfBuffer, password, originalFilename) {
  try {
    console.log('📄 Processing PDF:', originalFilename);
    
    // Check if PDF is password protected
    const { isProtected, canBypass } = await isPdfPasswordProtected(pdfBuffer);
    
    if (isProtected) {
      console.log('🔒 PDF is password protected (requires user password)');
      
      if (!password) {
        throw new Error('PASSWORD_REQUIRED: This PDF is password protected but no password was provided');
      }
      
      // Decrypt the PDF
      const decryptedBuffer = await decryptPdf(pdfBuffer, password);
      
      // Save to temp file
      const tempPath = await saveDecryptedPdfToTemp(decryptedBuffer, originalFilename);
      
      return {
        buffer: decryptedBuffer,
        tempPath: tempPath,
        wasEncrypted: true
      };
    } else {
      // PDF is either unprotected OR has only owner-password (can bypass)
      if (canBypass) {
        console.log('🔓 PDF has edit restrictions but is viewable - bypassing encryption');
        // Load with ignoreEncryption and save as unencrypted
        try {
          const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
          const unlockedBytes = await pdfDoc.save();
          const unlockedBuffer = Buffer.from(unlockedBytes);
          
          const tempPath = await saveDecryptedPdfToTemp(unlockedBuffer, originalFilename);
          
          return {
            buffer: unlockedBuffer,
            tempPath: tempPath,
            wasEncrypted: false // Treat as not encrypted since no password was needed
          };
        } catch (bypassError) {
          console.warn('⚠️ Bypass failed, using original buffer:', bypassError.message);
          // Fallback to original buffer
          const tempPath = await saveDecryptedPdfToTemp(pdfBuffer, originalFilename);
          return {
            buffer: pdfBuffer,
            tempPath: tempPath,
            wasEncrypted: false
          };
        }
      } else {
        console.log('🔓 PDF is not password protected');
        
        // Save to temp file anyway for uniform processing
        const tempPath = await saveDecryptedPdfToTemp(pdfBuffer, originalFilename);
        
        return {
          buffer: pdfBuffer,
          tempPath: tempPath,
          wasEncrypted: false
        };
      }
    }
    
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
