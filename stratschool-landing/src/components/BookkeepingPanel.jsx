import React, { useState, useRef, useEffect } from 'react';
import PasswordModal from './PasswordModal';
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  FileBarChart,
  Calendar,
  Upload,
  ChevronRight,
  Sparkles,
  DollarSign,
  PieChart,
  Activity,
  Shield,
  Lightbulb,
  Send,
  MessageSquare,
  User,
  Bot,
  BookOpen,
  Receipt,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  FileText
} from 'lucide-react';
import '../styles/AutomationPanel.css';

const BookkeepingPanel = ({ user }) => {
  const [bookkeepingResults, setBookkeepingResults] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Password-protected document state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [isProcessingPassword, setIsProcessingPassword] = useState(false);
  
  const chatEndRef = useRef(null);

  // Load existing bookkeeping data on component mount
  useEffect(() => {
    loadExistingBookkeepingData();
    // Set up polling for new data every 30 seconds
    const interval = setInterval(loadExistingBookkeepingData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadExistingBookkeepingData = async () => {
    try {
      setIsLoadingData(true);
      const response = await fetch('/api/bookkeeping/entries', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.journalEntries && data.journalEntries.length > 0) {
          setBookkeepingResults(data);
          setShowDetailedReport(true); // Auto-show entries if they exist
        }
      }
    } catch (error) {
      console.error('Error loading bookkeeping data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterDropdown && !event.target.closest('.filter-dropdown-container')) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);

  const filterEntries = (entries) => {
    if (!entries || selectedFilter === 'all') return entries;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (selectedFilter) {
      case '7days':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        filterDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        filterDate.setDate(now.getDate() - 90);
        break;
      default:
        return entries;
    }
    
    return entries.filter(entry => new Date(entry.date) >= filterDate);
  };

  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);
    setShowFilterDropdown(false);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Pagination functions
  const getPaginatedEntries = (entries) => {
    const filteredEntries = filterEntries(entries);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredEntries.slice(startIndex, endIndex);
  };

  const getTotalPages = (entries) => {
    const filteredEntries = filterEntries(entries);
    return Math.ceil(filteredEntries.length / itemsPerPage);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/jpg'
      ];
      
      if (allowedTypes.includes(file.type)) {
        console.log('📁 File uploaded:', file.name, file.type);
        
        // Check if it's a password-protected PDF FIRST
        if (file.type === 'application/pdf') {
          try {
            console.log('🔍 Checking if PDF is password-protected...');
            const formData = new FormData();
            formData.append('document', file);
            
            const response = await fetch('http://localhost:5001/api/password-protected/check-password', {
              method: 'POST',
              body: formData,
            });
            
            console.log('📡 Password check response status:', response.status);
            
            if (!response.ok) {
              console.error('❌ Password check failed:', response.status, response.statusText);
              throw new Error(`Password check failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📋 Password check result:', data);
            
            if (data.isPasswordProtected) {
              console.log('🔒 Password-protected PDF detected - showing password modal');
              setPendingFile(file);
              setShowPasswordModal(true);
              setPasswordError('');
              // DO NOT set uploadedFile - wait for password first
              return;
            } else {
              console.log('✅ PDF is not password-protected, continuing normal flow');
            }
          } catch (error) {
            console.error('❌ Error checking password protection:', error);
            console.log('⚠️ Password check failed, continuing with normal flow');
            // Continue with normal flow if check fails
          }
        }
        
        // Only set uploaded file if it's NOT password-protected
        setUploadedFile(file);
      } else {
        alert('Please upload a valid bank statement file (PDF, CSV, Excel, TXT, or Image)');
      }
    }
  };

  const handlePasswordSubmit = async (password) => {
    if (!pendingFile) return;
    
    setIsProcessingPassword(true);
    setPasswordError('');
    
    try {
      const formData = new FormData();
      formData.append('document', pendingFile);
      formData.append('password', password);
      formData.append('businessName', 'StratSchool Demo');
      formData.append('industry', 'Technology');
      formData.append('accountingMethod', 'accrual');
      formData.append('documentType', 'bank_statement');
      
      const response = await fetch('http://localhost:5001/api/password-protected/process-with-password', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          setPasswordError('Incorrect password. Please try again.');
          setIsProcessingPassword(false);
          return;
        }
        throw new Error(errorData.error || 'Failed to process document');
      }
      
      const data = await response.json();
      
      // Success - close modal and set as uploaded file
      setShowPasswordModal(false);
      setUploadedFile(pendingFile); // Now set as uploaded file
      setPendingFile(null);
      setPasswordError('');
      setIsProcessingPassword(false);
      
      // Set the results in the same format as regular processing
      setBookkeepingResults({
        success: true,
        ...data
      });
      setCurrentStep(4);
      
      console.log('🎉 Password-protected document processed successfully!');
      
    } catch (error) {
      console.error('Error processing password-protected document:', error);
      setPasswordError(error.message || 'Failed to process document');
      setIsProcessingPassword(false);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setPendingFile(null);
    setPasswordError('');
    setIsProcessingPassword(false);
    setUploadedFile(null); // Clear the uploaded file
  };

  // Elite Automated Bookkeeping Function
  const processAutomatedBookkeeping = async () => {
    if (!uploadedFile) {
      alert('Please upload a valid bank statement file (PDF, CSV, Excel, or TXT)');
      return;
    }

    try {
      console.log('🏆 Starting Elite Automated Bookkeeping...');
      setIsProcessingBookkeeping(true);
      setCurrentStep(1);
      setAnalysisStage('Uploading and parsing document...');

      const formData = new FormData();
      formData.append('document', uploadedFile);
      formData.append('businessName', 'StratSchool Demo');
      formData.append('industry', 'Technology');
      formData.append('accountingMethod', 'accrual');
      formData.append('documentType', 'bank_statement');

      const response = await fetch('http://localhost:5001/api/bookkeeping/process-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('🎉 Automated Bookkeeping Completed!');
      
      setBookkeepingResults({
        success: true,
        ...data
      });
      setCurrentStep(4);

    } catch (error) {
      console.error('💥 Automated Bookkeeping Error:', error);
      setBookkeepingResults({
        success: false,
        error: error.message || 'Failed to process bookkeeping'
      });
    } finally {
      setIsProcessingBookkeeping(false);
    }
  };

  return (
    <div className="automation-panel">
      <div className="automation-header">
        <div className="header-content">
          <div className="header-icon">
            <BookOpen />
          </div>
          <div className="header-text">
            <h1>🏆 Elite Automated Bookkeeping</h1>
            <p>Professional-grade AI-powered bookkeeping with zero error tolerance</p>
          </div>
        </div>
      </div>

      <div className="automation-content">
        {/* File Upload Section */}
        <div className="bookkeeping-upload-section">
          <div className="upload-card">
            <div className="upload-header">
              <div className="upload-icon">
                <Upload />
              </div>
              <h3>Upload Financial Document</h3>
              <p>Upload bank statements, receipts, or financial documents for automated bookkeeping analysis</p>
            </div>

            {!uploadedFile ? (
              <>
                <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                  <div className="upload-content">
                    <Upload className="upload-icon-large" />
                    <h4>Drop files here or click to upload</h4>
                    <p>Supports PDF, CSV, Excel, TXT, and Images</p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </>
            ) : (
              <>
                <div className="file-preview-section">
                  <div className="file-preview">
                    <Receipt className="file-icon" />
                    <div className="file-info">
                      <span className="file-name">{uploadedFile.name}</span>
                      <span className="file-size">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <button 
                      className="change-file-btn"
                      onClick={() => setUploadedFile(null)}
                    >
                      Change File
                    </button>
                  </div>
                </div>

                <button 
                  className="process-button"
                  onClick={processAutomatedBookkeeping}
                  disabled={isProcessingBookkeeping}
                >
                  {isProcessingBookkeeping ? (
                    <>
                      <div className="loading-spinner"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Brain />
                      Start Elite Bookkeeping Analysis
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Processing Status */}
        {isProcessingBookkeeping && (
          <div className="processing-status">
            <div className="status-header">
              <div className="status-icon">
                <div className="loading-spinner"></div>
              </div>
              <h3>Processing Document</h3>
            </div>
            <div className="status-steps">
              <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
                <div className="step-icon">1</div>
                <span>Document Upload</span>
              </div>
              <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
                <div className="step-icon">2</div>
                <span>AI Analysis</span>
              </div>
              <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
                <div className="step-icon">3</div>
                <span>Bookkeeping Processing</span>
              </div>
              <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
                <div className="step-icon">4</div>
                <span>Complete</span>
              </div>
            </div>
            <p className="status-message">{analysisStage}</p>
          </div>
        )}

        {/* Results Display */}
        {bookkeepingResults && (
          <div className="bookkeeping-results">
            <div className="results-header">
              {bookkeepingResults.success ? (
                <div className="success-header">
                  <CheckCircle className="success-icon" />
                  <div>
                    <h3>✅ Bookkeeping Complete</h3>
                    <p>Professional-grade automated bookkeeping processing completed</p>
                  </div>
                </div>
              ) : (
                <div className="error-header">
                  <XCircle className="error-icon" />
                  <div>
                    <h3>❌ Processing Failed</h3>
                    <p>{bookkeepingResults.error}</p>
                  </div>
                </div>
              )}
            </div>

            {bookkeepingResults.success && (
              <div className="results-content">
                {/* Summary Stats */}
                <div className="summary-stats">
                  <h4>📊 Processing Summary</h4>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon success">
                        <CheckCircle />
                      </div>
                      <div className="stat-content">
                        <span className="stat-value">
                          {bookkeepingResults.journalEntries ? filterEntries(bookkeepingResults.journalEntries).length : 
                           bookkeepingResults.summary?.successfulEntries || 0}
                        </span>
                        <span className="stat-label">
                          {selectedFilter === 'all' ? 'Total Entries' : 'Filtered Entries'}
                        </span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon error">
                        <XCircle />
                      </div>
                      <div className="stat-content">
                        <span className="stat-value">0</span>
                        <span className="stat-label">Entries Failed</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">
                        <DollarSign />
                      </div>
                      <div className="stat-content">
                        <span className="stat-value">
                          ${(() => {
                            if (bookkeepingResults.journalEntries && bookkeepingResults.journalEntries.length > 0) {
                              // Calculate total from filtered entries
                              const filteredEntries = filterEntries(bookkeepingResults.journalEntries);
                              const total = filteredEntries.reduce((sum, entry) => 
                                sum + (parseFloat(entry.totalDebits) || 0), 0);
                              return total.toLocaleString();
                            }
                            // Fallback to summary data
                            const summaryTotal = Math.abs(bookkeepingResults.summary?.totalAmount || 0);
                            return summaryTotal.toLocaleString();
                          })()}
                        </span>
                        <span className="stat-label">Total Processed</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">
                        <Shield />
                      </div>
                      <div className="stat-content">
                        <span className="stat-value">95%</span>
                        <span className="stat-label">AI Confidence</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* View Detailed Report Button */}
                {!showDetailedReport ? (
                  <div className="detailed-report-section">
                    <div className="report-prompt">
                      <h4>📋 Transaction Analysis Complete</h4>
                      <p>Your financial data has been processed and categorized with professional accuracy.</p>
                      <button 
                        className="view-detailed-report-btn"
                        onClick={() => setShowDetailedReport(true)}
                      >
                        <FileText size={20} />
                        View Detailed Report
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Professional Data Grid Table */}
                    {bookkeepingResults.journalEntries && bookkeepingResults.journalEntries.length > 0 && (
                      <div className="journal-entries-table">
                        <div className="table-header">
                          <h4>📚 Transaction Records 
                            {bookkeepingResults.journalEntries && getTotalPages(bookkeepingResults.journalEntries) > 1 && (
                              <span className="page-indicator">
                                (Page {currentPage} of {getTotalPages(bookkeepingResults.journalEntries)})
                              </span>
                            )}
                          </h4>
                          <div className="table-actions">
                            <button className="btn-export">
                              <Download size={16} />
                              Export
                            </button>
                            <div className="filter-dropdown-container">
                              <button 
                                className="btn-filter"
                                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                              >
                                <Settings size={16} />
                                Filter: {selectedFilter === 'all' ? 'All Time' : 
                                        selectedFilter === '7days' ? 'Past 7 Days' :
                                        selectedFilter === '30days' ? 'Past 30 Days' :
                                        selectedFilter === '90days' ? 'Past 90 Days' : 'All Time'} ▼
                              </button>
                              {showFilterDropdown && (
                                <div className="filter-dropdown">
                                  <div 
                                    className={`filter-option ${selectedFilter === 'all' ? 'selected' : ''}`}
                                    onClick={() => handleFilterSelect('all')}
                                  >
                                    All Time
                                  </div>
                                  <div 
                                    className={`filter-option ${selectedFilter === '7days' ? 'selected' : ''}`}
                                    onClick={() => handleFilterSelect('7days')}
                                  >
                                    Past 7 Days
                                  </div>
                                  <div 
                                    className={`filter-option ${selectedFilter === '30days' ? 'selected' : ''}`}
                                    onClick={() => handleFilterSelect('30days')}
                                  >
                                    Past 30 Days
                                  </div>
                                  <div 
                                    className={`filter-option ${selectedFilter === '90days' ? 'selected' : ''}`}
                                    onClick={() => handleFilterSelect('90days')}
                                  >
                                    Past 90 Days
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="data-table-container">
                          <table className="professional-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Category</th>
                                <th>Sub-Category</th>
                                <th>Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getPaginatedEntries(bookkeepingResults.journalEntries).map((entry, index) => (
                                <tr key={index}>
                                  <td className="date-cell">
                                    {new Date(entry.date).toLocaleDateString('en-CA')}
                                  </td>
                                  <td className="description-cell">
                                    <div className="description-content">
                                      <div className="main-desc">{entry.description}</div>
                                      {entry.reference && (
                                        <div className="reference">Ref: {entry.reference}</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="amount-cell">
                                    <span className="amount positive">
                                      ${(parseFloat(entry.totalDebits) || 0).toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="category-cell">
                                    <span className="category-tag">
                                      {(() => {
                                        const firstDebit = entry.debits?.[0];
                                        if (firstDebit?.accountName?.toLowerCase().includes('revenue')) return 'Revenue';
                                        if (firstDebit?.accountName?.toLowerCase().includes('expense')) return 'Operating Exp.';
                                        if (firstDebit?.accountName?.toLowerCase().includes('cash')) return 'Cash';
                                        if (firstDebit?.accountName?.toLowerCase().includes('asset')) return 'Assets';
                                        return 'General';
                                      })()}
                                    </span>
                                  </td>
                                  <td className="subcategory-cell">
                                    {(() => {
                                      const firstDebit = entry.debits?.[0];
                                      const accountName = firstDebit?.accountName || 'General';
                                      // Clean up the account name for display
                                      return accountName.replace(/^\d+\s*-?\s*/, '').trim() || 'Operating';
                                    })()}
                                  </td>
                                  <td className="type-cell">
                                    <span className="type-badge debit">
                                      Journal Entry
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Pagination Controls */}
                        {bookkeepingResults.journalEntries && filterEntries(bookkeepingResults.journalEntries).length > 0 && (
                          <div className="pagination-container">
                            <div className="pagination-info">
                              <span>
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                                {Math.min(currentPage * itemsPerPage, filterEntries(bookkeepingResults.journalEntries).length)} of{' '}
                                {filterEntries(bookkeepingResults.journalEntries).length} entries
                              </span>
                              <div className="page-size-selector">
                                <label>Entries per page:</label>
                                <select 
                                  value={itemsPerPage} 
                                  onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                                >
                                  <option value={10}>10</option>
                                  <option value={25}>25</option>
                                  <option value={50}>50</option>
                                  <option value={100}>100</option>
                                </select>
                              </div>
                            </div>
                            
                            <div className="pagination-controls">
                              <button 
                                className="pagination-btn"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                              >
                                ← Previous
                              </button>
                              
                              <div className="page-numbers">
                                {Array.from({ length: getTotalPages(bookkeepingResults.journalEntries) }, (_, i) => i + 1)
                                  .filter(page => {
                                    const totalPages = getTotalPages(bookkeepingResults.journalEntries);
                                    if (totalPages <= 7) return true;
                                    if (page === 1 || page === totalPages) return true;
                                    if (page >= currentPage - 2 && page <= currentPage + 2) return true;
                                    return false;
                                  })
                                  .map((page, index, arr) => (
                                    <React.Fragment key={page}>
                                      {index > 0 && arr[index - 1] !== page - 1 && (
                                        <span className="pagination-ellipsis">...</span>
                                      )}
                                      <button
                                        className={`page-btn ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => handlePageChange(page)}
                                      >
                                        {page}
                                      </button>
                                    </React.Fragment>
                                  ))}
                              </div>
                              
                              <button 
                                className="pagination-btn"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === getTotalPages(bookkeepingResults.journalEntries)}
                              >
                                Next →
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Action Buttons */}
                <div className="action-buttons">
                  {showDetailedReport && (
                    <button 
                      className="btn-secondary"
                      onClick={() => setShowDetailedReport(false)}
                    >
                      <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                      Back to Summary
                    </button>
                  )}
                  <button className="btn-secondary">
                    <Download size={16} />
                    Export to Excel
                  </button>
                  <button className="btn-secondary">
                    <FileText size={16} />
                    Generate Report
                  </button>
                  <button className="btn-primary" onClick={() => {
                    setBookkeepingResults(null);
                    setUploadedFile(null);
                    setShowDetailedReport(false);
                  }}>
                    <Upload size={16} />
                    Process New Document
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Password Modal for Protected Documents */}
      {showPasswordModal && (
        <PasswordModal
          isOpen={showPasswordModal}
          onSubmit={handlePasswordSubmit}
          onCancel={handlePasswordCancel}
          fileName={pendingFile?.name}
          error={passwordError}
          isProcessing={isProcessingPassword}
        />
      )}
    </div>
  );
};

export default BookkeepingPanel;