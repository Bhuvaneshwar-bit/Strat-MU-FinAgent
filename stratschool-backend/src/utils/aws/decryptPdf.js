/**
 * PDF Decryption Utility - QPDF Edition
 * Uses QPDF command-line tool for reliable PDF decryption
 * Handles password-protected PDFs (both user and owner passwords)
 * 
 * @module decryptPdf
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { execSync, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Temp directory for PDF operations
const TEMP_DIR = path.join(__dirname, '../../../temp');

/**
 * Ensure temp directory exists
 */
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    // Directory exists
  }
}

/**
 * Generate unique temp file path
 */
function getTempFilePath(prefix = 'pdf') {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  return path.join(TEMP_DIR, `${prefix}_${timestamp}_${randomId}.pdf`);
}

/**
 * Check if QPDF is available on the system
 */
async function isQpdfAvailable() {
  try {
    execSync('qpdf --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check PDF encryption status using QPDF
 * More reliable than pdf-lib for detecting encryption types
 */
async function checkPdfEncryption(pdfPath) {
  try {
    const result = execSync(`qpdf --show-encryption "${pdfPath}" 2>&1`, { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const output = result.toLowerCase();
    
    if (output.includes('not encrypted')) {
      return { encrypted: false, type: null };
    }
    
    // Check for user password requirement
    if (output.includes('user password') && !output.includes('user password =')) {
      return { encrypted: true, type: 'user', needsPassword: true };
    }
    
    // Owner password only (restrictions but viewable)
    if (output.includes('owner password')) {
      return { encrypted: true, type: 'owner', needsPassword: false };
    }
    
    return { encrypted: true, type: 'unknown', needsPassword: true };
    
  } catch (error) {
    // QPDF returns error for encrypted files that need password
    if (error.message && error.message.includes('password')) {
      return { encrypted: true, type: 'user', needsPassword: true };
    }
    return { encrypted: false, type: null };
  }
}

/**
 * Decrypt PDF using QPDF command-line tool
 * This properly preserves fonts and all content
 */
async function decryptWithQpdf(inputPath, outputPath, password = null) {
  try {
    let command;
    
    if (password) {
      // With password - handles both user and owner passwords
      command = `qpdf --password="${password}" --decrypt "${inputPath}" "${outputPath}"`;
    } else {
      // Without password - strips owner password restrictions
      command = `qpdf --decrypt "${inputPath}" "${outputPath}"`;
    }
    
    console.log('🔧 Running QPDF decryption...');
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('warning')) {
      console.warn('⚠️ QPDF stderr:', stderr);
    }
    
    // Verify output file exists and has content
    const stats = await fs.stat(outputPath);
    if (stats.size < 100) {
      throw new Error('QPDF produced empty or invalid output');
    }
    
    console.log(`✅ QPDF decryption successful. Output size: ${(stats.size / 1024).toFixed(2)} KB`);
    return true;
    
  } catch (error) {
    console.error('❌ QPDF decryption failed:', error.message);
    
    // Check for specific error types
    if (error.message.includes('invalid password')) {
      throw new Error('INCORRECT_PASSWORD: The provided password is incorrect');
    }
    
    if (error.message.includes('password')) {
      throw new Error('PASSWORD_REQUIRED: This PDF requires a password');
    }
    
    throw error;
  }
}

/**
 * Fallback: Check if PDF is password protected using pdf-lib
 */
async function isPdfPasswordProtectedFallback(pdfBuffer) {
  try {
    await PDFDocument.load(pdfBuffer, { ignoreEncryption: false });
    return { isProtected: false, canBypass: false };
  } catch (strictError) {
    try {
      await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      return { isProtected: false, canBypass: true };
    } catch (bypassError) {
      if (strictError.message.includes('encrypted') || 
          strictError.message.includes('password')) {
        return { isProtected: true, canBypass: false };
      }
      throw strictError;
    }
  }
}

/**
 * Check if a PDF is password protected
 */
async function isPdfPasswordProtected(pdfBuffer) {
  await ensureTempDir();
  
  // Check if QPDF is available
  const qpdfAvailable = await isQpdfAvailable();
  
  if (qpdfAvailable) {
    // Use QPDF for accurate detection
    const tempInput = getTempFilePath('check_input');
    try {
      await fs.writeFile(tempInput, pdfBuffer);
      const encStatus = await checkPdfEncryption(tempInput);
      await fs.unlink(tempInput).catch(() => {});
      
      if (!encStatus.encrypted) {
        return { isProtected: false, canBypass: false };
      }
      
      if (encStatus.type === 'owner' && !encStatus.needsPassword) {
        return { isProtected: false, canBypass: true };
      }
      
      return { isProtected: true, canBypass: false };
      
    } catch (error) {
      await fs.unlink(tempInput).catch(() => {});
      console.warn('⚠️ QPDF check failed, using fallback:', error.message);
    }
  }
  
  // Fallback to pdf-lib
  return isPdfPasswordProtectedFallback(pdfBuffer);
}

/**
 * Main function: Process PDF (detect protection, decrypt if needed)
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} password - Password (optional if not protected)
 * @param {string} originalFilename - Original filename
 * @returns {Promise<{buffer: Buffer, tempPath: string, wasEncrypted: boolean, extractedText: string|null}>}
 */
async function processPdf(pdfBuffer, password, originalFilename) {
  await ensureTempDir();
  
  console.log('📄 Processing PDF:', originalFilename);
  console.log(`   Buffer size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
  console.log(`   Password provided: ${password ? 'Yes' : 'No'}`);
  
  const qpdfAvailable = await isQpdfAvailable();
  console.log(`   QPDF available: ${qpdfAvailable ? 'Yes ✅' : 'No ❌'}`);
  
  // Generate temp file paths
  const tempInput = getTempFilePath('input');
  const tempOutput = getTempFilePath('output');
  
  try {
    // Write input PDF to temp file
    await fs.writeFile(tempInput, pdfBuffer);
    
    // Check encryption status
    const { isProtected, canBypass } = await isPdfPasswordProtected(pdfBuffer);
    console.log(`   Is protected: ${isProtected}, Can bypass: ${canBypass}`);
    
    // CASE 1: Not encrypted at all
    if (!isProtected && !canBypass) {
      console.log('🔓 PDF is not password protected');
      return {
        buffer: pdfBuffer,
        tempPath: tempInput,
        wasEncrypted: false,
        extractedText: null
      };
    }
    
    // CASE 2: Use QPDF for decryption (preferred method)
    if (qpdfAvailable) {
      console.log('🔧 Using QPDF for decryption...');
      
      try {
        // If protected and no password provided
        if (isProtected && !password) {
          throw new Error('PASSWORD_REQUIRED: This PDF is password protected but no password was provided');
        }
        
        // Decrypt with QPDF
        await decryptWithQpdf(tempInput, tempOutput, password);
        
        // Read the decrypted PDF
        const decryptedBuffer = await fs.readFile(tempOutput);
        
        // Extract text from decrypted PDF using pdf-parse
        let extractedText = null;
        try {
          const pdfParse = require('pdf-parse');
          const data = await pdfParse(decryptedBuffer);
          extractedText = data.text;
          console.log(`✅ Extracted ${extractedText.length} characters from decrypted PDF`);
        } catch (parseError) {
          console.warn('⚠️ pdf-parse on decrypted PDF failed:', parseError.message);
        }
        
        // Cleanup input temp file
        await fs.unlink(tempInput).catch(() => {});
        
        return {
          buffer: decryptedBuffer,
          tempPath: tempOutput,
          wasEncrypted: isProtected || canBypass,
          extractedText: extractedText
        };
        
      } catch (qpdfError) {
        // Clean up temp files
        await fs.unlink(tempInput).catch(() => {});
        await fs.unlink(tempOutput).catch(() => {});
        
        // Re-throw password errors
        if (qpdfError.message.includes('PASSWORD_REQUIRED') || 
            qpdfError.message.includes('INCORRECT_PASSWORD')) {
          throw qpdfError;
        }
        
        console.warn('⚠️ QPDF failed, trying fallback method:', qpdfError.message);
      }
    }
    
    // CASE 3: Fallback - pdf-lib method (less reliable but works for some PDFs)
    console.log('🔄 Using pdf-lib fallback method...');
    
    if (isProtected && !password) {
      throw new Error('PASSWORD_REQUIRED: This PDF is password protected but no password was provided');
    }
    
    try {
      // Try to load with password
      const loadOptions = password 
        ? { password: password, ignoreEncryption: false }
        : { ignoreEncryption: true };
      
      const pdfDoc = await PDFDocument.load(pdfBuffer, loadOptions);
      
      // Create a new unencrypted PDF by copying pages
      const newDoc = await PDFDocument.create();
      const pageCount = pdfDoc.getPageCount();
      console.log(`📄 Copying ${pageCount} pages to new unencrypted PDF...`);
      
      const pages = await newDoc.copyPages(pdfDoc, Array.from({ length: pageCount }, (_, i) => i));
      pages.forEach(page => newDoc.addPage(page));
      
      const unencryptedBytes = await newDoc.save();
      const unencryptedBuffer = Buffer.from(unencryptedBytes);
      
      console.log(`✅ Created unencrypted PDF: ${(unencryptedBuffer.length / 1024).toFixed(2)} KB`);
      
      // Save to temp file
      await fs.writeFile(tempOutput, unencryptedBuffer);
      await fs.unlink(tempInput).catch(() => {});
      
      // Try to extract text
      let extractedText = null;
      try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(unencryptedBuffer);
        extractedText = data.text;
        console.log(`✅ Extracted ${extractedText.length} characters`);
      } catch (parseError) {
        console.warn('⚠️ Text extraction failed:', parseError.message);
      }
      
      return {
        buffer: unencryptedBuffer,
        tempPath: tempOutput,
        wasEncrypted: true,
        extractedText: extractedText
      };
      
    } catch (pdfLibError) {
      // Clean up
      await fs.unlink(tempInput).catch(() => {});
      await fs.unlink(tempOutput).catch(() => {});
      
      if (pdfLibError.message.includes('password') || pdfLibError.message.includes('Incorrect')) {
        throw new Error('INCORRECT_PASSWORD: The provided password is incorrect');
      }
      
      throw new Error(`PDF_PROCESSING_ERROR: ${pdfLibError.message}`);
    }
    
  } catch (error) {
    // Clean up temp files on error
    await fs.unlink(tempInput).catch(() => {});
    await fs.unlink(tempOutput).catch(() => {});
    
    console.error('❌ PDF processing failed:', error.message);
    throw error;
  }
}

/**
 * Delete temporary file
 */
async function deleteTempFile(filePath) {
  try {
    await fs.unlink(filePath);
    console.log(`🗑️  Temporary file deleted: ${filePath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`⚠️  Failed to delete temp file ${filePath}:`, error.message);
    }
  }
}

/**
 * Save decrypted PDF to temporary file
 */
async function saveDecryptedPdfToTemp(pdfBuffer, originalFilename) {
  await ensureTempDir();
  const tempPath = getTempFilePath(path.basename(originalFilename, '.pdf'));
  await fs.writeFile(tempPath, pdfBuffer);
  console.log(`💾 PDF saved to: ${tempPath}`);
  return tempPath;
}

module.exports = {
  isPdfPasswordProtected,
  processPdf,
  deleteTempFile,
  saveDecryptedPdfToTemp,
  getTempFilePath,
  isQpdfAvailable,
  decryptWithQpdf
};
