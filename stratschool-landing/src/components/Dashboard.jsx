import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  DollarSign, 
  Calculator, 
  Settings,
  Bell,
  User,
  LogOut,
  Brain,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  ChevronRight,
  Receipt,
  BookOpen,
  PieChart as PieChartIcon,
  Upload,
  AlertCircle,
  TrendingUp,
  Zap,
  Info,
  X
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts';
import '../styles/ProfessionalDashboard.css';
import InvoiceGeneration from './InvoiceGeneration';
import BookkeepingDashboard from './BookkeepingDashboard';
import AIChatbot from './AIChatbot';

// Default categories for revenue and expenses
const DEFAULT_REVENUE_CATEGORIES = [
  'Sales Revenue',
  'Service Income',
  'Interest Income',
  'Rental Income',
  'Commission Income',
  'Investment Returns',
  'Refunds Received',
  'Other Income'
];

const DEFAULT_EXPENSE_CATEGORIES = [
  'Salaries & Wages',
  'Rent & Utilities',
  'Office Supplies',
  'Marketing & Advertising',
  'Travel & Transportation',
  'Food & Entertainment',
  'Professional Services',
  'Insurance',
  'Taxes & Licenses',
  'Bank Charges',
  'Equipment & Maintenance',
  'Inventory/Stock Purchase',
  'General Expenses'
];

const Dashboard = ({ user: propUser, onLogout, onboardingData }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [plData, setPlData] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null); // {index, type: 'credit'|'debit'}
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCategories, setCustomCategories] = useState({ revenue: [], expenses: [] });

  // Get user from multiple sources: onboardingData.user, prop, or localStorage
  const getUser = () => {
    // First check onboardingData.user (passed from questionnaire during signup)
    if (onboardingData?.user?.firstName && onboardingData.user.firstName !== 'User') {
      // Save to localStorage for future use
      localStorage.setItem('user', JSON.stringify(onboardingData.user));
      return onboardingData.user;
    }
    // If prop user has a real name (not fallback), use it
    if (propUser?.firstName && propUser.firstName !== 'User') {
      return propUser;
    }
    // Otherwise try localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return propUser;
      }
    }
    return propUser;
  };
  
  const user = getUser();

  // Helper function to get user-specific localStorage key
  const getUserPlDataKey = () => {
    const userId = user?._id || user?.id || user?.email || 'default_user';
    return `plData_${userId}`;
  };

  // Load P&L data from onboarding or localStorage
  useEffect(() => {
    if (onboardingData?.plData) {
      console.log('📊 Loading P&L data from onboarding:', onboardingData.plData);
      setPlData(onboardingData.plData);
      setIsAnimating(true);
    } else {
      // Try to load data from localStorage with fallbacks
      const userPlDataKey = getUserPlDataKey();
      let savedPlData = localStorage.getItem(userPlDataKey);
      
      // Fallback to temp key
      if (!savedPlData) {
        savedPlData = localStorage.getItem('plData_temp');
        if (savedPlData) {
          console.log('📦 Dashboard: Found temp plData, migrating to user key');
          localStorage.setItem(userPlDataKey, savedPlData);
        }
      }
      
      if (savedPlData) {
        try {
          console.log('📊 Loading P&L data from localStorage');
          setPlData(JSON.parse(savedPlData));
          setIsAnimating(true);
        } catch (e) {
          console.error('Failed to parse saved P&L data');
        }
      }
    }
  }, [onboardingData, user]);

  // Save P&L data to user-specific localStorage key when it changes
  useEffect(() => {
    if (plData && user) {
      const userPlDataKey = getUserPlDataKey();
      localStorage.setItem(userPlDataKey, JSON.stringify(plData));
    }
  }, [plData, user]);

  // Get formatted P&L metrics
  const getPlMetrics = () => {
    if (!plData) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
        revenueBreakdown: [],
        expenseBreakdown: [],
        insights: [],
        transactions: []
      };
    }

    // Get all transactions and filter by type
    const allTransactions = plData.transactions || [];
    const creditTransactions = allTransactions.filter(t => t.amount > 0 || t.category?.type === 'revenue');
    const debitTransactions = allTransactions.filter(t => t.amount < 0 || t.category?.type === 'expenses');

    return {
      totalRevenue: plData.analysisMetrics?.totalRevenue || plData.plStatement?.revenue?.totalRevenue || 0,
      totalExpenses: plData.analysisMetrics?.totalExpenses || plData.plStatement?.expenses?.totalExpenses || 0,
      netProfit: plData.analysisMetrics?.netIncome || plData.plStatement?.profitability?.netIncome || 0,
      profitMargin: plData.plStatement?.profitability?.netProfitMargin || 0,
      revenueBreakdown: plData.plStatement?.revenue?.revenueStreams || [],
      expenseBreakdown: plData.plStatement?.expenses?.expenseCategories || [],
      insights: plData.insights || [],
      transactions: allTransactions,
      creditTransactions,
      debitTransactions
    };
  };

  const metrics = getPlMetrics();

  // Professional color palettes for pie charts
  const REVENUE_COLORS = [
    '#10B981', '#34D399', '#6EE7B7', '#A7F3D0',
    '#059669', '#047857', '#065F46', '#064E3B',
    '#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0'
  ];
  
  const EXPENSE_COLORS = [
    '#EF4444', '#F87171', '#FCA5A5', '#FECACA',
    '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D',
    '#F97316', '#FB923C', '#FDBA74', '#FED7AA'
  ];

  // State for active pie chart segment (for animation)
  const [activeRevenueIndex, setActiveRevenueIndex] = useState(null);
  const [activeExpenseIndex, setActiveExpenseIndex] = useState(null);

  // Dynamic pie chart data computed from transactions - updates when categories change
  const revenuePieData = useMemo(() => {
    if (!metrics.creditTransactions || metrics.creditTransactions.length === 0) return [];
    
    const categoryMap = new Map();
    
    metrics.creditTransactions.forEach(txn => {
      const category = txn.category?.category || 'Other Income';
      const amount = Math.abs(txn.amount || 0);
      
      if (categoryMap.has(category)) {
        categoryMap.set(category, categoryMap.get(category) + amount);
      } else {
        categoryMap.set(category, amount);
      }
    });
    
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [metrics.creditTransactions]);

  const expensePieData = useMemo(() => {
    if (!metrics.debitTransactions || metrics.debitTransactions.length === 0) return [];
    
    const categoryMap = new Map();
    
    metrics.debitTransactions.forEach(txn => {
      const category = txn.category?.category || 'General Expenses';
      const amount = Math.abs(txn.amount || 0);
      
      if (categoryMap.has(category)) {
        categoryMap.set(category, categoryMap.get(category) + amount);
      } else {
        categoryMap.set(category, amount);
      }
    });
    
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [metrics.debitTransactions]);

  // Custom active shape for pie chart (professional hover effect)
  const renderActiveShape = (props, colors) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#333" className="pie-center-text">
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.2))' }}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 8}
          outerRadius={outerRadius + 12}
          fill={fill}
        />
      </g>
    );
  };

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload, totalAmount }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalAmount) * 100).toFixed(1);
      return (
        <div className="pie-tooltip">
          <div className="pie-tooltip-header">
            <span className="pie-tooltip-color" style={{ backgroundColor: data.payload.fill }}></span>
            <span className="pie-tooltip-name">{data.name}</span>
          </div>
          <div className="pie-tooltip-value">{formatCurrency(data.value)}</div>
          <div className="pie-tooltip-percent">{percentage}% of total</div>
        </div>
      );
    }
    return null;
  };

  // Custom legend renderer
  const renderCustomLegend = (props, colors, totalAmount) => {
    const { payload } = props;
    return (
      <div className="pie-legend">
        {payload.map((entry, index) => {
          const percentage = ((entry.payload.value / totalAmount) * 100).toFixed(1);
          return (
            <div key={`legend-${index}`} className="pie-legend-item">
              <span className="pie-legend-color" style={{ backgroundColor: colors[index % colors.length] }}></span>
              <span className="pie-legend-label">{entry.value}</span>
              <span className="pie-legend-value">{percentage}%</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get available categories based on type
  const getAvailableCategories = (type) => {
    if (type === 'credit') {
      return [...DEFAULT_REVENUE_CATEGORIES, ...customCategories.revenue];
    } else {
      return [...DEFAULT_EXPENSE_CATEGORIES, ...customCategories.expenses];
    }
  };

  // Handle category click to open dropdown
  const handleCategoryClick = (index, type, currentCategory) => {
    setEditingCategory({ index, type });
    setSelectedCategory(currentCategory);
    setCustomCategory('');
    setShowCustomInput(false);
  };

  // Handle category change
  const handleCategoryChange = (value) => {
    if (value === '__add_custom__') {
      setShowCustomInput(true);
      setSelectedCategory('');
    } else {
      setSelectedCategory(value);
      setShowCustomInput(false);
    }
  };

  // Save the updated category
  const saveCategory = () => {
    if (!editingCategory) return;
    
    const newCategory = showCustomInput ? customCategory.trim() : selectedCategory;
    if (!newCategory) return;

    const { index, type } = editingCategory;
    
    // Add custom category to the list if it's new
    if (showCustomInput && customCategory.trim()) {
      const categoryType = type === 'credit' ? 'revenue' : 'expenses';
      const existingCategories = type === 'credit' 
        ? [...DEFAULT_REVENUE_CATEGORIES, ...customCategories.revenue]
        : [...DEFAULT_EXPENSE_CATEGORIES, ...customCategories.expenses];
      
      if (!existingCategories.includes(customCategory.trim())) {
        setCustomCategories(prev => ({
          ...prev,
          [categoryType]: [...prev[categoryType], customCategory.trim()]
        }));
      }
    }

    // Update the transaction in plData
    const updatedPlData = { ...plData };
    const transactions = [...(updatedPlData.transactions || [])];
    
    // Find the transaction to update
    const filteredTransactions = type === 'credit'
      ? transactions.filter(t => t.amount > 0 || t.category?.type === 'revenue')
      : transactions.filter(t => t.amount < 0 || t.category?.type === 'expenses');
    
    if (filteredTransactions[index]) {
      const txnToUpdate = filteredTransactions[index];
      const originalIndex = transactions.findIndex(t => t === txnToUpdate);
      
      if (originalIndex !== -1) {
        transactions[originalIndex] = {
          ...transactions[originalIndex],
          category: {
            type: type === 'credit' ? 'revenue' : 'expenses',
            category: newCategory
          }
        };
        updatedPlData.transactions = transactions;
        setPlData(updatedPlData);
      }
    }

    // Close the editor
    setEditingCategory(null);
    setSelectedCategory('');
    setCustomCategory('');
    setShowCustomInput(false);
  };

  // Cancel editing
  const cancelCategoryEdit = () => {
    setEditingCategory(null);
    setSelectedCategory('');
    setCustomCategory('');
    setShowCustomInput(false);
  };

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'revenue', label: 'Revenue', icon: TrendingUp },
    { id: 'expense', label: 'Expense', icon: ArrowDownRight },
    { id: 'bookkeeping', label: 'Automated Bookkeeping', icon: BookOpen },
    { id: 'invoice', label: 'Invoice Generation', icon: Receipt },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="professional-dashboard">
      {/* Professional Header */}
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="brand-logo">
            <Brain className="brand-icon" />
            <div className="brand-text">
              <h1>StratSchool</h1>
              <span>AI CFO Platform</span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button className="action-button">
            <Bell className="action-icon" />
            <span className="notification-badge">3</span>
          </button>
          
          <div className="user-profile">
            <div className="user-avatar">
              <User className="avatar-icon" />
            </div>
            <div className="user-info">
              <span className="user-name">{user?.firstName} {user?.lastName}</span>
              <span className="user-role">Entrepreneur</span>
            </div>
            <button className="logout-button" onClick={onLogout}>
              <LogOut className="logout-icon" />
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-layout">
        {/* Professional Sidebar */}
        <aside className="dashboard-sidebar">
          <nav className="sidebar-navigation">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-button ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                  {activeTab === item.id && <div className="active-indicator" />}
                </button>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <div className="upgrade-prompt">
              <div className="upgrade-icon">
                <Zap />
              </div>
              <h4>AI Premium</h4>
              <p>Unlock advanced forecasting & automation</p>
              <button className="upgrade-button">
                Upgrade Now
                <ChevronRight className="upgrade-arrow" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-content">
          {activeTab === 'overview' && (
            <>
              {/* P&L Status Banner */}
              {!plData ? (
                <section className="no-data-section">
                  <div className="no-data-card">
                    <div className="no-data-icon">
                      <AlertCircle />
                    </div>
                    <h3>No Financial Data Available</h3>
                    <p>Upload a bank statement to see your P&L analysis and financial insights.</p>
                    <button 
                      className="primary-button"
                      onClick={() => setActiveTab('bookkeeping')}
                    >
                      <Upload className="button-icon" />
                      Upload Bank Statement
                    </button>
                  </div>
                </section>
              ) : (
                <>
                  {/* Financial Overview Cards */}
                  <section className="metrics-section">
                    <div className="section-header">
                      <h3>Financial Overview</h3>
                      <div className="header-actions">
                        <button 
                          className="secondary-button"
                          onClick={() => setActiveTab('bookkeeping')}
                        >
                          <RefreshCw className="button-icon" />
                          Re-upload Statement
                        </button>
                        <button className="primary-button">
                          <Download className="button-icon" />
                          Export Report
                        </button>
                      </div>
                    </div>

                    <div className="metrics-grid">
                      {/* Total Revenue Card */}
                      <div 
                        className={`metric-card revenue ${isAnimating ? 'slide-up' : ''}`}
                        style={{
                          animationDelay: '0ms',
                          opacity: isAnimating ? 1 : 0,
                          transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="metric-header">
                          <div className="metric-icon revenue-icon">
                            <TrendingUp />
                          </div>
                          <div className="metric-trend">
                            <span className="trend-indicator positive">
                              <ArrowUpRight className="trend-arrow" />
                              Credits
                            </span>
                          </div>
                        </div>
                        <div className="metric-content">
                          <h4 className="metric-title">
                            Total Revenue
                            <button 
                              className="info-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(activeTooltip === 'revenue' ? null : 'revenue');
                              }}
                            >
                              <Info size={14} />
                            </button>
                            {activeTooltip === 'revenue' && (
                              <div className="info-tooltip">
                                <button className="tooltip-close" onClick={() => setActiveTooltip(null)}>
                                  <X size={12} />
                                </button>
                                Total credits from all sources
                              </div>
                            )}
                          </h4>
                          <div 
                            className="metric-value revenue-value clickable-metric" 
                            onClick={() => setActiveTab('revenue')}
                            title="Click to view revenue details"
                          >
                            {formatCurrency(metrics.totalRevenue)}
                          </div>
                        </div>
                      </div>

                      {/* Total Expenses Card */}
                      <div 
                        className={`metric-card expense ${isAnimating ? 'slide-up' : ''}`}
                        style={{
                          animationDelay: '150ms',
                          opacity: isAnimating ? 1 : 0,
                          transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="metric-header">
                          <div className="metric-icon expense-icon">
                            <ArrowDownRight />
                          </div>
                          <div className="metric-trend">
                            <span className="trend-indicator negative">
                              <ArrowDownRight className="trend-arrow" />
                              Debits
                            </span>
                          </div>
                        </div>
                        <div className="metric-content">
                          <h4 className="metric-title">
                            Total Expenses
                            <button 
                              className="info-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(activeTooltip === 'expenses' ? null : 'expenses');
                              }}
                            >
                              <Info size={14} />
                            </button>
                            {activeTooltip === 'expenses' && (
                              <div className="info-tooltip">
                                <button className="tooltip-close" onClick={() => setActiveTooltip(null)}>
                                  <X size={12} />
                                </button>
                                Total debits from all categories
                              </div>
                            )}
                          </h4>
                          <div 
                            className="metric-value expense-value clickable-metric" 
                            onClick={() => setActiveTab('expense')}
                            title="Click to view expense details"
                          >
                            {formatCurrency(metrics.totalExpenses)}
                          </div>
                        </div>
                      </div>

                      {/* Net Profit Card */}
                      <div 
                        className={`metric-card ${metrics.netProfit >= 0 ? 'profit' : 'loss'} ${isAnimating ? 'slide-up' : ''}`}
                        style={{
                          animationDelay: '300ms',
                          opacity: isAnimating ? 1 : 0,
                          transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="metric-header">
                          <div className={`metric-icon ${metrics.netProfit >= 0 ? 'profit-icon' : 'loss-icon'}`}>
                            <DollarSign />
                          </div>
                          <div className="metric-trend">
                            <span className={`trend-indicator ${metrics.netProfit >= 0 ? 'positive' : 'negative'}`}>
                              {metrics.netProfit >= 0 ? <ArrowUpRight className="trend-arrow" /> : <ArrowDownRight className="trend-arrow" />}
                              {metrics.netProfit >= 0 ? 'Profit' : 'Loss'}
                            </span>
                          </div>
                        </div>
                        <div className="metric-content">
                          <h4 className="metric-title">
                            Net {metrics.netProfit >= 0 ? 'Profit' : 'Loss'}
                            <button 
                              className="info-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(activeTooltip === 'netprofit' ? null : 'netprofit');
                              }}
                            >
                              <Info size={14} />
                            </button>
                            {activeTooltip === 'netprofit' && (
                              <div className="info-tooltip">
                                <button className="tooltip-close" onClick={() => setActiveTooltip(null)}>
                                  <X size={12} />
                                </button>
                                Revenue minus expenses
                              </div>
                            )}
                          </h4>
                          <div className={`metric-value ${metrics.netProfit >= 0 ? 'profit-value' : 'loss-value'}`}>
                            {formatCurrency(Math.abs(metrics.netProfit))}
                          </div>
                        </div>
                      </div>

                      {/* Profit Margin Card */}
                      <div 
                        className={`metric-card margin ${isAnimating ? 'slide-up' : ''}`}
                        style={{
                          animationDelay: '450ms',
                          opacity: isAnimating ? 1 : 0,
                          transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="metric-header">
                          <div className="metric-icon margin-icon">
                            <PieChart />
                          </div>
                          <div className="metric-trend">
                            <span className={`trend-indicator ${metrics.profitMargin >= 0 ? 'positive' : 'negative'}`}>
                              <Calculator className="trend-arrow" />
                              Margin
                            </span>
                          </div>
                        </div>
                        <div className="metric-content">
                          <h4 className="metric-title">
                            Profit Margin
                            <button 
                              className="info-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(activeTooltip === 'margin' ? null : 'margin');
                              }}
                            >
                              <Info size={14} />
                            </button>
                            {activeTooltip === 'margin' && (
                              <div className="info-tooltip">
                                <button className="tooltip-close" onClick={() => setActiveTooltip(null)}>
                                  <X size={12} />
                                </button>
                                Net profit as % of revenue
                              </div>
                            )}
                          </h4>
                          <div className={`metric-value ${metrics.profitMargin >= 0 ? 'profit-value' : 'loss-value'}`}>
                            {metrics.profitMargin.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Revenue & Expense Breakdown Section */}
                  <section className="breakdown-section">
                    <div className="breakdown-grid">
                      {/* Revenue Breakdown */}
                      <div className={`breakdown-card revenue ${isAnimating ? 'slide-up' : ''}`}
                        style={{
                          animationDelay: '600ms',
                          opacity: isAnimating ? 1 : 0,
                          transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="breakdown-header">
                          <div className="breakdown-icon revenue-bg">
                            <TrendingUp />
                          </div>
                          <h4>Revenue Breakdown</h4>
                        </div>
                        <div className="breakdown-content">
                          {metrics.revenueBreakdown.length > 0 ? (
                            <ul className="breakdown-list">
                              {metrics.revenueBreakdown.map((item, index) => (
                                <li key={index} className="breakdown-item">
                                  <div className="item-info">
                                    <span className="item-category">{item.category}</span>
                                    <span className="item-count">{item.transactionCount} transactions</span>
                                  </div>
                                  <span className="item-amount revenue-amount">{formatCurrency(item.amount)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="no-breakdown">No revenue breakdown available</p>
                          )}
                        </div>
                      </div>

                      {/* Expense Breakdown */}
                      <div className={`breakdown-card expense ${isAnimating ? 'slide-up' : ''}`}
                        style={{
                          animationDelay: '750ms',
                          opacity: isAnimating ? 1 : 0,
                          transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="breakdown-header">
                          <div className="breakdown-icon expense-bg">
                            <ArrowDownRight />
                          </div>
                          <h4>Expense Breakdown</h4>
                        </div>
                        <div className="breakdown-content">
                          {metrics.expenseBreakdown.length > 0 ? (
                            <ul className="breakdown-list">
                              {metrics.expenseBreakdown.map((item, index) => (
                                <li key={index} className="breakdown-item">
                                  <div className="item-info">
                                    <span className="item-category">{item.category}</span>
                                    <span className="item-count">{item.transactionCount} transactions</span>
                                  </div>
                                  <span className="item-amount expense-amount">{formatCurrency(item.amount)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="no-breakdown">No expense breakdown available</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* AI Insights Section */}
                  {metrics.insights && metrics.insights.length > 0 && (
                    <section className="insights-section">
                      <div className="section-header">
                        <h3>
                          <Brain className="section-icon" />
                          AI-Powered Insights
                        </h3>
                      </div>
                      <div className={`insights-grid ${isAnimating ? 'slide-up' : ''}`}
                        style={{
                          animationDelay: '900ms',
                          opacity: isAnimating ? 1 : 0,
                          transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        {metrics.insights.map((insight, index) => (
                          <div key={index} className={`insight-card ${insight.type || 'info'}`}>
                            <div className="insight-icon">
                              <Lightbulb />
                            </div>
                            <div className="insight-content">
                              {insight.title && <h5 className="insight-title">{insight.title}</h5>}
                              <p className="insight-text">
                                {typeof insight === 'string' ? insight : insight.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}

          {/* Additional tab content */}
          {activeTab === 'bookkeeping' && (
            <BookkeepingDashboard user={user} />
          )}

          {activeTab === 'invoice' && (
            <InvoiceGeneration user={user} />
          )}

          {/* Revenue Tab */}
          {activeTab === 'revenue' && (
            <div className="revenue-tab-content">
              <div className="tab-header">
                <h2><TrendingUp className="tab-header-icon" /> Revenue Analysis</h2>
                <p>Detailed breakdown of all revenue streams and income sources</p>
              </div>
              
              {!plData ? (
                <div className="no-data-container">
                  <div className="no-data-icon">
                    <TrendingUp />
                  </div>
                  <h3>No Revenue Data Available</h3>
                  <p>Upload a bank statement to see your revenue breakdown</p>
                  <button onClick={() => setActiveTab('bookkeeping')} className="upload-btn">
                    <Upload /> Upload Bank Statement
                  </button>
                </div>
              ) : (
                <>
                  {/* Revenue Summary Card */}
                  <div className="summary-card revenue-summary">
                    <div className="summary-header">
                      <div className="summary-icon revenue-bg">
                        <TrendingUp />
                      </div>
                      <div className="summary-info">
                        <h3>Total Revenue</h3>
                        <div className="summary-amount revenue-amount">{formatCurrency(metrics.totalRevenue)}</div>
                      </div>
                    </div>
                    <div className="summary-meta">
                      <span className="transaction-count">
                        {metrics.creditTransactions.length} credit transactions
                      </span>
                    </div>
                  </div>

                  {/* Revenue Pie Chart - Dynamic visualization */}
                  {revenuePieData.length > 0 && (
                    <div className="pie-chart-section">
                      <div className="pie-chart-header">
                        <h3><PieChartIcon className="chart-icon" /> Revenue Distribution by Category</h3>
                        <p className="chart-subtitle">Click on a segment to view details • Categories update in real-time when you reclassify transactions</p>
                      </div>
                      <div className="pie-chart-container">
                        <div className="pie-chart-wrapper">
                          <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                              <Pie
                                activeIndex={activeRevenueIndex}
                                activeShape={(props) => renderActiveShape(props, REVENUE_COLORS)}
                                data={revenuePieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={140}
                                paddingAngle={3}
                                dataKey="value"
                                onMouseEnter={(_, index) => setActiveRevenueIndex(index)}
                                onMouseLeave={() => setActiveRevenueIndex(null)}
                                animationBegin={0}
                                animationDuration={800}
                                animationEasing="ease-out"
                              >
                                {revenuePieData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={REVENUE_COLORS[index % REVENUE_COLORS.length]}
                                    stroke="#fff"
                                    strokeWidth={2}
                                    style={{ cursor: 'pointer' }}
                                  />
                                ))}
                              </Pie>
                              <Tooltip 
                                content={<CustomPieTooltip totalAmount={revenuePieData.reduce((sum, item) => sum + item.value, 0)} />}
                              />
                              <Legend 
                                content={(props) => renderCustomLegend(props, REVENUE_COLORS, revenuePieData.reduce((sum, item) => sum + item.value, 0))}
                                layout="vertical"
                                align="right"
                                verticalAlign="middle"
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="pie-chart-stats">
                          <div className="stat-card">
                            <span className="stat-label">Categories</span>
                            <span className="stat-value">{revenuePieData.length}</span>
                          </div>
                          <div className="stat-card">
                            <span className="stat-label">Top Category</span>
                            <span className="stat-value">{revenuePieData[0]?.name || '-'}</span>
                          </div>
                          <div className="stat-card">
                            <span className="stat-label">Top Category Share</span>
                            <span className="stat-value">
                              {revenuePieData[0] ? 
                                ((revenuePieData[0].value / revenuePieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1) + '%'
                                : '-'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Credit Transactions Table */}
                  <div className="transactions-table-section">
                    <h3>Credit Transactions</h3>
                    <div className="transactions-table-wrapper">
                      <table className="transactions-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th className="amount-col">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.creditTransactions.length > 0 ? (
                            metrics.creditTransactions.map((txn, index) => (
                              <tr key={index}>
                                <td className="date-col">{txn.date || '-'}</td>
                                <td className="description-col">{txn.description || txn.particulars || '-'}</td>
                                <td className="category-col">
                                  {editingCategory?.index === index && editingCategory?.type === 'credit' ? (
                                    <div className="category-editor">
                                      {!showCustomInput ? (
                                        <select 
                                          value={selectedCategory}
                                          onChange={(e) => handleCategoryChange(e.target.value)}
                                          className="category-select"
                                        >
                                          <option value="">Select category...</option>
                                          {getAvailableCategories('credit').map((cat, i) => (
                                            <option key={i} value={cat}>{cat}</option>
                                          ))}
                                          <option value="__add_custom__">+ Add custom category</option>
                                        </select>
                                      ) : (
                                        <input
                                          type="text"
                                          value={customCategory}
                                          onChange={(e) => setCustomCategory(e.target.value)}
                                          placeholder="Enter custom category..."
                                          className="category-input"
                                          autoFocus
                                        />
                                      )}
                                      <div className="category-editor-actions">
                                        <button className="btn-save" onClick={saveCategory}>OK</button>
                                        <button className="btn-cancel" onClick={cancelCategoryEdit}>Cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <span 
                                      className="editable-category"
                                      onClick={() => handleCategoryClick(index, 'credit', txn.category?.category || 'Other Income')}
                                      title="Click to change category"
                                    >
                                      {txn.category?.category || 'Other Income'}
                                    </span>
                                  )}
                                </td>
                                <td className="amount-col revenue-amount">{formatCurrency(Math.abs(txn.amount))}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="no-data-row">No credit transactions found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Revenue Categories */}
                  <div className="categories-section">
                    <h3>Revenue by Category</h3>
                    <div className="categories-grid">
                      {metrics.revenueBreakdown.length > 0 ? (
                        metrics.revenueBreakdown.map((item, index) => (
                          <div key={index} className="category-card revenue-category">
                            <div className="category-header">
                              <span className="category-name">{item.name || item.category}</span>
                              <span className="category-percentage">
                                {((item.amount / metrics.totalRevenue) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="category-amount revenue-amount">{formatCurrency(item.amount)}</div>
                            <div className="category-meta">
                              <span className="transaction-count">{item.transactionCount} transactions</span>
                            </div>
                            <div className="category-bar">
                              <div 
                                className="category-bar-fill revenue-fill" 
                                style={{width: `${(item.amount / metrics.totalRevenue) * 100}%`}}
                              ></div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-categories">No revenue categories available</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Expense Tab */}
          {activeTab === 'expense' && (
            <div className="expense-tab-content">
              <div className="tab-header">
                <h2><ArrowDownRight className="tab-header-icon" /> Expense Analysis</h2>
                <p>Detailed breakdown of all expenses and spending categories</p>
              </div>
              
              {!plData ? (
                <div className="no-data-container">
                  <div className="no-data-icon">
                    <ArrowDownRight />
                  </div>
                  <h3>No Expense Data Available</h3>
                  <p>Upload a bank statement to see your expense breakdown</p>
                  <button onClick={() => setActiveTab('bookkeeping')} className="upload-btn">
                    <Upload /> Upload Bank Statement
                  </button>
                </div>
              ) : (
                <>
                  {/* Expense Summary Card */}
                  <div className="summary-card expense-summary">
                    <div className="summary-header">
                      <div className="summary-icon expense-bg">
                        <ArrowDownRight />
                      </div>
                      <div className="summary-info">
                        <h3>Total Expenses</h3>
                        <div className="summary-amount expense-amount">{formatCurrency(metrics.totalExpenses)}</div>
                      </div>
                    </div>
                    <div className="summary-meta">
                      <span className="transaction-count">
                        {metrics.debitTransactions.length} debit transactions
                      </span>
                    </div>
                  </div>

                  {/* Expense Pie Chart - Dynamic visualization */}
                  {expensePieData.length > 0 && (
                    <div className="pie-chart-section expense-chart">
                      <div className="pie-chart-header">
                        <h3><PieChartIcon className="chart-icon" /> Expense Distribution by Category</h3>
                        <p className="chart-subtitle">Click on a segment to view details • Categories update in real-time when you reclassify transactions</p>
                      </div>
                      <div className="pie-chart-container">
                        <div className="pie-chart-wrapper">
                          <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                              <Pie
                                activeIndex={activeExpenseIndex}
                                activeShape={(props) => renderActiveShape(props, EXPENSE_COLORS)}
                                data={expensePieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={140}
                                paddingAngle={3}
                                dataKey="value"
                                onMouseEnter={(_, index) => setActiveExpenseIndex(index)}
                                onMouseLeave={() => setActiveExpenseIndex(null)}
                                animationBegin={0}
                                animationDuration={800}
                                animationEasing="ease-out"
                              >
                                {expensePieData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]}
                                    stroke="#fff"
                                    strokeWidth={2}
                                    style={{ cursor: 'pointer' }}
                                  />
                                ))}
                              </Pie>
                              <Tooltip 
                                content={<CustomPieTooltip totalAmount={expensePieData.reduce((sum, item) => sum + item.value, 0)} />}
                              />
                              <Legend 
                                content={(props) => renderCustomLegend(props, EXPENSE_COLORS, expensePieData.reduce((sum, item) => sum + item.value, 0))}
                                layout="vertical"
                                align="right"
                                verticalAlign="middle"
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="pie-chart-stats">
                          <div className="stat-card expense">
                            <span className="stat-label">Categories</span>
                            <span className="stat-value">{expensePieData.length}</span>
                          </div>
                          <div className="stat-card expense">
                            <span className="stat-label">Top Category</span>
                            <span className="stat-value">{expensePieData[0]?.name || '-'}</span>
                          </div>
                          <div className="stat-card expense">
                            <span className="stat-label">Top Category Share</span>
                            <span className="stat-value">
                              {expensePieData[0] ? 
                                ((expensePieData[0].value / expensePieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1) + '%'
                                : '-'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Debit Transactions Table */}
                  <div className="transactions-table-section">
                    <h3>Debit Transactions</h3>
                    <div className="transactions-table-wrapper">
                      <table className="transactions-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th className="amount-col">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.debitTransactions.length > 0 ? (
                            metrics.debitTransactions.map((txn, index) => (
                              <tr key={index}>
                                <td className="date-col">{txn.date || '-'}</td>
                                <td className="description-col">{txn.description || txn.particulars || '-'}</td>
                                <td className="category-col">
                                  {editingCategory?.index === index && editingCategory?.type === 'debit' ? (
                                    <div className="category-editor">
                                      {!showCustomInput ? (
                                        <select 
                                          value={selectedCategory}
                                          onChange={(e) => handleCategoryChange(e.target.value)}
                                          className="category-select"
                                        >
                                          <option value="">Select category...</option>
                                          {getAvailableCategories('debit').map((cat, i) => (
                                            <option key={i} value={cat}>{cat}</option>
                                          ))}
                                          <option value="__add_custom__">+ Add custom category</option>
                                        </select>
                                      ) : (
                                        <input
                                          type="text"
                                          value={customCategory}
                                          onChange={(e) => setCustomCategory(e.target.value)}
                                          placeholder="Enter custom category..."
                                          className="category-input"
                                          autoFocus
                                        />
                                      )}
                                      <div className="category-editor-actions">
                                        <button className="btn-save" onClick={saveCategory}>OK</button>
                                        <button className="btn-cancel" onClick={cancelCategoryEdit}>Cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <span 
                                      className="editable-category"
                                      onClick={() => handleCategoryClick(index, 'debit', txn.category?.category || 'General Expenses')}
                                      title="Click to change category"
                                    >
                                      {txn.category?.category || 'General Expenses'}
                                    </span>
                                  )}
                                </td>
                                <td className="amount-col expense-amount">{formatCurrency(Math.abs(txn.amount))}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="no-data-row">No debit transactions found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Expense Categories */}
                  <div className="categories-section">
                    <h3>Expenses by Category</h3>
                    <div className="categories-grid">
                      {metrics.expenseBreakdown.length > 0 ? (
                        metrics.expenseBreakdown.map((item, index) => (
                          <div key={index} className="category-card expense-category">
                            <div className="category-header">
                              <span className="category-name">{item.name || item.category}</span>
                              <span className="category-percentage">
                                {((item.amount / metrics.totalExpenses) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="category-amount expense-amount">{formatCurrency(item.amount)}</div>
                            <div className="category-meta">
                              <span className="transaction-count">{item.transactionCount} transactions</span>
                            </div>
                            <div className="category-bar">
                              <div 
                                className="category-bar-fill expense-fill" 
                                style={{width: `${(item.amount / metrics.totalExpenses) * 100}%`}}
                              ></div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-categories">No expense categories available</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="tab-placeholder">
              <div className="placeholder-content">
                <div className="placeholder-icon">
                  <Settings />
                </div>
                <h3>System Settings</h3>
                <p>Configure your AI CFO preferences, automation rules, notification settings, and integration parameters for optimal performance.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* AI Chatbot - Available on all tabs */}
      <AIChatbot user={user} />
    </div>
  );
};

export default Dashboard;