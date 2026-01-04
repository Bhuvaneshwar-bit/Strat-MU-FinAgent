import React, { useState, useEffect } from 'react';
import {
  Calculator,
  FileText,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Info,
  IndianRupee,
  Calendar,
  FileSpreadsheet,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { buildApiUrl } from '../config/api';

const GSTDashboard = ({ darkMode, plData, user }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [gstData, setGstData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showTooltip, setShowTooltip] = useState(null);

  // Fetch GST calculation when expanded
  useEffect(() => {
    if (isExpanded && !gstData && !loading) {
      fetchGSTData();
    }
  }, [isExpanded]);

  const fetchGSTData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/api/gst/calculate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          useAiCategorization: true,
          defaultGstRate: 18
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setGstData(data);
      } else {
        setError(data.message || 'Failed to calculate GST');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('GST fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDueDateStatus = (dueDateStr) => {
    const today = new Date();
    const dueDate = new Date(dueDateStr);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'overdue', label: 'Overdue', color: '#ef4444' };
    if (diffDays <= 5) return { status: 'urgent', label: `${diffDays} days left`, color: '#f59e0b' };
    return { status: 'ok', label: formatDate(dueDateStr), color: '#22c55e' };
  };

  // Quick summary card (collapsed view)
  const QuickSummaryCard = () => {
    const hasData = plData && (plData.analysisMetrics?.totalRevenue > 0 || plData.plStatement?.revenue?.total > 0);
    
    return (
      <div 
        className={`gst-quick-card ${darkMode ? 'dark' : 'light'}`}
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: darkMode 
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' 
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: darkMode ? '1px solid #2d2d3d' : '1px solid #e2e8f0',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          marginTop: '24px',
          boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 15px rgba(0,0,0,0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #D4AF37 0%, #B8972F 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calculator size={24} color="#000" />
            </div>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.1rem', 
                fontWeight: 600, 
                color: darkMode ? '#e2e8f0' : '#1e293b' 
              }}>
                GST Dashboard
              </h3>
              <p style={{ 
                margin: '4px 0 0', 
                fontSize: '0.85rem', 
                color: darkMode ? '#94a3b8' : '#64748b' 
              }}>
                {hasData 
                  ? 'Calculate GST liability & prepare GSTR returns'
                  : 'Upload bank statement to calculate GST'}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {gstData && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: darkMode ? '#94a3b8' : '#64748b',
                  display: 'block'
                }}>
                  Net GST Payable
                </span>
                <span style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 700, 
                  color: gstData.summary.netGSTPayable >= 0 ? '#ef4444' : '#22c55e'
                }}>
                  {formatCurrency(Math.abs(gstData.summary.netGSTPayable))}
                  {gstData.summary.netGSTPayable < 0 && ' (Credit)'}
                </span>
              </div>
            )}
            
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.3s ease',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              <ChevronDown size={18} color={darkMode ? '#94a3b8' : '#64748b'} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Expanded GST dashboard
  const ExpandedDashboard = () => {
    if (loading) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          gap: '16px'
        }}>
          <RefreshCw 
            size={32} 
            color="#D4AF37" 
            style={{ animation: 'spin 1s linear infinite' }} 
          />
          <p style={{ color: darkMode ? '#94a3b8' : '#64748b', margin: 0 }}>
            Analyzing transactions for GST...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          gap: '16px'
        }}>
          <AlertTriangle size={32} color="#ef4444" />
          <p style={{ color: '#ef4444', margin: 0 }}>{error}</p>
          <button 
            onClick={fetchGSTData}
            style={{
              padding: '10px 20px',
              background: '#D4AF37',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    if (!gstData) return null;

    return (
      <div style={{ 
        marginTop: '20px',
        animation: 'fadeIn 0.3s ease'
      }}>
        {/* Disclaimer Banner */}
        <div style={{
          background: darkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <AlertTriangle size={18} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <p style={{ 
              margin: 0, 
              fontSize: '0.85rem', 
              color: darkMode ? '#fbbf24' : '#b45309',
              fontWeight: 500 
            }}>
              This is an <strong>ESTIMATE</strong> based on bank statement analysis
            </p>
            <p style={{ 
              margin: '4px 0 0', 
              fontSize: '0.8rem', 
              color: darkMode ? '#94a3b8' : '#64748b' 
            }}>
              For accurate GST filing, verify with your CA and actual invoices. Inter-state GST (IGST) is not differentiated.
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Output GST */}
          <div style={{
            background: darkMode ? '#0d1117' : '#fff',
            borderRadius: '12px',
            padding: '20px',
            border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <TrendingUp size={18} color="#22c55e" />
              <span style={{ fontSize: '0.8rem', color: darkMode ? '#94a3b8' : '#64748b' }}>
                GST Collected (Sales)
              </span>
            </div>
            <p style={{ 
              margin: 0, 
              fontSize: '1.5rem', 
              fontWeight: 700, 
              color: '#22c55e' 
            }}>
              {formatCurrency(gstData.summary.totalOutputGST)}
            </p>
            <p style={{ 
              margin: '4px 0 0', 
              fontSize: '0.75rem', 
              color: darkMode ? '#64748b' : '#94a3b8' 
            }}>
              On sales of {formatCurrency(gstData.summary.totalSales)}
            </p>
          </div>

          {/* Input GST (ITC) */}
          <div style={{
            background: darkMode ? '#0d1117' : '#fff',
            borderRadius: '12px',
            padding: '20px',
            border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <TrendingDown size={18} color="#3b82f6" />
              <span style={{ fontSize: '0.8rem', color: darkMode ? '#94a3b8' : '#64748b' }}>
                Input Tax Credit (ITC)
              </span>
            </div>
            <p style={{ 
              margin: 0, 
              fontSize: '1.5rem', 
              fontWeight: 700, 
              color: '#3b82f6' 
            }}>
              {formatCurrency(gstData.summary.totalInputGST)}
            </p>
            <p style={{ 
              margin: '4px 0 0', 
              fontSize: '0.75rem', 
              color: darkMode ? '#64748b' : '#94a3b8' 
            }}>
              On purchases of {formatCurrency(gstData.summary.totalPurchases)}
            </p>
          </div>

          {/* Net Payable */}
          <div style={{
            background: gstData.summary.netGSTPayable >= 0 
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
            borderRadius: '12px',
            padding: '20px',
            border: gstData.summary.netGSTPayable >= 0 
              ? '1px solid rgba(239, 68, 68, 0.3)'
              : '1px solid rgba(34, 197, 94, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <IndianRupee size={18} color={gstData.summary.netGSTPayable >= 0 ? '#ef4444' : '#22c55e'} />
              <span style={{ fontSize: '0.8rem', color: darkMode ? '#94a3b8' : '#64748b' }}>
                {gstData.summary.netGSTPayable >= 0 ? 'Net GST Payable' : 'ITC Credit Available'}
              </span>
            </div>
            <p style={{ 
              margin: 0, 
              fontSize: '1.75rem', 
              fontWeight: 700, 
              color: gstData.summary.netGSTPayable >= 0 ? '#ef4444' : '#22c55e'
            }}>
              {formatCurrency(Math.abs(gstData.summary.netGSTPayable))}
            </p>
            <p style={{ 
              margin: '4px 0 0', 
              fontSize: '0.75rem', 
              color: darkMode ? '#64748b' : '#94a3b8' 
            }}>
              {gstData.summary.gstTransactionCount} taxable transactions
            </p>
          </div>

          {/* Exempt */}
          <div style={{
            background: darkMode ? '#0d1117' : '#fff',
            borderRadius: '12px',
            padding: '20px',
            border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <CheckCircle size={18} color="#94a3b8" />
              <span style={{ fontSize: '0.8rem', color: darkMode ? '#94a3b8' : '#64748b' }}>
                Exempt / Non-Business
              </span>
            </div>
            <p style={{ 
              margin: 0, 
              fontSize: '1.5rem', 
              fontWeight: 700, 
              color: darkMode ? '#94a3b8' : '#64748b'
            }}>
              {formatCurrency(gstData.summary.totalExempt + gstData.summary.totalNonBusiness)}
            </p>
            <p style={{ 
              margin: '4px 0 0', 
              fontSize: '0.75rem', 
              color: darkMode ? '#64748b' : '#94a3b8' 
            }}>
              No GST applicable
            </p>
          </div>
        </div>

        {/* Monthly Breakdown */}
        {gstData.monthlyBreakdown && gstData.monthlyBreakdown.length > 0 && (
          <div style={{
            background: darkMode ? '#0d1117' : '#fff',
            borderRadius: '16px',
            border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            <div style={{
              padding: '18px 20px',
              borderBottom: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={18} color="#D4AF37" />
                <h4 style={{ margin: 0, color: darkMode ? '#e2e8f0' : '#1e293b', fontSize: '1rem' }}>
                  Monthly GST Breakdown
                </h4>
              </div>
              <span style={{ fontSize: '0.8rem', color: darkMode ? '#64748b' : '#94a3b8' }}>
                {gstData.metadata.financialYear}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ 
                    background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderBottom: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0'
                  }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem', color: darkMode ? '#94a3b8' : '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Month</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.75rem', color: darkMode ? '#94a3b8' : '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Sales</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.75rem', color: darkMode ? '#94a3b8' : '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>GST Collected</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.75rem', color: darkMode ? '#94a3b8' : '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Purchases</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.75rem', color: darkMode ? '#94a3b8' : '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>ITC</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.75rem', color: darkMode ? '#94a3b8' : '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Net Payable</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '0.75rem', color: darkMode ? '#94a3b8' : '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>GSTR-3B Due</th>
                  </tr>
                </thead>
                <tbody>
                  {gstData.monthlyBreakdown.map((month, idx) => {
                    const dueStatus = getDueDateStatus(month.gstr3bDueDate);
                    return (
                      <tr 
                        key={month.month}
                        style={{ 
                          borderBottom: darkMode ? '1px solid #21262d' : '1px solid #f1f5f9',
                          background: idx % 2 === 0 
                            ? 'transparent' 
                            : (darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)')
                        }}
                      >
                        <td style={{ padding: '14px 16px', color: darkMode ? '#e2e8f0' : '#1e293b', fontWeight: 500 }}>
                          {month.monthName}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: darkMode ? '#94a3b8' : '#64748b' }}>
                          {formatCurrency(month.sales.total)}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#22c55e', fontWeight: 500 }}>
                          {formatCurrency(month.sales.gstCollected)}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: darkMode ? '#94a3b8' : '#64748b' }}>
                          {formatCurrency(month.purchases.total)}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#3b82f6', fontWeight: 500 }}>
                          {formatCurrency(month.purchases.gstPaid)}
                        </td>
                        <td style={{ 
                          padding: '14px 16px', 
                          textAlign: 'right', 
                          color: month.netGSTPayable >= 0 ? '#ef4444' : '#22c55e',
                          fontWeight: 600
                        }}>
                          {formatCurrency(Math.abs(month.netGSTPayable))}
                          {month.netGSTPayable < 0 && ' (Cr)'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            background: dueStatus.status === 'overdue' 
                              ? 'rgba(239, 68, 68, 0.1)'
                              : dueStatus.status === 'urgent'
                              ? 'rgba(245, 158, 11, 0.1)'
                              : 'rgba(34, 197, 94, 0.1)',
                            color: dueStatus.color
                          }}>
                            {dueStatus.status === 'overdue' && <AlertTriangle size={12} />}
                            {dueStatus.status === 'urgent' && <Clock size={12} />}
                            {dueStatus.status === 'ok' && <CheckCircle size={12} />}
                            {dueStatus.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GST Rate Distribution */}
        {gstData.rateDistribution && gstData.rateDistribution.length > 0 && (
          <div style={{
            background: darkMode ? '#0d1117' : '#fff',
            borderRadius: '16px',
            border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h4 style={{ 
              margin: '0 0 16px', 
              color: darkMode ? '#e2e8f0' : '#1e293b', 
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <FileSpreadsheet size={18} color="#D4AF37" />
              GST Rate Distribution
            </h4>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {gstData.rateDistribution
                .sort((a, b) => b.rate - a.rate)
                .map(item => (
                <div 
                  key={item.rate}
                  style={{
                    flex: '1 1 120px',
                    padding: '14px',
                    background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: item.rate === 0 ? 'rgba(148, 163, 184, 0.2)' :
                               item.rate === 5 ? 'rgba(34, 197, 94, 0.2)' :
                               item.rate === 12 ? 'rgba(59, 130, 246, 0.2)' :
                               item.rate === 18 ? 'rgba(212, 175, 55, 0.2)' :
                               'rgba(239, 68, 68, 0.2)',
                    color: item.rate === 0 ? '#94a3b8' :
                           item.rate === 5 ? '#22c55e' :
                           item.rate === 12 ? '#3b82f6' :
                           item.rate === 18 ? '#D4AF37' :
                           '#ef4444'
                  }}>
                    {item.rate}% GST
                  </span>
                  <p style={{ 
                    margin: '10px 0 2px', 
                    fontSize: '1.1rem', 
                    fontWeight: 600,
                    color: darkMode ? '#e2e8f0' : '#1e293b'
                  }}>
                    {formatCurrency(item.totalAmount)}
                  </p>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '0.75rem', 
                    color: darkMode ? '#64748b' : '#94a3b8' 
                  }}>
                    {item.transactionCount} transactions
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={fetchGSTData}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                background: 'transparent',
                border: darkMode ? '1px solid #2d2d3d' : '1px solid #e2e8f0',
                borderRadius: '10px',
                color: darkMode ? '#e2e8f0' : '#1e293b',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500
              }}
            >
              <RefreshCw size={16} />
              Recalculate
            </button>
          </div>
          
          <a 
            href="https://services.gst.gov.in/" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: 'transparent',
              border: darkMode ? '1px solid #2d2d3d' : '1px solid #e2e8f0',
              borderRadius: '10px',
              color: darkMode ? '#94a3b8' : '#64748b',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 500
            }}
          >
            <ExternalLink size={16} />
            Open GST Portal
          </a>
        </div>

        {/* Info Footer */}
        <div style={{
          marginTop: '20px',
          padding: '14px 18px',
          background: darkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <Info size={18} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: darkMode ? '#93c5fd' : '#1d4ed8', fontWeight: 500 }}>
                How GST Calculation Works
              </p>
              <ul style={{ 
                margin: '8px 0 0', 
                paddingLeft: '18px', 
                fontSize: '0.8rem', 
                color: darkMode ? '#94a3b8' : '#64748b',
                lineHeight: 1.6
              }}>
                <li>AI analyzes each transaction description to determine GST category</li>
                <li>GST is extracted from inclusive amounts (Amount ÷ 1.18 for 18% GST)</li>
                <li>Output GST (collected) - Input GST (paid) = Net Payable</li>
                <li>GSTR-1 due: 11th of next month | GSTR-3B due: 20th of next month</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="gst-dashboard-container">
      <QuickSummaryCard />
      {isExpanded && (
        <div style={{
          background: darkMode 
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' 
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '0 0 16px 16px',
          padding: '0 24px 24px',
          marginTop: '-12px',
          border: darkMode ? '1px solid #2d2d3d' : '1px solid #e2e8f0',
          borderTop: 'none'
        }}>
          <ExpandedDashboard />
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .gst-quick-card:hover {
          transform: translateY(-2px);
          box-shadow: ${darkMode 
            ? '0 8px 30px rgba(0,0,0,0.4)' 
            : '0 8px 25px rgba(0,0,0,0.12)'} !important;
        }
      `}</style>
    </div>
  );
};

export default GSTDashboard;
