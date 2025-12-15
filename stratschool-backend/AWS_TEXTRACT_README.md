# AWS Textract Bank Statement Parser - Complete Documentation

## Overview
Production-grade AWS Textract integration for extracting structured data from password-protected bank statement PDFs.

## Architecture

```
┌─────────────────┐
│  Client Upload  │
│  (PDF + PWD)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Backend Express Server                         │
│  ┌──────────────────────────────────────────┐  │
│  │ 1. PDF Decryption (pdf-lib)             │  │
│  │    - Detect password protection          │  │
│  │    - Decrypt with user password          │  │
│  │    - Save to temp file                   │  │
│  └──────────────────────────────────────────┘  │
│                    ↓                            │
│  ┌──────────────────────────────────────────┐  │
│  │ 2. S3 Upload (@aws-sdk/client-s3)       │  │
│  │    - Upload unlocked PDF to S3           │  │
│  │    - Set proper content-type             │  │
│  │    - Enable server-side encryption       │  │
│  └──────────────────────────────────────────┘  │
│                    ↓                            │
│  ┌──────────────────────────────────────────┐  │
│  │ 3. Textract Analysis                     │  │
│  │    (@aws-sdk/client-textract)            │  │
│  │    - Analyze document (sync/async)       │  │
│  │    - Extract tables, forms, text         │  │
│  │    - Get key-value pairs                 │  │
│  └──────────────────────────────────────────┘  │
│                    ↓                            │
│  ┌──────────────────────────────────────────┐  │
│  │ 4. Parse Bank Statement                  │  │
│  │    - Extract account info                │  │
│  │    - Parse transactions from tables      │  │
│  │    - Normalize dates and amounts         │  │
│  │    - Calculate summary                   │  │
│  └──────────────────────────────────────────┘  │
│                    ↓                            │
│  ┌──────────────────────────────────────────┐  │
│  │ 5. Cleanup & Response                    │  │
│  │    - Delete temp files                   │  │
│  │    - Return structured JSON              │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Folder Structure

```
stratschool-backend/
├── src/
│   ├── utils/
│   │   └── aws/
│   │       ├── decryptPdf.js           # PDF password handling
│   │       ├── uploadToS3.js           # S3 upload utility
│   │       ├── textractHandler.js      # Textract API integration
│   │       └── parseBankStatement.js   # Bank statement parser
│   └── routes/
│       └── uploadBankStatement.js      # Express route handler
├── temp/                               # Temporary PDF storage
└── .env                                # AWS credentials
```

## Environment Variables

Add these to your `.env` file:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=stratschool-bank-statements

# Optional: S3 folder structure
S3_FOLDER_PREFIX=bank-statements/

# Server Configuration
PORT=5001
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
```

## IAM Permissions Required

Create an IAM user with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TextractAccess",
      "Effect": "Allow",
      "Action": [
        "textract:AnalyzeDocument",
        "textract:StartDocumentAnalysis",
        "textract:GetDocumentAnalysis"
      ],
      "Resource": "*"
    },
    {
      "Sid": "S3BucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::stratschool-bank-statements",
        "arn:aws:s3:::stratschool-bank-statements/*"
      ]
    }
  ]
}
```

### Steps to Create IAM User:

1. Go to AWS IAM Console
2. Click "Users" → "Add User"
3. Username: `textract-service-user`
4. Select "Programmatic access"
5. Click "Next: Permissions"
6. Click "Attach existing policies directly"
7. Click "Create policy" → JSON → Paste the above policy
8. Name it: `TextractAndS3Access`
9. Attach the policy to the user
10. Save Access Key ID and Secret Access Key

## S3 Bucket Setup

### Create S3 Bucket:

```bash
aws s3 mb s3://stratschool-bank-statements --region us-east-1
```

### Enable Server-Side Encryption:

```bash
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

### Set Bucket Policy (Private):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyPublicAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::stratschool-bank-statements/*",
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

## API Endpoints

### 1. Upload Bank Statement

**Endpoint:** `POST /api/upload/bank-statement`

**Authentication:** Required (JWT Token)

**Content-Type:** `multipart/form-data`

**Request Body:**
```
pdf: [PDF File]
password: [Optional] Password for encrypted PDF
async: [Optional] Use async Textract processing (true/false)
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Bank statement processed successfully",
  "data": {
    "account_holder": "JOHN DOE",
    "account_number": "1234567890",
    "ifsc_code": "HDFC0001234",
    "bank_name": "HDFC Bank",
    "statement_period": {
      "from": "2024-01-01",
      "to": "2024-01-31"
    },
    "opening_balance": 50000.00,
    "closing_balance": 48500.00,
    "transactions": [
      {
        "date": "2024-01-05",
        "description": "UPI/GPAY/1234567890",
        "amount": -500.00,
        "type": "debit",
        "balance": 49500.00,
        "reference": "UTR1234567890"
      },
      {
        "date": "2024-01-10",
        "description": "SALARY CREDIT",
        "amount": 50000.00,
        "type": "credit",
        "balance": 99500.00,
        "reference": null
      }
    ],
    "summary": {
      "total_credits": 50000.00,
      "total_debits": 1500.00,
      "transaction_count": 25,
      "net_change": 48500.00
    },
    "metadata": {
      "filename": "bank-statement.pdf",
      "fileSize": 245678,
      "wasPasswordProtected": true,
      "s3Location": "https://stratschool-bank-statements.s3.us-east-1.amazonaws.com/...",
      "s3Key": "bank-statements/user123/1234567890_abc123_statement.pdf",
      "processedAt": "2024-12-07T10:30:00.000Z"
    }
  }
}
```

**Error Response - Password Required (400):**
```json
{
  "success": false,
  "error": "PASSWORD_REQUIRED",
  "message": "This PDF is password protected but no password was provided",
  "passwordRequired": true
}
```

**Error Response - Incorrect Password (400):**
```json
{
  "success": false,
  "error": "INCORRECT_PASSWORD",
  "message": "The provided password is incorrect",
  "passwordRequired": true
}
```

**Error Response - Invalid File (400):**
```json
{
  "success": false,
  "error": "INVALID_FILE_TYPE",
  "message": "Only PDF files are allowed"
}
```

### 2. Health Check

**Endpoint:** `GET /api/upload/health`

**Authentication:** Not required

**Response (200):**
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

### 3. Test Textract (Development Only)

**Endpoint:** `POST /api/upload/test-textract`

**Authentication:** Required

**Request Body:**
```json
{
  "s3Bucket": "stratschool-bank-statements",
  "s3Key": "bank-statements/user123/test.pdf"
}
```

## Postman Collection

### Step 1: Setup Environment

Create a Postman environment with these variables:
```
BASE_URL: http://localhost:5001
JWT_TOKEN: [Your JWT token from login]
```

### Step 2: Login (Get JWT Token)

```
POST {{BASE_URL}}/api/auth/signin
Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

Copy the `token` from response and set it in environment variable `JWT_TOKEN`.

### Step 3: Upload Bank Statement (No Password)

```
POST {{BASE_URL}}/api/upload/bank-statement
Authorization: Bearer {{JWT_TOKEN}}
Content-Type: multipart/form-data

Body (form-data):
- pdf: [Select PDF file]
- async: false
```

### Step 4: Upload Bank Statement (With Password)

```
POST {{BASE_URL}}/api/upload/bank-statement
Authorization: Bearer {{JWT_TOKEN}}
Content-Type: multipart/form-data

Body (form-data):
- pdf: [Select encrypted PDF file]
- password: your_pdf_password
- async: false
```

### Step 5: Check Health

```
GET {{BASE_URL}}/api/upload/health
```

## Sample Textract Response

### Raw Textract Response Structure:
```json
{
  "Blocks": [
    {
      "BlockType": "LINE",
      "Confidence": 99.5,
      "Text": "HDFC Bank Limited",
      "Geometry": {...},
      "Id": "block-1"
    },
    {
      "BlockType": "KEY_VALUE_SET",
      "EntityTypes": ["KEY"],
      "Confidence": 98.2,
      "Relationships": [
        {
          "Type": "VALUE",
          "Ids": ["block-3"]
        }
      ],
      "Id": "block-2"
    },
    {
      "BlockType": "TABLE",
      "Confidence": 97.8,
      "Relationships": [
        {
          "Type": "CHILD",
          "Ids": ["cell-1", "cell-2", "cell-3"]
        }
      ],
      "Id": "table-1"
    },
    {
      "BlockType": "CELL",
      "RowIndex": 1,
      "ColumnIndex": 1,
      "Confidence": 99.1,
      "Text": "Date",
      "Id": "cell-1"
    }
  ],
  "DocumentMetadata": {
    "Pages": 5
  }
}
```

### Our Processed Response:
```json
{
  "text": [
    {
      "text": "HDFC Bank Limited",
      "confidence": 99.5,
      "geometry": {...}
    }
  ],
  "keyValuePairs": [
    {
      "key": "Account Number",
      "value": "1234567890",
      "confidence": 98.2
    }
  ],
  "tables": [
    {
      "rowCount": 25,
      "columnCount": 5,
      "rows": [
        ["Date", "Description", "Debit", "Credit", "Balance"],
        ["05-01-2024", "UPI/GPAY", "500.00", "", "49500.00"]
      ]
    }
  ]
}
```

## Code Modules Explained

### 1. decryptPdf.js
- Detects password-protected PDFs
- Unlocks PDFs using pdf-lib
- Creates temporary unlocked files
- Handles cleanup

### 2. uploadToS3.js
- Uploads files to S3 with AWS SDK v3
- Sets proper content-type and metadata
- Enables server-side encryption (AES256)
- Generates unique S3 keys

### 3. textractHandler.js
- Calls Textract AnalyzeDocument (sync)
- Calls StartDocumentAnalysis + GetDocumentAnalysis (async)
- Processes Textract blocks
- Extracts text, tables, key-value pairs

### 4. parseBankStatement.js
- Identifies account information
- Parses transaction tables
- Normalizes dates and amounts
- Calculates summary statistics

### 5. uploadBankStatement.js
- Express route handler
- Orchestrates the entire pipeline
- Error handling and cleanup
- Returns structured JSON response

## Testing Locally

### 1. Start the server:
```bash
cd stratschool-backend
npm start
```

### 2. Test with cURL (no password):
```bash
curl -X POST http://localhost:5001/api/upload/bank-statement \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "pdf=@/path/to/statement.pdf" \
  -F "async=false"
```

### 3. Test with cURL (with password):
```bash
curl -X POST http://localhost:5001/api/upload/bank-statement \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "pdf=@/path/to/encrypted-statement.pdf" \
  -F "password=your_password" \
  -F "async=false"
```

## AWS Lambda Deployment (Optional)

To deploy as AWS Lambda function:

### 1. Create Lambda Layer for Dependencies:
```bash
mkdir nodejs
cd nodejs
npm install @aws-sdk/client-textract @aws-sdk/client-s3 pdf-lib
cd ..
zip -r layer.zip nodejs
aws lambda publish-layer-version \
  --layer-name textract-dependencies \
  --zip-file fileb://layer.zip \
  --compatible-runtimes nodejs18.x
```

### 2. Create Lambda Function:
```bash
zip -r function.zip src/
aws lambda create-function \
  --function-name bank-statement-processor \
  --runtime nodejs18.x \
  --handler src/routes/uploadBankStatement.handler \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-textract-role \
  --zip-file fileb://function.zip \
  --timeout 300 \
  --memory-size 1024 \
  --layers arn:aws:lambda:us-east-1:ACCOUNT_ID:layer:textract-dependencies:1
```

### 3. Set Environment Variables:
```bash
aws lambda update-function-configuration \
  --function-name bank-statement-processor \
  --environment Variables="{AWS_REGION=us-east-1,AWS_S3_BUCKET_NAME=stratschool-bank-statements}"
```

## Troubleshooting

### Issue: "AWS credentials not configured"
**Solution:** Ensure `.env` file has correct `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

### Issue: "S3 bucket does not exist"
**Solution:** Create bucket with `aws s3 mb s3://your-bucket-name`

### Issue: "Access Denied" from Textract
**Solution:** Check IAM permissions, ensure user has `textract:AnalyzeDocument` permission

### Issue: "Incorrect password"
**Solution:** Verify PDF password is correct, try opening PDF manually first

### Issue: "No transactions found"
**Solution:** Check if bank statement has table structure, may need to adjust column detection logic

## Phase 2: ML Classification (Future)

The architecture is designed to support ML-based document classification:

```javascript
// Future enhancement
const documentType = await mlClassifier.classify(pdfBuffer);
// Returns: 'bank_statement', 'invoice', 'receipt', etc.

if (documentType === 'bank_statement') {
  result = await parseBankStatement(textractData);
} else if (documentType === 'invoice') {
  result = await parseInvoice(textractData);
}
```

## Cost Estimation

### AWS Textract Pricing (us-east-1):
- AnalyzeDocument: $1.50 per 1,000 pages
- For 1,000 bank statements (avg 3 pages each): $4.50

### AWS S3 Pricing:
- Storage: $0.023 per GB/month
- PUT requests: $0.005 per 1,000 requests
- For 1,000 PDFs (avg 500KB each): ~$0.01/month storage

### Estimated Cost for 10,000 statements/month:
- Textract: ~$45
- S3 Storage: ~$0.10
- S3 Requests: ~$0.05
- **Total: ~$45.15/month**

## Support

For issues or questions:
- Check logs in console
- Verify AWS credentials
- Test with sample PDFs first
- Check S3 bucket permissions

## License

Proprietary - StratSchool Financial Agent
