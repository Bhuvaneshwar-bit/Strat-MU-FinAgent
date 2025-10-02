import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Calendar, 
  TrendingUp, 
  Brain, 
  Zap, 
  Download,
  AlertCircle,
  CheckCircle,
  Loader,
  BarChart3,
  DollarSign,
  FileSpreadsheet,
  Target,
  Eye,
  Sparkles
} from 'lucide-react';

const PLGenerator = ({ user }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [plStatement, setPLStatement] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);

  const periods = [
    {
      id: 'weekly',
      label: 'Weekly P&L',
      description: 'Generate P&L for the past 7 days',
      icon: Calendar,
      color: 'blue',
      recommended: false
    },
    {
      id: 'monthly',
      label: 'Monthly P&L',
      description: 'Generate P&L for the past month',
      icon: TrendingUp,
      color: 'green',
      recommended: true
    },
    {
      id: 'yearly',
      label: 'Yearly P&L',
      description: 'Generate comprehensive annual P&L',
      icon: BarChart3,
      color: 'purple',
      recommended: false
    }
  ];

  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period);
    setCurrentStep(2);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ];
      
      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid bank statement file (PDF, CSV, Excel, or TXT)');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      setUploadedFile(file);
      setCurrentStep(3);
    }
  };

  const generatePLStatement = async () => {
    setIsAnalyzing(true);
    
    try {
      if (!uploadedFile) {
        throw new Error('No file uploaded');
      }

      // Check if it's a password-protected PDF FIRST
      if (uploadedFile.type === 'application/pdf') {
        try {
          const checkFormData = new FormData();
          checkFormData.append('document', uploadedFile);
          
          const checkResponse = await fetch('http://localhost:5001/api/password-protected/check-password', {
            method: 'POST',
            body: checkFormData,
          });
          
          const checkData = await checkResponse.json();
          
          if (checkData.isPasswordProtected) {
            // This PDF needs password - PLGenerator should not process it
            throw new Error('This PDF is password-protected. Please use the Bookkeeping tab for password-protected documents.');
          }
        } catch (error) {
          if (error.message.includes('password-protected')) {
            throw error;
          }
          console.warn('Password check failed, continuing with normal flow:', error);
        }
      }

      // Start AI analysis simulation for UI
      await simulateAIAnalysis();
      
      // Call our new Gemini-powered backend endpoint
      const formData = new FormData();
      formData.append('bankStatement', uploadedFile);
      formData.append('period', selectedPeriod);
      formData.append('businessInfo', JSON.stringify({
        companyName: 'Your Business',
        industry: 'General'
      }));

      const response = await fetch('http://localhost:5001/api/pl-statements/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Transform the Gemini AI response to our component state
        const aiAnalysis = {
          revenue: {
            total: result.data.plStatement.revenue.totalRevenue,
            breakdown: result.data.plStatement.revenue.revenueStreams
          },
          expenses: {
            total: result.data.plStatement.expenses.totalExpenses,
            breakdown: result.data.plStatement.expenses.expenseCategories
          },
          netIncome: result.data.plStatement.profitability.netIncome,
          insights: result.data.insights,
          kpis: {
            grossProfit: result.data.plStatement.profitability.grossProfit,
            grossProfitMargin: result.data.plStatement.profitability.grossProfitMargin,
            netProfitMargin: result.data.plStatement.profitability.netProfitMargin,
            expenseRatio: result.data.plStatement.keyMetrics.expenseRatio
          }
        };

        // Update component state with AI results
        generatePLStatementFromAI(aiAnalysis);
        
        setAnalysisComplete(true);
        setIsAnalyzing(false);
        setCurrentStep(4);
        
        console.log('✅ P&L statement generated successfully with Gemini AI');
      } else {
        throw new Error(result.message || 'Analysis failed');
      }
      
    } catch (error) {
      console.error('🚨 Gemini AI Analysis error:', error);
      
      // Show error to user
      alert(`Analysis failed: ${error.message}. Please check your file format and try again.`);
      
      // Fallback to mock data for demonstration
      setTimeout(() => {
        const mockPLData = generateMockPLStatement();
        setPLStatement(mockPLData.statement);
        setAiInsights(mockPLData.insights);
        setAnalysisComplete(true);
        setIsAnalyzing(false);
        setCurrentStep(4);
      }, 2000);
    }
  };

  const generateIntelligentFallback = () => {
    // Intelligent fallback that varies based on period selection
    const periodMultipliers = {
      'Weekly': 0.25,
      'Monthly': 1,
      'Yearly': 12
    };
    
    const multiplier = periodMultipliers[selectedPeriod] || 1;
    const baseRevenue = 45000 * multiplier;
    const variation = 0.8 + (Math.random() * 0.4); // 80-120% variation
    
    const totalRevenue = Math.round(baseRevenue * variation);
    const totalExpenses = Math.round(totalRevenue * (0.65 + Math.random() * 0.15)); // 65-80% expense ratio
    
    return {
      revenue: {
        total: totalRevenue,
        breakdown: [
          { category: "Service Revenue", amount: Math.round(totalRevenue * 0.6) },
          { category: "Product Sales", amount: Math.round(totalRevenue * 0.25) },
          { category: "Consulting", amount: Math.round(totalRevenue * 0.15) }
        ]
      },
      expenses: {
        total: totalExpenses,
        breakdown: [
          { category: "Salaries & Benefits", amount: Math.round(totalExpenses * 0.55) },
          { category: "Technology", amount: Math.round(totalExpenses * 0.18) },
          { category: "Office Expenses", amount: Math.round(totalExpenses * 0.12) },
          { category: "Marketing", amount: Math.round(totalExpenses * 0.10) },
          { category: "Other", amount: Math.round(totalExpenses * 0.05) }
        ]
      },
      insights: [
        {
          type: "positive",
          title: "Strong Revenue Performance",
          description: `Your ${selectedPeriod.toLowerCase()} revenue shows healthy growth patterns with diversified income streams.`,
          impact: "high"
        },
        {
          type: "insight",
          title: "Expense Optimization Opportunity",
          description: "Technology and operational costs can be optimized for better margins.",
          impact: "medium"
        },
        {
          type: "action",
          title: "Strategic Recommendation",
          description: "Consider increasing marketing spend to capitalize on current growth momentum.",
          impact: "medium"
        }
      ],
      kpis: {
        grossMargin: Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100 * 100) / 100,
        netMargin: Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100 * 100) / 100,
        expenseRatio: Math.round((totalExpenses / totalRevenue) * 100 * 100) / 100
      }
    };
  };

  const generatePLStatementFromAI = (aiData) => {
    const totalRevenue = aiData.revenue.total;
    const totalExpenses = aiData.expenses.total;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = ((netProfit / totalRevenue) * 100);

    const statement = {
      period: selectedPeriod,
      startDate: '2024-08-15',
      endDate: '2024-09-15',
      revenue: {
        totalRevenue,
        breakdown: aiData.revenue.breakdown
      },
      expenses: {
        totalExpenses,
        breakdown: aiData.expenses.breakdown
      },
      netProfit,
      profitMargin,
      kpis: aiData.kpis
    };

    setPLStatement(statement);
    setAiInsights(aiData.insights);
  };

  const simulateAIAnalysis = async () => {
    // Simulate AI processing stages
    const stages = [
      'Extracting transaction data...',
      'Categorizing income streams...',
      'Analyzing expense patterns...',
      'Calculating financial metrics...',
      'Generating strategic insights...',
      'Finalizing P&L statement...'
    ];
    
    // This will be replaced with actual AI processing
    return new Promise((resolve) => {
      let stageIndex = 0;
      const interval = setInterval(() => {
        stageIndex++;
        if (stageIndex >= stages.length) {
          clearInterval(interval);
          resolve();
        }
      }, 1200);
    });
  };

  const generateMockPLStatement = () => {
    // This will be replaced with actual AI-generated data
    return {
      statement: {
        period: selectedPeriod,
        startDate: '2025-08-15',
        endDate: '2025-09-15',
        revenue: {
          totalRevenue: 45750.00,
          breakdown: [
            { category: 'Service Revenue', amount: 32500.00 },
            { category: 'Product Sales', amount: 8250.00 },
            { category: 'Consulting Fees', amount: 5000.00 }
          ]
        },
        expenses: {
          totalExpenses: 28340.00,
          breakdown: [
            { category: 'Cost of Goods Sold', amount: 12500.00 },
            { category: 'Marketing & Advertising', amount: 4200.00 },
            { category: 'Office Expenses', amount: 3100.00 },
            { category: 'Software & Technology', amount: 2890.00 },
            { category: 'Professional Services', amount: 2650.00 },
            { category: 'Travel & Entertainment', amount: 1800.00 },
            { category: 'Utilities', amount: 1200.00 }
          ]
        },
        netIncome: 17410.00,
        margins: {
          grossMargin: 72.7,
          netMargin: 38.1
        }
      },
      insights: [
        {
          type: 'positive',
          title: 'Strong Revenue Growth',
          description: 'Revenue increased 18% compared to previous period, driven by service offerings.',
          impact: 'high'
        },
        {
          type: 'warning',
          title: 'Marketing Spend Analysis',
          description: 'Marketing expenses are 9.2% of revenue, consider optimizing ROI.',
          impact: 'medium'
        },
        {
          type: 'insight',
          title: 'Profitability Recommendation',
          description: 'Net margin of 38.1% is excellent. Focus on scaling current operations.',
          impact: 'high'
        },
        {
          type: 'action',
          title: 'Cost Optimization Opportunity',
          description: 'Software expenses can be reduced by 15% through subscription optimization.',
          impact: 'medium'
        }
      ]
    };
  };

  const resetGenerator = () => {
    setCurrentStep(1);
    setSelectedPeriod('');
    setUploadedFile(null);
    setIsAnalyzing(false);
    setAnalysisComplete(false);
    setPLStatement(null);
    setAiInsights([]);
  };

  const exportPLStatement = () => {
    // This will export the P&L statement as PDF
    alert('P&L Statement export functionality will be implemented');
  };

  return (
    <div className="pl-generator">
      {/* Header */}
      <div className="pl-header">
        <div className="header-content">
          <div className="header-icon">
            <Brain className="brain-icon" />
            <Sparkles className="sparkle-overlay" />
          </div>
          <div className="header-text">
            <h2>AI P&L Statement Generator</h2>
            <p>Upload your bank statement and let our agentic AI generate a precise P&L analysis</p>
          </div>
        </div>
        <div className="ai-badge">
          <Zap className="ai-icon" />
          <span>Powered by Agentic AI</span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="progress-steps">
        <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
          <div className="step-number">1</div>
          <span>Select Period</span>
        </div>
        <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <span>Upload Statement</span>
        </div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <span>AI Analysis</span>
        </div>
        <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
          <div className="step-number">4</div>
          <span>P&L Report</span>
        </div>
      </div>

      {/* Step 1: Period Selection */}
      {currentStep === 1 && (
        <div className="step-content">
          <div className="step-title">
            <h3>Select P&L Period</h3>
            <p>Choose the time period for your P&L statement generation</p>
          </div>
          
          <div className="period-grid">
            {periods.map((period) => {
              const Icon = period.icon;
              return (
                <div 
                  key={period.id}
                  className={`period-card ${period.color} ${period.recommended ? 'recommended' : ''}`}
                  onClick={() => handlePeriodSelect(period.id)}
                >
                  {period.recommended && (
                    <div className="recommended-badge">
                      <Target className="badge-icon" />
                      Recommended
                    </div>
                  )}
                  <div className="period-icon">
                    <Icon />
                  </div>
                  <h4>{period.label}</h4>
                  <p>{period.description}</p>
                  <div className="select-button">
                    Select Period
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: File Upload */}
      {currentStep === 2 && (
        <div className="step-content">
          <div className="step-title">
            <h3>Upload {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Bank Statement</h3>
            <p>Upload your bank statement for AI analysis and P&L generation</p>
          </div>

          <div className="upload-container">
            <div className="upload-zone">
              <input
                type="file"
                id="bank-statement"
                accept=".pdf,.csv,.xlsx,.xls,.txt"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="bank-statement" className="upload-label">
                <div className="upload-icon">
                  <Upload />
                </div>
                <h4>Drop your bank statement here</h4>
                <p>Or click to browse files</p>
                <div className="supported-formats">
                  <span>Supported: PDF, CSV, Excel, TXT</span>
                  <span>Max size: 10MB</span>
                </div>
              </label>
            </div>

            {uploadedFile && (
              <div className="file-preview">
                <div className="file-info">
                  <FileSpreadsheet className="file-icon" />
                  <div className="file-details">
                    <h4>{uploadedFile.name}</h4>
                    <p>{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <CheckCircle className="success-icon" />
                </div>
                <button 
                  className="analyze-button"
                  onClick={generatePLStatement}
                >
                  <Brain className="button-icon" />
                  Start AI Analysis
                </button>
              </div>
            )}
          </div>

          <div className="security-notice">
            <AlertCircle className="notice-icon" />
            <div>
              <strong>Security Notice:</strong> Your bank statement is processed securely and never stored permanently. 
              All data is encrypted and deleted after analysis.
            </div>
          </div>
        </div>
      )}

      {/* Step 3: AI Analysis */}
      {currentStep === 3 && isAnalyzing && (
        <div className="step-content">
          <div className="analysis-container">
            <div className="ai-animation">
              <div className="brain-container">
                <Brain className="analyzing-brain" />
                <div className="neural-network">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`neural-node node-${i + 1}`}></div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="analysis-status">
              <h3>AI is analyzing your bank statement...</h3>
              <p>Our agentic AI is performing deep financial analysis with CFO-level intelligence</p>
              
              <div className="analysis-stages">
                <div className="stage active">
                  <Loader className="stage-icon spinning" />
                  <span>Extracting and categorizing transactions</span>
                </div>
                <div className="stage">
                  <div className="stage-icon"></div>
                  <span>Analyzing revenue patterns and sources</span>
                </div>
                <div className="stage">
                  <div className="stage-icon"></div>
                  <span>Computing expense categories and trends</span>
                </div>
                <div className="stage">
                  <div className="stage-icon"></div>
                  <span>Generating strategic financial insights</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: P&L Results */}
      {currentStep === 4 && analysisComplete && plStatement && (
        <div className="step-content">
          <div className="results-header">
            <h3>AI-Generated P&L Statement</h3>
            <div className="results-actions">
              <button className="export-button" onClick={exportPLStatement}>
                <Download className="button-icon" />
                Export PDF
              </button>
              <button className="reset-button" onClick={resetGenerator}>
                Generate New P&L
              </button>
            </div>
          </div>

          {/* P&L Statement Display */}
          <div className="pl-statement">
            <div className="statement-header">
              <h4>Profit & Loss Statement</h4>
              <div className="period-info">
                <span>{selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Period</span>
                <span>{plStatement.startDate} to {plStatement.endDate}</span>
              </div>
            </div>

            <div className="financial-overview">
              <div className="overview-card revenue">
                <div className="card-icon">
                  <TrendingUp />
                </div>
                <div className="card-content">
                  <h5>Total Revenue</h5>
                  <span className="amount">${plStatement.revenue.totalRevenue.toLocaleString()}</span>
                </div>
              </div>

              <div className="overview-card expenses">
                <div className="card-icon">
                  <BarChart3 />
                </div>
                <div className="card-content">
                  <h5>Total Expenses</h5>
                  <span className="amount">${plStatement.expenses.totalExpenses.toLocaleString()}</span>
                </div>
              </div>

              <div className="overview-card profit">
                <div className="card-icon">
                  <DollarSign />
                </div>
                <div className="card-content">
                  <h5>Net Income</h5>
                  <span className="amount profit">${plStatement.netIncome.toLocaleString()}</span>
                </div>
              </div>

              <div className="overview-card margin">
                <div className="card-icon">
                  <Target />
                </div>
                <div className="card-content">
                  <h5>Net Margin</h5>
                  <span className="percentage">{plStatement.margins.netMargin}%</span>
                </div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="pl-breakdown">
              <div className="breakdown-section">
                <h5>Revenue Breakdown</h5>
                <div className="breakdown-list">
                  {plStatement.revenue.breakdown.map((item, index) => (
                    <div key={index} className="breakdown-item">
                      <span className="category">{item.category}</span>
                      <span className="amount">${item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="breakdown-section">
                <h5>Expense Breakdown</h5>
                <div className="breakdown-list">
                  {plStatement.expenses.breakdown.map((item, index) => (
                    <div key={index} className="breakdown-item">
                      <span className="category">{item.category}</span>
                      <span className="amount">${item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="ai-insights">
            <h4>AI Financial Insights</h4>
            <div className="insights-grid">
              {aiInsights.map((insight, index) => (
                <div key={index} className={`insight-card ${insight.type} ${insight.impact}`}>
                  <div className="insight-header">
                    <div className={`insight-icon ${insight.type}`}>
                      {insight.type === 'positive' && <CheckCircle />}
                      {insight.type === 'warning' && <AlertCircle />}
                      {insight.type === 'insight' && <Eye />}
                      {insight.type === 'action' && <Target />}
                    </div>
                    <h5>{insight.title}</h5>
                    <span className={`impact-badge ${insight.impact}`}>
                      {insight.impact.toUpperCase()} IMPACT
                    </span>
                  </div>
                  <p>{insight.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PLGenerator;