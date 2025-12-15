/**
 * Example Request Bodies and Test Data
 * Use these examples with Postman or cURL
 */

// ============================================
// 1. POSTMAN COLLECTION EXAMPLES
// ============================================

// Example 1: Upload Bank Statement (No Password)
const uploadNonPasswordProtected = {
  method: 'POST',
  url: 'http://localhost:5001/api/upload/bank-statement',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
  },
  formData: {
    pdf: {
      // Select file from file picker
      value: 'path/to/bank-statement.pdf',
      options: {
        filename: 'bank-statement.pdf',
        contentType: 'application/pdf'
      }
    },
    async: 'false'
  }
};

// Example 2: Upload Password-Protected Bank Statement
const uploadPasswordProtected = {
  method: 'POST',
  url: 'http://localhost:5001/api/upload/bank-statement',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
  },
  formData: {
    pdf: {
      value: 'path/to/encrypted-statement.pdf',
      options: {
        filename: 'encrypted-statement.pdf',
        contentType: 'application/pdf'
      }
    },
    password: 'myPDFPassword123',
    async: 'false'
  }
};

// Example 3: Upload Large Multi-Page Statement (Async Processing)
const uploadLargeStatement = {
  method: 'POST',
  url: 'http://localhost:5001/api/upload/bank-statement',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
  },
  formData: {
    pdf: {
      value: 'path/to/large-statement.pdf',
      options: {
        filename: 'large-statement.pdf',
        contentType: 'application/pdf'
      }
    },
    async: 'true' // Use async processing for large files
  }
};

// ============================================
// 2. EXPECTED SUCCESS RESPONSES
// ============================================

// Example Success Response
const successResponse = {
  "success": true,
  "message": "Bank statement processed successfully",
  "data": {
    "account_holder": "RAJESH KUMAR SHARMA",
    "account_number": "50100123456789",
    "ifsc_code": "HDFC0001234",
    "bank_name": "HDFC Bank",
    "statement_period": {
      "from": "2024-01-01",
      "to": "2024-01-31"
    },
    "opening_balance": 125000.50,
    "closing_balance": 118750.25,
    "transactions": [
      {
        "date": "2024-01-02",
        "description": "IMPS/P2P/234567890123/JOHN DOE",
        "amount": -5000.00,
        "type": "debit",
        "balance": 120000.50,
        "reference": "234567890123"
      },
      {
        "date": "2024-01-05",
        "description": "UPI/GPAY/1234567890@okaxis/GROCERY STORE",
        "amount": -1250.00,
        "type": "debit",
        "balance": 118750.50,
        "reference": "UTR1234567890"
      },
      {
        "date": "2024-01-10",
        "description": "NEFT CR/COMPANY SALARY/JAN2024",
        "amount": 85000.00,
        "type": "credit",
        "balance": 203750.50,
        "reference": "NEFT98765432"
      },
      {
        "date": "2024-01-15",
        "description": "ATM WDL/HDFC ATM/SECTOR 18",
        "amount": -10000.00,
        "type": "debit",
        "balance": 193750.50,
        "reference": "ATM001234"
      },
      {
        "date": "2024-01-20",
        "description": "CREDIT CARD BILL PAYMENT",
        "amount": -75000.00,
        "type": "debit",
        "balance": 118750.50,
        "reference": "CC987654"
      }
    ],
    "summary": {
      "total_credits": 85000.00,
      "total_debits": 91250.25,
      "transaction_count": 47,
      "net_change": -6250.25
    },
    "metadata": {
      "filename": "HDFC-Statement-Jan2024.pdf",
      "fileSize": 856432,
      "wasPasswordProtected": true,
      "s3Location": "https://stratschool-bank-statements.s3.us-east-1.amazonaws.com/bank-statements/user_12345/1733582400_abc7d3e_HDFC-Statement-Jan2024.pdf",
      "s3Key": "bank-statements/user_12345/1733582400_abc7d3e_HDFC-Statement-Jan2024.pdf",
      "processedAt": "2024-12-07T10:30:00.000Z"
    }
  }
};

// ============================================
// 3. EXPECTED ERROR RESPONSES
// ============================================

// Error: Password Required
const errorPasswordRequired = {
  "success": false,
  "error": "PASSWORD_REQUIRED",
  "message": "This PDF is password protected but no password was provided",
  "passwordRequired": true
};

// Error: Incorrect Password
const errorIncorrectPassword = {
  "success": false,
  "error": "INCORRECT_PASSWORD",
  "message": "The provided password is incorrect",
  "passwordRequired": true
};

// Error: Invalid File Type
const errorInvalidFileType = {
  "success": false,
  "error": "INVALID_FILE_TYPE",
  "message": "Only PDF files are allowed"
};

// Error: No File Uploaded
const errorNoFile = {
  "success": false,
  "error": "NO_FILE",
  "message": "No PDF file uploaded"
};

// Error: S3 Not Configured
const errorS3NotConfigured = {
  "success": false,
  "error": "S3_NOT_CONFIGURED",
  "message": "AWS_S3_BUCKET_NAME is not configured in environment variables"
};

// Error: Textract Analysis Failed
const errorTextractFailed = {
  "success": false,
  "error": "TEXTRACT_ERROR",
  "message": "Textract analysis failed: Cannot access the S3 object. Check bucket and key."
};

// ============================================
// 4. SAMPLE TEXTRACT RAW RESPONSE
// ============================================

const sampleTextractResponse = {
  "DocumentMetadata": {
    "Pages": 1
  },
  "Blocks": [
    {
      "BlockType": "PAGE",
      "Geometry": {
        "BoundingBox": {
          "Width": 1.0,
          "Height": 1.0,
          "Left": 0.0,
          "Top": 0.0
        }
      },
      "Id": "8a2e52c8-f7e9-4f37-b1c1-234567890abc",
      "Relationships": [
        {
          "Type": "CHILD",
          "Ids": [
            "line-1",
            "line-2",
            "table-1",
            "kvs-1"
          ]
        }
      ]
    },
    {
      "BlockType": "LINE",
      "Confidence": 99.87,
      "Text": "HDFC Bank Limited",
      "Geometry": {
        "BoundingBox": {
          "Width": 0.25,
          "Height": 0.02,
          "Left": 0.1,
          "Top": 0.05
        }
      },
      "Id": "line-1"
    },
    {
      "BlockType": "LINE",
      "Confidence": 99.45,
      "Text": "Account Statement",
      "Geometry": {
        "BoundingBox": {
          "Width": 0.2,
          "Height": 0.02,
          "Left": 0.1,
          "Top": 0.08
        }
      },
      "Id": "line-2"
    },
    {
      "BlockType": "KEY_VALUE_SET",
      "EntityTypes": ["KEY"],
      "Confidence": 98.76,
      "Geometry": {
        "BoundingBox": {
          "Width": 0.15,
          "Height": 0.02,
          "Left": 0.1,
          "Top": 0.15
        }
      },
      "Id": "kvs-1",
      "Relationships": [
        {
          "Type": "VALUE",
          "Ids": ["kvs-2"]
        },
        {
          "Type": "CHILD",
          "Ids": ["word-1", "word-2"]
        }
      ]
    },
    {
      "BlockType": "KEY_VALUE_SET",
      "EntityTypes": ["VALUE"],
      "Confidence": 99.12,
      "Geometry": {
        "BoundingBox": {
          "Width": 0.2,
          "Height": 0.02,
          "Left": 0.3,
          "Top": 0.15
        }
      },
      "Id": "kvs-2",
      "Relationships": [
        {
          "Type": "CHILD",
          "Ids": ["word-3"]
        }
      ]
    },
    {
      "BlockType": "WORD",
      "Confidence": 99.5,
      "Text": "Account",
      "TextType": "PRINTED",
      "Geometry": {
        "BoundingBox": {
          "Width": 0.08,
          "Height": 0.02,
          "Left": 0.1,
          "Top": 0.15
        }
      },
      "Id": "word-1"
    },
    {
      "BlockType": "WORD",
      "Confidence": 98.9,
      "Text": "Number:",
      "TextType": "PRINTED",
      "Geometry": {
        "BoundingBox": {
          "Width": 0.07,
          "Height": 0.02,
          "Left": 0.19,
          "Top": 0.15
        }
      },
      "Id": "word-2"
    },
    {
      "BlockType": "WORD",
      "Confidence": 99.8,
      "Text": "50100123456789",
      "TextType": "PRINTED",
      "Geometry": {
        "BoundingBox": {
          "Width": 0.15,
          "Height": 0.02,
          "Left": 0.3,
          "Top": 0.15
        }
      },
      "Id": "word-3"
    },
    {
      "BlockType": "TABLE",
      "Confidence": 97.82,
      "Geometry": {
        "BoundingBox": {
          "Width": 0.8,
          "Height": 0.5,
          "Left": 0.1,
          "Top": 0.3
        }
      },
      "Id": "table-1",
      "Relationships": [
        {
          "Type": "CHILD",
          "Ids": [
            "cell-1-1",
            "cell-1-2",
            "cell-1-3",
            "cell-2-1",
            "cell-2-2",
            "cell-2-3"
          ]
        }
      ]
    },
    {
      "BlockType": "CELL",
      "RowIndex": 1,
      "ColumnIndex": 1,
      "Confidence": 99.1,
      "Geometry": {
        "BoundingBox": {
          "Width": 0.15,
          "Height": 0.05,
          "Left": 0.1,
          "Top": 0.3
        }
      },
      "Id": "cell-1-1",
      "Relationships": [
        {
          "Type": "CHILD",
          "Ids": ["word-10"]
        }
      ]
    },
    {
      "BlockType": "WORD",
      "Confidence": 99.5,
      "Text": "Date",
      "TextType": "PRINTED",
      "Geometry": {
        "BoundingBox": {
          "Width": 0.05,
          "Height": 0.02,
          "Left": 0.12,
          "Top": 0.32
        }
      },
      "Id": "word-10"
    }
  ]
};

// ============================================
// 5. CURL COMMAND EXAMPLES
// ============================================

const curlExamples = `
# 1. Login to get JWT token
curl -X POST http://localhost:5001/api/auth/signin \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "yourpassword"
  }'

# Copy the "token" from response and use it below as JWT_TOKEN

# 2. Upload bank statement (no password)
curl -X POST http://localhost:5001/api/upload/bank-statement \\
  -H "Authorization: Bearer JWT_TOKEN" \\
  -F "pdf=@/path/to/statement.pdf" \\
  -F "async=false"

# 3. Upload password-protected bank statement
curl -X POST http://localhost:5001/api/upload/bank-statement \\
  -H "Authorization: Bearer JWT_TOKEN" \\
  -F "pdf=@/path/to/encrypted-statement.pdf" \\
  -F "password=myPDFPassword123" \\
  -F "async=false"

# 4. Upload large statement with async processing
curl -X POST http://localhost:5001/api/upload/bank-statement \\
  -H "Authorization: Bearer JWT_TOKEN" \\
  -F "pdf=@/path/to/large-statement.pdf" \\
  -F "async=true"

# 5. Check service health
curl -X GET http://localhost:5001/api/upload/health

# 6. Test Textract with existing S3 file (development only)
curl -X POST http://localhost:5001/api/upload/test-textract \\
  -H "Authorization: Bearer JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "s3Bucket": "stratschool-bank-statements",
    "s3Key": "bank-statements/test/sample.pdf"
  }'
`;

// ============================================
// 6. NODEJS TEST SCRIPT
// ============================================

const nodeJsTestScript = `
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testBankStatementUpload() {
  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/signin', {
      email: 'user@example.com',
      password: 'yourpassword'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Step 2: Upload bank statement
    console.log('\\n2. Uploading bank statement...');
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream('./sample-statement.pdf'));
    formData.append('password', 'myPDFPassword'); // Optional
    formData.append('async', 'false');
    
    const uploadResponse = await axios.post(
      'http://localhost:5001/api/upload/bank-statement',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': \`Bearer \${token}\`
        }
      }
    );
    
    console.log('✅ Upload successful');
    console.log('\\n📊 Results:');
    console.log(JSON.stringify(uploadResponse.data, null, 2));
    
    // Print summary
    const data = uploadResponse.data.data;
    console.log('\\n📈 Summary:');
    console.log(\`Account: \${data.account_number}\`);
    console.log(\`Holder: \${data.account_holder}\`);
    console.log(\`Transactions: \${data.summary.transaction_count}\`);
    console.log(\`Total Credits: ₹\${data.summary.total_credits}\`);
    console.log(\`Total Debits: ₹\${data.summary.total_debits}\`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testBankStatementUpload();
`;

module.exports = {
  uploadNonPasswordProtected,
  uploadPasswordProtected,
  uploadLargeStatement,
  successResponse,
  errorPasswordRequired,
  errorIncorrectPassword,
  errorInvalidFileType,
  errorNoFile,
  errorS3NotConfigured,
  errorTextractFailed,
  sampleTextractResponse,
  curlExamples,
  nodeJsTestScript
};
