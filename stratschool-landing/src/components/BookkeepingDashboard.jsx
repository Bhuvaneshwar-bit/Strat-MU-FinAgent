import React, { useState, useRef, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  FileBarChart,
  Calendar,
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
  FileText,
  Eye,
  RefreshCw
} from 'lucide-react';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import '../styles/AutomationPanel.css';

const BookkeepingDashboard = ({ user }) => {
  const [bookkeepingResults, setBookkeepingResults] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
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
      const apiUrl = buildApiUrl(API_ENDPOINTS.BOOKKEEPING_ENTRIES);
      console.log('🔍 Fetching bookkeeping data from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('📊 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Data received:', data);
        console.log('📋 Journal entries count:', data.journalEntries?.length || 0);
        
        if (data.journalEntries && data.journalEntries.length > 0) {
          setBookkeepingResults(data);
          setShowDetailedReport(true); // Auto-show entries if they exist
          console.log('🎯 Bookkeeping results set successfully!');
        } else {
          console.log('📝 No journal entries found in response');
        }
      } else {
        console.error('❌ Failed to fetch bookkeeping data:', response.status);
        const errorText = await response.text();
        console.error('Error details:', errorText);
      }
    } catch (error) {
      console.error('🚨 Error loading bookkeeping data:', error);
    } finally {
      setIsLoadingData(false);
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
    
    return entries.filter(entry => {
      const entryDate = new Date(entry.entryDate || entry.date);
      return entryDate >= filterDate;
    });
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

  // Excel Export Function
  const exportToExcel = () => {
    if (!bookkeepingResults?.journalEntries || bookkeepingResults.journalEntries.length === 0) {
      alert('No data to export');
      return;
    }

    // Prepare data for Excel
    const excelData = bookkeepingResults.journalEntries.map((entry, index) => {
      const entryDate = new Date(entry.entryDate || entry.date);
      const isValidDate = !isNaN(entryDate.getTime());
      
      return {
        'Entry ID': entry.entryId || `JE${index + 1}`,
        'Date': isValidDate ? entryDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : 'Invalid Date',
        'Description': entry.description || 'No description',
        'Reference': entry.reference || '',
        'Amount (USD)': parseFloat(entry.totalDebits) || 0,
        'Category': 'General',
        'Type': 'JOURNAL ENTRY',
        'Business ID': entry.businessId || '',
        'Created': new Date().toLocaleDateString('en-US')
      };
    });

    // Convert to CSV format (Excel will open CSV files)
    const headers = Object.keys(excelData[0]);
    const csvContent = [
      headers.join(','),
      ...excelData.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values that might contain commas
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `Bookkeeping_Entries_${currentDate}.csv`;
    
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message
    alert(`✅ Successfully exported ${excelData.length} journal entries to ${filename}`);
  };

  return (
    <div className="automation-panel">
      <div className="professional-bookkeeping-header">
        <div className="professional-header-content">
          <div className="professional-header-left">
            <div className="professional-icon-wrapper">
              <BookOpen className="professional-panel-icon" />
            </div>
            <div className="professional-header-text">
              <h2>Automated Bookkeeping Dashboard</h2>
              <p>AI-powered journal entries automatically generated from P&L uploads</p>
            </div>
          </div>
          <div className="header-right">
            <button 
              className="professional-refresh-btn"
              onClick={loadExistingBookkeepingData}
              disabled={isLoadingData}
            >
              <RefreshCw size={18} className={isLoadingData ? 'spinning' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="panel-content">
        {/* Dashboard Status */}
        {isLoadingData ? (
          <div className="processing-container">
            <div className="processing-content">
              <div className="processing-spinner">
                <Brain className="spinning-icon" size={48} />
              </div>
              <h3>🔄 Loading Bookkeeping Data...</h3>
              <p>Fetching the latest automated journal entries</p>
            </div>
          </div>
        ) : !bookkeepingResults ? (
          <div className="empty-state">
            <div className="empty-content">
              <div className="empty-icon">
                <FileBarChart size={64} />
              </div>
              <h3>🎯 Ready for Automated Bookkeeping</h3>
              <p>Upload a bank statement in the <strong>P&L Generator</strong> to automatically populate journal entries here</p>
              <div className="agentic-flow">
                <div className="flow-step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Upload Bank Statement</h4>
                    <p>Go to P&L Generator and upload your bank statement</p>
                  </div>
                </div>
                <ChevronRight size={20} className="flow-arrow" />
                <div className="flow-step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>Automatic Processing</h4>
                    <p>AI generates both P&L and journal entries</p>
                  </div>
                </div>
                <ChevronRight size={20} className="flow-arrow" />
                <div className="flow-step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>View Results</h4>
                    <p>Both dashboards update automatically</p>
                  </div>
                </div>
              </div>
              <div className="empty-actions">
                <button className="refresh-btn" onClick={loadExistingBookkeepingData}>
                  <Activity size={16} />
                  Check for New Data
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="results-section">
            {/* Professional Summary Stats */}
            <div className="professional-stats-section">
              <div className="professional-stats-grid">
                <div className="professional-stat-card success">
                  <div className="professional-stat-content">
                    <div className="professional-stat-icon success">
                      <CheckCircle />
                    </div>
                    <div className="professional-stat-details">
                      <div className="professional-stat-value success">
                        {bookkeepingResults.journalEntries ? bookkeepingResults.journalEntries.length : 0}
                      </div>
                      <div className="professional-stat-label">
                        Total Entries
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="professional-stat-card error">
                  <div className="professional-stat-content">
                    <div className="professional-stat-icon error">
                      <XCircle />
                    </div>
                    <div className="professional-stat-details">
                      <div className="professional-stat-value error">0</div>
                      <div className="professional-stat-label">Failed Entries</div>
                    </div>
                  </div>
                </div>
                
                <div className="professional-stat-card primary">
                  <div className="professional-stat-content">
                    <div className="professional-stat-icon primary">
                      <DollarSign />
                    </div>
                    <div className="professional-stat-details">
                      <div className="professional-stat-value primary">
                        ${(() => {
                          if (bookkeepingResults.journalEntries && bookkeepingResults.journalEntries.length > 0) {
                            const total = bookkeepingResults.journalEntries.reduce((sum, entry) => 
                              sum + (parseFloat(entry.totalDebits) || 0), 0);
                            return total.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            });
                          }
                          return '0.00';
                        })()}
                      </div>
                      <div className="professional-stat-label">Total Processed</div>
                    </div>
                  </div>
                </div>
                
                <div className="professional-stat-card warning">
                  <div className="professional-stat-content">
                    <div className="professional-stat-icon warning">
                      <AlertCircle />
                    </div>
                    <div className="professional-stat-details">
                      <div className="professional-stat-value warning">0</div>
                      <div className="professional-stat-label">Needs Review</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                    <button 
                      className="btn-export"
                      onClick={exportToExcel}
                      title="Export journal entries to Excel/CSV file"
                    >
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
                  <table className="data-grid">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Category</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedEntries(bookkeepingResults.journalEntries).map((entry, index) => {
                        const entryDate = new Date(entry.entryDate || entry.date);
                        const isValidDate = !isNaN(entryDate.getTime());
                        
                        return (
                          <tr key={entry.entryId || index}>
                            <td className="date-cell">
                              {isValidDate ? entryDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : 'Invalid Date'}
                            </td>
                            <td className="description-cell">
                              <div className="description-content">
                                <div className="main-desc">{entry.description || 'No description'}</div>
                                {entry.reference && (
                                  <div className="reference">Ref: {entry.reference}</div>
                                )}
                              </div>
                            </td>
                            <td className="amount-cell">
                              <span className="amount positive">
                                ${(parseFloat(entry.totalDebits) || 0).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </span>
                            </td>
                            <td className="category-cell">
                              <span className="category-badge">
                                General
                              </span>
                            </td>
                            <td className="type-cell">
                              <span className="type-badge journal-entry">
                                JOURNAL ENTRY
                              </span>
                            </td>
                          </tr>
                        );
                      })}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default BookkeepingDashboard;