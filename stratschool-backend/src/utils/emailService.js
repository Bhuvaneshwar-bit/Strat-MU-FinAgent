/**
 * AWS SES Email Service for Invoice Delivery
 * Sends GST invoices as PDF attachments to customers
 */

const { SESClient, SendRawEmailCommand } = require('@aws-sdk/client-ses');

// Initialize SES client with dedicated SES credentials
const sesClient = new SESClient({
  region: process.env.SES_AWS_REGION || process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.SES_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SES_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Send invoice email with PDF attachment
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.from - Sender email address (must be verified in SES)
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlBody - HTML email body
 * @param {string} options.textBody - Plain text email body (fallback)
 * @param {Buffer} options.pdfBuffer - PDF file as Buffer
 * @param {string} options.pdfFileName - Name for the PDF attachment
 * @returns {Promise<Object>} - Result of email send operation
 */
const sendInvoiceEmail = async ({ to, from, subject, htmlBody, textBody, pdfBuffer, pdfFileName }) => {
  try {
    // Create MIME message with attachment
    const boundary = `----=_Part_${Date.now()}`;
    const boundaryAlt = `----=_Alt_${Date.now()}`;
    
    // Build raw email
    const rawEmail = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
      ``,
      `--${boundaryAlt}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      textBody,
      ``,
      `--${boundaryAlt}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      htmlBody,
      ``,
      `--${boundaryAlt}--`,
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf; name="${pdfFileName}"`,
      `Content-Disposition: attachment; filename="${pdfFileName}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      pdfBuffer.toString('base64'),
      ``,
      `--${boundary}--`
    ].join('\r\n');

    const command = new SendRawEmailCommand({
      RawMessage: {
        Data: Buffer.from(rawEmail)
      }
    });

    const response = await sesClient.send(command);
    
    console.log('📧 Email sent successfully:', response.MessageId);
    
    return {
      success: true,
      messageId: response.MessageId,
      message: 'Invoice email sent successfully'
    };
  } catch (error) {
    console.error('❌ Email send error:', error);
    
    // Handle specific SES errors
    if (error.name === 'MessageRejected') {
      return {
        success: false,
        error: 'Email rejected by server. Please verify sender email in AWS SES.',
        code: 'MESSAGE_REJECTED'
      };
    }
    
    if (error.name === 'MailFromDomainNotVerified') {
      return {
        success: false,
        error: 'Sender domain not verified. Please verify domain in AWS SES.',
        code: 'DOMAIN_NOT_VERIFIED'
      };
    }
    
    if (error.name === 'ConfigurationSetDoesNotExist') {
      return {
        success: false,
        error: 'AWS SES configuration issue.',
        code: 'CONFIG_ERROR'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to send email',
      code: 'SEND_FAILED'
    };
  }
};

/**
 * Generate HTML email template for invoice
 * @param {Object} invoiceData - Invoice details
 * @returns {string} - HTML email body
 */
const generateInvoiceEmailHTML = (invoiceData) => {
  const { invoiceNumber, buyerName, supplierName, grandTotal, dueDate, invoiceDate } = invoiceData;
  
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(grandTotal);
  
  const formattedDueDate = new Date(dueDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  const formattedInvoiceDate = new Date(invoiceDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ffcc29 0%, #ffc107 100%); padding: 30px; text-align: center;">
              <h1 style="color: #070a12; margin: 0; font-size: 28px;">📄 Invoice</h1>
              <p style="color: #333; margin: 10px 0 0 0; font-size: 16px;">Invoice #${invoiceNumber}</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                Dear <strong>${buyerName}</strong>,
              </p>
              
              <p style="font-size: 14px; color: #666; line-height: 1.6; margin: 0 0 20px 0;">
                Please find attached the invoice from <strong>${supplierName}</strong>. We appreciate your business!
              </p>
              
              <!-- Invoice Summary Card -->
              <table width="100%" cellpadding="15" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-size: 14px;">Invoice Number</span><br>
                    <strong style="color: #333; font-size: 16px;">${invoiceNumber}</strong>
                  </td>
                  <td style="border-bottom: 1px solid #e9ecef; text-align: right;">
                    <span style="color: #666; font-size: 14px;">Invoice Date</span><br>
                    <strong style="color: #333; font-size: 16px;">${formattedInvoiceDate}</strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="color: #666; font-size: 14px;">Amount Due</span><br>
                    <strong style="color: #ffcc29; font-size: 24px;">${formattedAmount}</strong>
                  </td>
                  <td style="text-align: right;">
                    <span style="color: #666; font-size: 14px;">Due Date</span><br>
                    <strong style="color: #dc3545; font-size: 16px;">${formattedDueDate}</strong>
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 14px; color: #666; line-height: 1.6; margin: 20px 0;">
                The detailed invoice is attached as a PDF document. Please ensure payment is made by the due date to avoid any late fees.
              </p>
              
              <p style="font-size: 14px; color: #666; line-height: 1.6; margin: 20px 0 0 0;">
                If you have any questions regarding this invoice, please don't hesitate to contact us.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #070a12; padding: 20px; text-align: center;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                This is an automated email from <strong style="color: #ffcc29;">${supplierName}</strong>
              </p>
              <p style="color: #666; font-size: 11px; margin: 10px 0 0 0;">
                Powered by InFINity Financial Agent
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

/**
 * Generate plain text email for invoice
 * @param {Object} invoiceData - Invoice details
 * @returns {string} - Plain text email body
 */
const generateInvoiceEmailText = (invoiceData) => {
  const { invoiceNumber, buyerName, supplierName, grandTotal, dueDate, invoiceDate } = invoiceData;
  
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(grandTotal);
  
  return `
Invoice #${invoiceNumber}

Dear ${buyerName},

Please find attached the invoice from ${supplierName}.

Invoice Details:
- Invoice Number: ${invoiceNumber}
- Invoice Date: ${new Date(invoiceDate).toLocaleDateString('en-IN')}
- Amount Due: ${formattedAmount}
- Due Date: ${new Date(dueDate).toLocaleDateString('en-IN')}

The detailed invoice is attached as a PDF document. Please ensure payment is made by the due date.

If you have any questions regarding this invoice, please don't hesitate to contact us.

Best regards,
${supplierName}

---
Powered by InFINity Financial Agent
  `.trim();
};

module.exports = {
  sendInvoiceEmail,
  generateInvoiceEmailHTML,
  generateInvoiceEmailText
};
