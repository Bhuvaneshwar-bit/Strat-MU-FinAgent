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
 * Check if a PDF is password protected
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Promise<boolean>} - True if password protected
 */
async function isPdfPasswordProtected(pdfBuffer) {
  try {
    // Try to load the PDF without a password
    await PDFDocument.load(pdfBuffer, { ignoreEncryption: false });
    return false;
  } catch (error) {
    // If error message contains encryption keywords, it's password protected
    if (error.message.includes('encrypted') || 
        error.message.includes('password') ||
        error.message.includes('Encrypted')) {
      return true;
    }
    // Re-throw if it's a different error
    throw error;
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
    const isProtected = await isPdfPasswordProtected(pdfBuffer);
    
    if (isProtected) {
      console.log('🔒 PDF is password protected');
      
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
      console.log('🔓 PDF is not password protected');
      
      // Save to temp file anyway for uniform processing
      const tempPath = await saveDecryptedPdfToTemp(pdfBuffer, originalFilename);
      
      return {
        buffer: pdfBuffer,
        tempPath: tempPath,
        wasEncrypted: false
      };
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
