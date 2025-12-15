# Quick Setup Guide - AWS Textract Integration

## ⚡ Quick Start (5 minutes)

### Step 1: Configure AWS Credentials
Add these to your `.env` file:
```
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
```

### Step 2: Create S3 Bucket

**Option A: Using AWS Console**
1. Go to https://console.aws.amazon.com/s3
2. Click "Create bucket"
3. Bucket name: `stratschool-bank-statements`
4. Region: `us-east-1`
5. **Block all public access**: ✅ (Keep it checked)
6. **Bucket Versioning**: Disabled (or Enabled for backup)
7. **Server-side encryption**: Enable with Amazon S3-managed keys (SSE-S3)
8. Click "Create bucket"

**Option B: Using AWS CLI**
```bash
# Install AWS CLI if not installed
# Download from: https://aws.amazon.com/cli/

# Configure AWS CLI with your credentials
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json

# Create the bucket
aws s3 mb s3://stratschool-bank-statements --region us-east-1

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket stratschool-bank-statements \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### Step 3: Verify IAM Permissions

Make sure your IAM user has these permissions:
- ✅ `textract:AnalyzeDocument`
- ✅ `textract:StartDocumentAnalysis`
- ✅ `textract:GetDocumentAnalysis`
- ✅ `s3:PutObject`
- ✅ `s3:GetObject`
- ✅ `s3:DeleteObject`

**To check/add permissions:**
1. Go to https://console.aws.amazon.com/iam
2. Click "Users" → Find your user
3. Click "Add permissions" → "Attach policies directly"
4. Search and attach:
   - `AmazonTextractFullAccess`
   - Create custom policy for S3 (see AWS_TEXTRACT_README.md)

### Step 4: Install Dependencies

The packages are being installed automatically. If not, run:
```bash
cd stratschool-backend
npm install @aws-sdk/client-textract @aws-sdk/client-s3 pdf-lib
```

### Step 5: Test the Integration

**Option 1: Health Check**
```bash
curl http://localhost:5001/api/upload/health
```

Expected response:
```json
{
  "success": true,
  "message": "AWS Textract service is ready",
  "configuration": {
    "s3Configured": true,
    "awsRegion": "us-east-1",
    "s3Bucket": "stratschool-bank-statements"
  }
}
```

**Option 2: Run Test Script**
```bash
node test-textract.js
```

**Option 3: Test with Postman**
See `EXAMPLES.js` for Postman collection examples.

---

## 🎯 Usage Examples

### Example 1: Upload Bank Statement (JavaScript)

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function uploadBankStatement() {
  // 1. Login to get token
  const loginResponse = await axios.post('http://localhost:5001/api/auth/signin', {
    email: 'user@example.com',
    password: 'password'
  });
  
  const token = loginResponse.data.token;
  
  // 2. Upload PDF
  const formData = new FormData();
  formData.append('pdf', fs.createReadStream('./statement.pdf'));
  formData.append('password', 'pdf_password'); // If password-protected
  
  const response = await axios.post(
    'http://localhost:5001/api/upload/bank-statement',
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  console.log('Transactions:', response.data.data.transactions.length);
}

uploadBankStatement();
```

### Example 2: Upload with cURL

```bash
# Get JWT token first
TOKEN=$(curl -X POST http://localhost:5001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.token')

# Upload bank statement
curl -X POST http://localhost:5001/api/upload/bank-statement \
  -H "Authorization: Bearer $TOKEN" \
  -F "pdf=@statement.pdf" \
  -F "password=pdf_password"
```

### Example 3: React Frontend Integration

```javascript
import axios from 'axios';

async function handleFileUpload(file, password) {
  const formData = new FormData();
  formData.append('pdf', file);
  if (password) formData.append('password', password);
  
  try {
    const response = await axios.post(
      '/api/upload/bank-statement',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    const data = response.data.data;
    console.log(`Processed ${data.transactions.length} transactions`);
    console.log(`Account: ${data.account_number}`);
    
    return data;
  } catch (error) {
    if (error.response?.data?.error === 'PASSWORD_REQUIRED') {
      // Prompt user for password
      const password = prompt('PDF is password protected. Enter password:');
      return handleFileUpload(file, password);
    }
    throw error;
  }
}
```

---

## 🔧 Troubleshooting

### Issue 1: "S3 bucket does not exist"
**Solution:**
```bash
aws s3 mb s3://stratschool-bank-statements --region us-east-1
```

### Issue 2: "Access Denied" from S3 or Textract
**Solution:** Check IAM permissions
```bash
aws iam list-user-policies --user-name your-username
aws iam list-attached-user-policies --user-name your-username
```

### Issue 3: "Cannot find module @aws-sdk/client-textract"
**Solution:**
```bash
npm install @aws-sdk/client-textract @aws-sdk/client-s3 pdf-lib
```

### Issue 4: "Incorrect password"
**Solution:** Verify PDF password by opening it manually first

### Issue 5: Backend not starting
**Solution:** Check if all dependencies are installed
```bash
cd stratschool-backend
npm install
node server.js
```

---

## 📊 What Gets Extracted

From a bank statement PDF, the system extracts:

### Account Information
- ✅ Account holder name
- ✅ Account number
- ✅ IFSC code
- ✅ Bank name
- ✅ Statement period (from/to dates)
- ✅ Opening balance
- ✅ Closing balance

### Transactions
For each transaction:
- ✅ Date
- ✅ Description/Narration
- ✅ Amount (positive for credit, negative for debit)
- ✅ Transaction type (credit/debit)
- ✅ Running balance
- ✅ Reference number (if available)

### Summary
- ✅ Total credits
- ✅ Total debits
- ✅ Transaction count
- ✅ Net change

---

## 🚀 Next Steps

1. **Test with sample PDFs**
   - Place sample bank statements in backend folder
   - Run: `node test-textract.js`

2. **Integrate with Frontend**
   - Add file upload component
   - Handle password prompts
   - Display extracted data

3. **Add to Bookkeeping Flow**
   - Connect with existing bookkeeping routes
   - Auto-categorize transactions
   - Generate journal entries

4. **Production Deployment**
   - Use environment variables for AWS credentials
   - Set up proper IAM roles
   - Enable CloudWatch logging
   - Set up S3 lifecycle policies

---

## 📚 Additional Resources

- **Full Documentation:** `AWS_TEXTRACT_README.md`
- **Code Examples:** `EXAMPLES.js`
- **Test Script:** `test-textract.js`
- **API Docs:** See Postman collection in `EXAMPLES.js`

---

## 💰 Cost Estimation

For 10,000 bank statements per month (avg 3 pages each):
- **AWS Textract:** ~$45/month
- **AWS S3 Storage:** ~$0.10/month
- **Total:** ~$45.15/month

See AWS_TEXTRACT_README.md for detailed cost breakdown.

---

## ✅ Checklist

Before going to production:

- [ ] S3 bucket created
- [ ] IAM permissions verified
- [ ] AWS credentials in .env file
- [ ] Dependencies installed (`npm install`)
- [ ] Backend server running
- [ ] Health check passes
- [ ] Test with sample PDF successful
- [ ] Error handling tested
- [ ] Frontend integration complete
- [ ] Production environment variables set
- [ ] CloudWatch logging configured
- [ ] S3 lifecycle policy set
- [ ] Cost monitoring enabled

---

## 🆘 Support

If you encounter issues:
1. Check the console logs
2. Run health check endpoint
3. Verify AWS credentials
4. Test with simple non-encrypted PDF first
5. Check IAM permissions in AWS Console

For detailed troubleshooting, see AWS_TEXTRACT_README.md section "Troubleshooting".
