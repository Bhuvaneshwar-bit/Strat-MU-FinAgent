/**
 * AWS S3 Upload Utility
 * Handles uploading files to S3 with proper content-type and metadata
 * 
 * @module uploadToS3
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs').promises;
const path = require('path');

// Initialize S3 Client with AWS SDK v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// S3 bucket configuration
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'stratschool-bank-statements';
const S3_FOLDER_PREFIX = process.env.S3_FOLDER_PREFIX || 'bank-statements/';

/**
 * Generate a unique S3 key for the file
 * @param {string} originalFilename - Original filename
 * @param {string} userId - User ID (for organizing files)
 * @returns {string} - S3 key
 */
function generateS3Key(originalFilename, userId = 'anonymous') {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const basename = path.basename(sanitizedFilename, '.pdf');
  
  return `${S3_FOLDER_PREFIX}${userId}/${timestamp}_${randomId}_${basename}.pdf`;
}

/**
 * Upload PDF to S3
 * @param {Buffer|string} fileData - PDF buffer or file path
 * @param {string} originalFilename - Original filename
 * @param {Object} options - Upload options
 * @param {string} options.userId - User ID
 * @param {Object} options.metadata - Additional metadata
 * @returns {Promise<{bucket: string, key: string, location: string}>}
 */
async function uploadPdfToS3(fileData, originalFilename, options = {}) {
  try {
    console.log('☁️  Starting S3 upload...');
    
    // Get buffer from file path if needed
    let buffer;
    if (typeof fileData === 'string') {
      buffer = await fs.readFile(fileData);
    } else {
      buffer = fileData;
    }
    
    // Generate S3 key
    const s3Key = generateS3Key(originalFilename, options.userId);
    
    // Prepare metadata
    const metadata = {
      'original-filename': originalFilename,
      'upload-timestamp': new Date().toISOString(),
      'user-id': options.userId || 'anonymous',
      ...options.metadata
    };
    
    // Prepare upload parameters
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: 'application/pdf',
      Metadata: metadata,
      ServerSideEncryption: 'AES256', // Enable server-side encryption
      ACL: 'private' // Keep files private
    };
    
    // Upload to S3
    const command = new PutObjectCommand(uploadParams);
    const response = await s3Client.send(command);
    
    // Construct S3 URL
    const s3Location = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
    
    console.log('✅ Successfully uploaded to S3:', s3Key);
    
    return {
      bucket: BUCKET_NAME,
      key: s3Key,
      location: s3Location,
      etag: response.ETag,
      versionId: response.VersionId
    };
    
  } catch (error) {
    console.error('❌ S3 upload failed:', error.message);
    
    // Provide specific error messages
    if (error.name === 'NoSuchBucket') {
      throw new Error(`S3_BUCKET_ERROR: Bucket '${BUCKET_NAME}' does not exist`);
    }
    
    if (error.name === 'AccessDenied') {
      throw new Error('S3_ACCESS_DENIED: Check your AWS credentials and IAM permissions');
    }
    
    throw new Error(`S3_UPLOAD_ERROR: ${error.message}`);
  }
}

/**
 * Delete file from S3
 * @param {string} s3Key - S3 key of the file to delete
 * @returns {Promise<void>}
 */
async function deleteFromS3(s3Key) {
  try {
    console.log('🗑️  Deleting from S3:', s3Key);
    
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key
    };
    
    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);
    
    console.log('✅ Successfully deleted from S3');
    
  } catch (error) {
    console.warn('⚠️  Failed to delete from S3:', error.message);
    // Don't throw error - deletion is not critical
  }
}

/**
 * Check if S3 credentials are configured
 * @returns {boolean}
 */
function isS3Configured() {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME
  );
}

/**
 * Validate S3 configuration
 * @throws {Error} If configuration is invalid
 */
function validateS3Config() {
  if (!process.env.AWS_ACCESS_KEY_ID) {
    throw new Error('AWS_ACCESS_KEY_ID is not configured in environment variables');
  }
  
  if (!process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS_SECRET_ACCESS_KEY is not configured in environment variables');
  }
  
  if (!process.env.AWS_S3_BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME is not configured in environment variables');
  }
  
  console.log('✅ S3 configuration validated');
  return true;
}

module.exports = {
  uploadPdfToS3,
  deleteFromS3,
  generateS3Key,
  isS3Configured,
  validateS3Config,
  s3Client,
  BUCKET_NAME
};
