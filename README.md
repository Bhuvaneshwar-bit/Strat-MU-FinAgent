# StratSchool FinAgent - AI-Powered Financial Analysis Platform

## 🏦 Overview
StratSchool FinAgent is an advanced AI-powered financial analysis platform that automates bank statement processing, generates P&L statements, and provides automated bookkeeping services. The platform uses cutting-edge AI technologies including Google Gemini and AWS Textract for intelligent document processing.

## 🚀 Features

### 🔐 Password-Protected PDF Processing
- Automatic detection of password-protected bank statements
- Modal-based password entry during onboarding
- Multi-tier PDF processing with fallback methods
- AWS Textract integration for OCR processing

### 🤖 AI-Powered Analysis
- **Google Gemini 2.0-flash** for intelligent financial analysis
- Automated P&L statement generation
- Real-time bookkeeping with multiple AI services
- Contextual chat assistance for financial insights

### 📊 Document Processing Pipeline
- Support for PDF, CSV, Excel, and TXT files
- Advanced document parsing with multiple fallback methods
- Secure file handling with size limits and type validation
- Automated text extraction and analysis

### 🔒 Security & Authentication
- JWT-based authentication system
- Password hashing with bcrypt
- Rate limiting and security headers
- Secure environment variable management

## 🛠️ Tech Stack

### Frontend
- **React 19.1.1** - Modern UI framework
- **Vite 7.1.2** - Fast build tool and development server
- **React Router DOM 7.9.1** - Client-side routing
- **Lucide React 0.544.0** - Icon library
- **Custom CSS Modules** - Component styling

### Backend
- **Node.js & Express 5.1.0** - Server framework
- **MongoDB Atlas & Mongoose 8.18.1** - Database
- **JWT & bcryptjs** - Authentication & security
- **Multer** - File upload handling
- **Helmet & CORS** - Security middleware

### AI & Cloud Services
- **Google Generative AI (Gemini 2.0-flash)** - Financial analysis
- **AWS Textract** - OCR and document processing
- **Multiple AI Services**: Claude, Groq, Dedicated Bookkeeping AI

### Document Processing
- **pdf-lib 1.17.1** - PDF manipulation
- **pdf-parse 1.1.1** - Text extraction
- **pdf-poppler & pdf2pic** - PDF to image conversion
- **fs-extra** - Enhanced file operations

## 📁 Project Structure

```
StratSchool/
├── stratschool-backend/          # Node.js/Express API
│   ├── src/
│   │   ├── controllers/          # Business logic
│   │   ├── models/              # Database schemas
│   │   ├── routes/              # API endpoints
│   │   ├── middleware/          # Authentication
│   │   ├── utils/               # AI services & document processing
│   │   └── config/              # Database configuration
│   ├── server.js                # Main server file
│   └── package.json
│
├── stratschool-landing/          # React/Vite Frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── styles/              # CSS stylesheets
│   │   ├── utils/               # Utility functions
│   │   └── hooks/               # Custom React hooks
│   ├── public/                  # Static assets
│   └── package.json
│
├── sample-bank-statement.csv     # Test data
├── large-bank-statement.csv      # Test data
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account
- AWS account with Textract access
- Google Cloud account with Generative AI API

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Bhuvaneshwar-bit/Strat-MU-FinAgent.git
cd Strat-MU-FinAgent
```

2. **Backend Setup**
```bash
cd stratschool-backend
npm install
```

3. **Frontend Setup**
```bash
cd ../stratschool-landing
npm install
```

4. **Environment Configuration**
Create `.env` file in `stratschool-backend/`:
```env
# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5001

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# Google AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# AI Service API Keys
GROQ_API_KEY=your_groq_api_key
CLAUDE_API_KEY=your_claude_api_key
```

### Running the Application

1. **Start Backend Server**
```bash
cd stratschool-backend
npm start
# Server runs on http://localhost:5001
```

2. **Start Frontend Development Server**
```bash
cd stratschool-landing
npm run dev
# Frontend runs on http://localhost:5173
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### P&L Statements
- `POST /api/pl-statements/analyze` - Analyze bank statements
- `GET /api/pl-statements/statements` - Get user's P&L statements
- `POST /api/pl-statements/chat` - AI chat assistance

### Password-Protected Documents
- `POST /api/password-protected/check-password` - Check if PDF is password protected
- `POST /api/password-protected/process-with-password` - Process password-protected PDFs

### Automated Bookkeeping
- `POST /api/bookkeeping/process-document` - Generate automated bookkeeping

## 🤖 AI Services Integration

### Gemini AI Analysis
The platform integrates with Google's Gemini 2.0-flash model for:
- Bank statement analysis
- P&L statement generation
- Financial insights and recommendations
- Real-time chat assistance

### AWS Textract
Used for:
- OCR processing of scanned documents
- Password-protected PDF text extraction
- Multi-format document processing

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Protection**: bcrypt hashing with salt rounds
- **Rate Limiting**: API protection against abuse
- **File Validation**: Type and size restrictions
- **Environment Variables**: Secure configuration management
- **CORS & Helmet**: Security headers and cross-origin protection

## 🧪 Testing

Test files are included for API validation:
- `test-gemini-integration.js` - AI service testing
- `test-login.js` - Authentication testing
- `simple-test.js` - Basic functionality testing

## 📈 Features in Development

- Enhanced PDF processing for complex bank statements
- Additional AI service integrations
- Advanced reporting and analytics
- Mobile application development
- Real-time collaboration features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Google Gemini AI for advanced language processing
- AWS Textract for document analysis
- MongoDB Atlas for reliable database hosting
- React and Vite communities for excellent development tools

## 📞 Support

For support and questions, please open an issue in the GitHub repository.

---

**Built with ❤️ for intelligent financial analysis**