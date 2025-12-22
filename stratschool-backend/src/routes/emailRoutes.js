/**
 * Email Routes for Invoice Delivery
 * Handles sending invoices via AWS SES
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { sendInvoiceEmail, generateInvoiceEmailHTML, generateInvoiceEmailText } = require('../utils/emailService');

/**
 * POST /api/email/send-invoice
 * Send invoice to customer via email
 */
router.post('/send-invoice', auth, async (req, res) => {
  try {
    const { 
      recipientEmail, 
      invoiceData, 
      pdfBase64,
      customMessage 
    } = req.body;

    // Validate required fields
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required'
      });
    }

    if (!invoiceData || !invoiceData.invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: 'Invoice data is required'
      });
    }

    if (!pdfBase64) {
      return res.status(400).json({
        success: false,
        message: 'PDF attachment is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Get sender email from environment or use supplier email
    const senderEmail = process.env.SES_SENDER_EMAIL || invoiceData.supplierEmail;
    
    if (!senderEmail) {
      return res.status(400).json({
        success: false,
        message: 'Sender email not configured. Please set SES_SENDER_EMAIL in environment variables.'
      });
    }

    // Convert base64 PDF to Buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    
    // Generate email content
    const subject = `Invoice #${invoiceData.invoiceNumber} from ${invoiceData.supplierName || 'Your Supplier'}`;
    const htmlBody = generateInvoiceEmailHTML(invoiceData);
    const textBody = generateInvoiceEmailText(invoiceData);
    
    // Append custom message if provided
    const finalHtmlBody = customMessage 
      ? htmlBody.replace(
          '</td>\n          </tr>\n          \n          <!-- Footer -->',
          `<div style="background-color: #fffef0; border-left: 4px solid #ffcc29; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <strong style="color: #333;">Message from sender:</strong>
            <p style="color: #666; margin: 10px 0 0 0;">${customMessage}</p>
          </div></td>\n          </tr>\n          \n          <!-- Footer -->`
        )
      : htmlBody;

    const finalTextBody = customMessage
      ? textBody + `\n\nMessage from sender:\n${customMessage}`
      : textBody;

    // Send email
    const result = await sendInvoiceEmail({
      to: recipientEmail,
      from: senderEmail,
      subject,
      htmlBody: finalHtmlBody,
      textBody: finalTextBody,
      pdfBuffer,
      pdfFileName: `Invoice-${invoiceData.invoiceNumber}.pdf`
    });

    if (result.success) {
      console.log(`📧 Invoice ${invoiceData.invoiceNumber} sent to ${recipientEmail}`);
      
      return res.json({
        success: true,
        message: 'Invoice sent successfully!',
        messageId: result.messageId,
        recipient: recipientEmail
      });
    } else {
      console.error(`❌ Failed to send invoice ${invoiceData.invoiceNumber}:`, result.error);
      
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to send email',
        code: result.code
      });
    }

  } catch (error) {
    console.error('Email route error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Server error while sending email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/email/test
 * Test email configuration (development only)
 */
router.post('/test', auth, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Test endpoint not available in production'
    });
  }

  const { testEmail } = req.body;
  
  if (!testEmail) {
    return res.status(400).json({
      success: false,
      message: 'Test email address required'
    });
  }

  try {
    // Create test invoice data
    const testInvoice = {
      invoiceNumber: 'TEST-001',
      buyerName: 'Test Customer',
      supplierName: 'Your Company',
      grandTotal: 10000,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      invoiceDate: new Date()
    };

    // Create a minimal test PDF (just text for testing)
    const testPdfContent = Buffer.from('Test PDF Content - Invoice TEST-001');
    
    const result = await sendInvoiceEmail({
      to: testEmail,
      from: process.env.SES_SENDER_EMAIL || 'test@example.com',
      subject: 'Test Invoice Email',
      htmlBody: generateInvoiceEmailHTML(testInvoice),
      textBody: generateInvoiceEmailText(testInvoice),
      pdfBuffer: testPdfContent,
      pdfFileName: 'test-invoice.pdf'
    });

    return res.json({
      success: result.success,
      message: result.success ? 'Test email sent!' : result.error,
      messageId: result.messageId
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/email/status
 * Check email service status
 */
router.get('/status', auth, async (req, res) => {
  const configured = !!(
    process.env.AWS_ACCESS_KEY_ID && 
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.SES_SENDER_EMAIL
  );

  return res.json({
    success: true,
    configured,
    senderEmail: process.env.SES_SENDER_EMAIL ? 'Configured' : 'Not configured',
    awsCredentials: process.env.AWS_ACCESS_KEY_ID ? 'Configured' : 'Not configured',
    region: process.env.AWS_REGION || 'ap-south-1'
  });
});

module.exports = router;
