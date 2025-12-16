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
  ChevronDown,
  ChevronUp,
  Receipt,
  BookOpen,
  PieChart as PieChartIcon,
  Upload,
  AlertCircle,
  TrendingUp,
  Zap,
  Info,
  X,
  Repeat,
  Shuffle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
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
  
  // Expense breakdown dropdown states
  const [expenseDropdownOpen, setExpenseDropdownOpen] = useState(false);
  const [expenseModalType, setExpenseModalType] = useState(null); // 'recurring' | 'non-recurring'
  
  // Expense tab states
  const [showPieLegend, setShowPieLegend] = useState(false);
  const [pieLegendLocked, setPieLegendLocked] = useState(false);
  const [expenseViewMode, setExpenseViewMode] = useState('monthly'); // 'weekly' | 'monthly'
  const [hoveredPieIndex, setHoveredPieIndex] = useState(null);

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

  // Classify expenses as recurring or non-recurring based on patterns
  const classifyExpenses = useMemo(() => {
    if (!metrics.debitTransactions || metrics.debitTransactions.length === 0) {
      return { recurring: [], nonRecurring: [], recurringTotal: 0, nonRecurringTotal: 0 };
    }

    // Keywords that indicate recurring expenses
    const recurringKeywords = [
      'subscription', 'monthly', 'rent', 'salary', 'wages', 'insurance', 'emi', 'loan',
      'internet', 'phone', 'utility', 'electric', 'water', 'gas', 'netflix', 'spotify',
      'amazon prime', 'swiggy', 'zomato', 'uber', 'ola', 'gym', 'membership', 'premium',
      'recurring', 'auto-debit', 'standing instruction', 'si ', 'nach', 'autopay'
    ];

    const recurring = [];
    const nonRecurring = [];

    metrics.debitTransactions.forEach(txn => {
      const description = (txn.description || txn.particulars || '').toLowerCase();
      const category = (txn.category?.category || '').toLowerCase();
      
      const isRecurring = recurringKeywords.some(keyword => 
        description.includes(keyword) || category.includes(keyword)
      );

      if (isRecurring) {
        recurring.push(txn);
      } else {
        nonRecurring.push(txn);
      }
    });

    return {
      recurring,
      nonRecurring,
      recurringTotal: recurring.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0),
      nonRecurringTotal: nonRecurring.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
    };
  }, [metrics.debitTransactions]);

  // Generate bar chart data for expenses over time
  const expenseBarData = useMemo(() => {
    if (!metrics.debitTransactions || metrics.debitTransactions.length === 0) return { overall: [], recurring: [], nonRecurring: [] };

    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      // Try different date formats
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        // DD/MM/YYYY or DD-MM-YYYY
        return new Date(parts[2], parts[1] - 1, parts[0]);
      }
      return new Date(dateStr);
    };

    const getWeekKey = (date) => {
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const weekNum = Math.ceil((((date - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
      return `W${weekNum}`;
    };

    const getMonthKey = (date) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[date.getMonth()];
    };

    // Group transactions
    const overallMap = new Map();
    const recurringMap = new Map();
    const nonRecurringMap = new Map();

    const recurringKeywords = [
      'subscription', 'monthly', 'rent', 'salary', 'wages', 'insurance', 'emi', 'loan',
      'internet', 'phone', 'utility', 'electric', 'water', 'gas', 'netflix', 'spotify',
      'amazon prime', 'swiggy', 'zomato', 'uber', 'ola', 'gym', 'membership', 'premium'
    ];

    metrics.debitTransactions.forEach(txn => {
      const date = parseDate(txn.date);
      if (!date || isNaN(date.getTime())) return;

      const key = expenseViewMode === 'weekly' ? getWeekKey(date) : getMonthKey(date);
      const amount = Math.abs(txn.amount || 0);

      // Overall
      overallMap.set(key, (overallMap.get(key) || 0) + amount);

      // Check if recurring
      const description = (txn.description || txn.particulars || '').toLowerCase();
      const category = (txn.category?.category || '').toLowerCase();
      const isRecurring = recurringKeywords.some(keyword => 
        description.includes(keyword) || category.includes(keyword)
      );

      if (isRecurring) {
        recurringMap.set(key, (recurringMap.get(key) || 0) + amount);
      } else {
        nonRecurringMap.set(key, (nonRecurringMap.get(key) || 0) + amount);
      }
    });

    const sortedKeys = Array.from(overallMap.keys()).sort();
    const lastKeys = sortedKeys.slice(-6); // Last 6 periods

    return {
      overall: lastKeys.map(key => ({ name: key, amount: overallMap.get(key) || 0 })),
      recurring: lastKeys.map(key => ({ name: key, amount: recurringMap.get(key) || 0 })),
      nonRecurring: lastKeys.map(key => ({ name: key, amount: nonRecurringMap.get(key) || 0 }))
    };
  }, [metrics.debitTransactions, expenseViewMode]);

  // Get top vendors/payees
  const topVendors = useMemo(() => {
    if (!metrics.debitTransactions || metrics.debitTransactions.length === 0) return [];

    const vendorMap = new Map();

    metrics.debitTransactions.forEach(txn => {
      const vendor = txn.description || txn.particulars || 'Unknown';
      const amount = Math.abs(txn.amount || 0);
      
      if (vendorMap.has(vendor)) {
        const existing = vendorMap.get(vendor);
        vendorMap.set(vendor, { amount: existing.amount + amount, count: existing.count + 1 });
      } else {
        vendorMap.set(vendor, { amount, count: 1 });
      }
    });

    return Array.from(vendorMap.entries())
      .map(([name, data]) => ({ name: name.substring(0, 25), fullName: name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [metrics.debitTransactions]);

  // Professional color palettes - distinct vibrant colors for each category
  const CHART_COLORS = [
    '#6366F1', // Indigo
    '#22C55E', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#3B82F6', // Blue
    '#84CC16', // Lime
    '#A855F7', // Violet
    '#0EA5E9', // Sky
    '#10B981', // Emerald
    '#FACC15', // Yellow
  ];

  // No active segment state needed - using simpler hover effect

  // Dynamic pie chart data computed from transactions - updates when categories change
  const revenuePieData = useMemo(() => {
    if (!metrics.creditTransactions || metrics.creditTransactions.length === 0) return [];
    
    const categoryMap = new Map();
    
    metrics.creditTransactions.forEach(txn => {
      const category = txn.category?.category || 'Other Income';
      const amount = Math.abs(txn.amount || 0);
      
      if (categoryMap.has(category)) {
        const existing = categoryMap.get(category);
        categoryMap.set(category, { value: existing.value + amount, count: existing.count + 1 });
      } else {
        categoryMap.set(category, { value: amount, count: 1 });
      }
    });
    
    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, value: data.value, count: data.count }))
      .sort((a, b) => b.value - a.value);
  }, [metrics.creditTransactions]);

  const expensePieData = useMemo(() => {
    if (!metrics.debitTransactions || metrics.debitTransactions.length === 0) return [];
    
    const categoryMap = new Map();
    
    metrics.debitTransactions.forEach(txn => {
      const category = txn.category?.category || 'General Expenses';
      const amount = Math.abs(txn.amount || 0);
      
      if (categoryMap.has(category)) {
        const existing = categoryMap.get(category);
        categoryMap.set(category, { value: existing.value + amount, count: existing.count + 1 });
      } else {
        categoryMap.set(category, { value: amount, count: 1 });
      }
    });
    
    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, value: data.value, count: data.count }))
      .sort((a, b) => b.value - a.value);
  }, [metrics.debitTransactions]);



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

                      {/* Total Expenses Card with Dropdown */}
                      <div 
                        className={`metric-card expense ${isAnimating ? 'slide-up' : ''}`}
                        style={{
                          animationDelay: '150ms',
                          opacity: isAnimating ? 1 : 0,
                          transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative',
                          overflow: 'visible'
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
                            onClick={() => setExpenseDropdownOpen(!expenseDropdownOpen)}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            title="Click to see recurring vs non-recurring breakdown"
                          >
                            {formatCurrency(metrics.totalExpenses)}
                            {expenseDropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>

                        {/* Expense Breakdown Dropdown */}
                        <div style={{
                          maxHeight: expenseDropdownOpen ? '200px' : '0',
                          overflow: 'hidden',
                          transition: 'all 0.3s ease-in-out',
                          marginTop: expenseDropdownOpen ? '16px' : '0',
                          borderTop: expenseDropdownOpen ? '1px solid #fee2e2' : 'none',
                          paddingTop: expenseDropdownOpen ? '16px' : '0'
                        }}>
                          <div 
                            onClick={() => setExpenseModalType('recurring')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px',
                              background: '#fef2f2',
                              borderRadius: '8px',
                              marginBottom: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#fef2f2'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Repeat size={16} style={{ color: '#dc2626' }} />
                              <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>Recurring Expenses</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>
                                {formatCurrency(classifyExpenses.recurringTotal)}
                              </span>
                              <ChevronRight size={16} style={{ color: '#94a3b8' }} />
                            </div>
                          </div>
                          
                          <div 
                            onClick={() => setExpenseModalType('non-recurring')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px',
                              background: '#fef2f2',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#fef2f2'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Shuffle size={16} style={{ color: '#f97316' }} />
                              <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>Non-Recurring Expenses</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px', fontWeight: '600', color: '#f97316' }}>
                                {formatCurrency(classifyExpenses.nonRecurringTotal)}
                              </span>
                              <ChevronRight size={16} style={{ color: '#94a3b8' }} />
                            </div>
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

                  {/* Revenue Pie Chart - Professional Design */}
                  {revenuePieData.length > 0 && (
                    <div style={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '24px',
                      margin: '20px 0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      border: '1px solid #e2e8f0'
                    }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <PieChartIcon style={{ width: '20px', height: '20px', color: '#22c55e' }} />
                        Revenue Breakdown
                      </h3>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '40px'
                      }}>
                        {/* Donut Chart */}
                        <div style={{ position: 'relative', width: '200px', height: '200px', flexShrink: 0 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={revenuePieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={2}
                                dataKey="value"
                                animationDuration={600}
                              >
                                {revenuePieData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                                    stroke="#fff"
                                    strokeWidth={2}
                                  />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomPieTooltip totalAmount={revenuePieData.reduce((sum, item) => sum + item.value, 0)} />} />
                            </PieChart>
                          </ResponsiveContainer>
                          {/* Center Total */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#22c55e' }}>
                              {formatCurrency(metrics.totalRevenue)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Total</div>
                          </div>
                        </div>

                        {/* Legend */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {revenuePieData.map((item, index) => {
                            const total = revenuePieData.reduce((s, i) => s + i.value, 0);
                            const percent = ((item.value / total) * 100).toFixed(1);
                            return (
                              <div key={index} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                background: '#f8fafc',
                                borderRadius: '8px',
                                borderLeft: `4px solid ${CHART_COLORS[index % CHART_COLORS.length]}`
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div>
                                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>{item.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{item.count} transaction{item.count > 1 ? 's' : ''}</div>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{formatCurrency(item.value)}</div>
                                  <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: '500' }}>{percent}%</div>
                                </div>
                              </div>
                            );
                          })}
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

          {/* Expense Tab - Professional Dashboard Layout */}
          {activeTab === 'expense' && (
            <div className="expense-tab-content" onClick={() => { if (!pieLegendLocked) setShowPieLegend(false); }}>
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
                  {/* Main Dashboard Grid - Professional 2x2 Layout */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '380px 1fr',
                    gridTemplateRows: 'auto auto',
                    gap: '24px',
                    marginTop: '24px'
                  }}>
                    
                    {/* TOP LEFT: Pie Chart with Hover Legend */}
                    <div 
                      style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '28px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        border: '1px solid #e2e8f0',
                        position: 'relative',
                        minHeight: '380px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
                        Expenses by Category
                      </h3>
                      
                      {/* Pie Chart */}
                      <div 
                        style={{ position: 'relative', width: '100%', height: '280px' }}
                        onMouseEnter={() => !pieLegendLocked && setShowPieLegend(true)}
                        onMouseLeave={() => !pieLegendLocked && setShowPieLegend(false)}
                        onClick={() => setPieLegendLocked(!pieLegendLocked)}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={expensePieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={110}
                              paddingAngle={3}
                              dataKey="value"
                              onMouseEnter={(_, index) => setHoveredPieIndex(index)}
                              onMouseLeave={() => setHoveredPieIndex(null)}
                            >
                              {expensePieData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                                  stroke={hoveredPieIndex === index ? '#1e293b' : '#fff'}
                                  strokeWidth={hoveredPieIndex === index ? 3 : 2}
                                  style={{ 
                                    cursor: 'pointer',
                                    filter: hoveredPieIndex === index ? 'brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
                                    transition: 'all 0.3s ease'
                                  }}
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Center Total */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center',
                          pointerEvents: 'none'
                        }}>
                          <div style={{ fontSize: '22px', fontWeight: '800', color: '#ef4444' }}>
                            {formatCurrency(metrics.totalExpenses)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Total Expenses</div>
                        </div>

                        {/* Legend Overlay on Hover/Click */}
                        {showPieLegend && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(255,255,255,0.97)',
                            backdropFilter: 'blur(8px)',
                            borderRadius: '16px',
                            padding: '16px',
                            overflowY: 'auto',
                            zIndex: 10,
                            animation: 'fadeIn 0.2s ease',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                          }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {pieLegendLocked ? '🔒 Click anywhere to close' : '💡 Click to lock legend'}
                            </div>
                            {expensePieData.map((item, index) => {
                              const total = expensePieData.reduce((s, i) => s + i.value, 0);
                              const percent = ((item.value / total) * 100).toFixed(1);
                              return (
                                <div key={index} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  marginBottom: '6px',
                                  background: hoveredPieIndex === index ? '#f1f5f9' : 'transparent',
                                  transition: 'background 0.2s ease'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: CHART_COLORS[index % CHART_COLORS.length], boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div>
                                    <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>{item.name}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{formatCurrency(item.value)}</span>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#ef4444', background: '#fef2f2', padding: '4px 8px', borderRadius: '6px' }}>{percent}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Hint */}
                      <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '16px' }}>
                        Hover to see breakdown • Click to lock
                      </p>
                    </div>

                    {/* TOP RIGHT: Overall Expenses Bar Chart */}
                    <div style={{
                      background: 'white',
                      borderRadius: '20px',
                      padding: '28px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      border: '1px solid #e2e8f0',
                      minHeight: '380px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                          Overall Expenses
                        </h3>
                        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '12px', padding: '6px' }}>
                          <button 
                            onClick={() => setExpenseViewMode('weekly')}
                            style={{
                              padding: '10px 20px',
                              fontSize: '14px',
                              fontWeight: '600',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: expenseViewMode === 'weekly' ? 'white' : 'transparent',
                              color: expenseViewMode === 'weekly' ? '#1e293b' : '#64748b',
                              boxShadow: expenseViewMode === 'weekly' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                              transition: 'all 0.2s ease'
                            }}
                          >Weekly</button>
                          <button 
                            onClick={() => setExpenseViewMode('monthly')}
                            style={{
                              padding: '10px 20px',
                              fontSize: '14px',
                              fontWeight: '600',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: expenseViewMode === 'monthly' ? 'white' : 'transparent',
                              color: expenseViewMode === 'monthly' ? '#1e293b' : '#64748b',
                              boxShadow: expenseViewMode === 'monthly' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                              transition: 'all 0.2s ease'
                            }}
                          >Monthly</button>
                        </div>
                      </div>
                      <div style={{ flex: 1, minHeight: '280px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={expenseBarData.overall} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fontSize: 13, fill: '#64748b', fontWeight: '500' }} 
                              axisLine={{ stroke: '#e2e8f0' }} 
                              tickLine={false} 
                            />
                            <YAxis 
                              tick={{ fontSize: 13, fill: '#64748b', fontWeight: '500' }} 
                              axisLine={false} 
                              tickLine={false} 
                              tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                              width={70}
                            />
                            <Tooltip 
                              formatter={(value) => [formatCurrency(value), 'Total Expenses']}
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: 'none',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                padding: '12px 16px'
                              }}
                              labelStyle={{ fontWeight: '600', marginBottom: '4px' }}
                            />
                            <Bar 
                              dataKey="amount" 
                              fill="#6366f1" 
                              radius={[8, 8, 0, 0]}
                              maxBarSize={60}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* BOTTOM LEFT: Non-Recurring Expenses */}
                    <div style={{
                      background: 'white',
                      borderRadius: '20px',
                      padding: '28px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      border: '1px solid #e2e8f0',
                      minHeight: '320px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '12px', 
                          background: 'linear-gradient(135deg, #f97316, #ea580c)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
                        }}>
                          <Shuffle size={20} style={{ color: 'white' }} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                            Non-Recurring Expenses
                          </h3>
                          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>One-time and variable costs</p>
                        </div>
                      </div>
                      <div style={{ flex: 1, minHeight: '180px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={expenseBarData.nonRecurring} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fontSize: 12, fill: '#64748b', fontWeight: '500' }} 
                              axisLine={{ stroke: '#e2e8f0' }} 
                              tickLine={false} 
                            />
                            <YAxis 
                              tick={{ fontSize: 12, fill: '#64748b', fontWeight: '500' }} 
                              axisLine={false} 
                              tickLine={false} 
                              tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                              width={60}
                            />
                            <Tooltip 
                              formatter={(value) => [formatCurrency(value), 'Non-Recurring']}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                            />
                            <Bar 
                              dataKey="amount" 
                              fill="#f97316" 
                              radius={[6, 6, 0, 0]}
                              maxBarSize={50}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginTop: '16px', 
                        padding: '16px 20px', 
                        background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', 
                        borderRadius: '12px',
                        border: '1px solid #fed7aa'
                      }}>
                        <span style={{ fontSize: '14px', color: '#9a3412', fontWeight: '500' }}>Total Non-Recurring</span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: '#ea580c' }}>{formatCurrency(classifyExpenses.nonRecurringTotal)}</span>
                      </div>
                    </div>

                    {/* BOTTOM RIGHT: Recurring Expenses */}
                    <div style={{
                      background: 'white',
                      borderRadius: '20px',
                      padding: '28px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      border: '1px solid #e2e8f0',
                      minHeight: '320px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '12px', 
                          background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                        }}>
                          <Repeat size={20} style={{ color: 'white' }} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                            Recurring Expenses
                          </h3>
                          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Fixed monthly costs</p>
                        </div>
                      </div>
                      <div style={{ flex: 1, minHeight: '180px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={expenseBarData.recurring} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fontSize: 12, fill: '#64748b', fontWeight: '500' }} 
                              axisLine={{ stroke: '#e2e8f0' }} 
                              tickLine={false} 
                            />
                            <YAxis 
                              tick={{ fontSize: 12, fill: '#64748b', fontWeight: '500' }} 
                              axisLine={false} 
                              tickLine={false} 
                              tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                              width={60}
                            />
                            <Tooltip 
                              formatter={(value) => [formatCurrency(value), 'Recurring']}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                            />
                            <Bar 
                              dataKey="amount" 
                              fill="#dc2626" 
                              radius={[6, 6, 0, 0]}
                              maxBarSize={50}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginTop: '16px', 
                        padding: '16px 20px', 
                        background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', 
                        borderRadius: '12px',
                        border: '1px solid #fecaca'
                      }}>
                        <span style={{ fontSize: '14px', color: '#991b1b', fontWeight: '500' }}>Total Recurring</span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>{formatCurrency(classifyExpenses.recurringTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Debit Transactions Table */}
                  <div className="transactions-table-section" style={{ marginTop: '24px' }}>
                    <h3>All Debit Transactions</h3>
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

      {/* Expense Type Modal */}
      {expenseModalType && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setExpenseModalType(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              animation: 'slideUp 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              background: expenseModalType === 'recurring' ? '#fef2f2' : '#fff7ed'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {expenseModalType === 'recurring' ? (
                  <Repeat size={24} style={{ color: '#dc2626' }} />
                ) : (
                  <Shuffle size={24} style={{ color: '#f97316' }} />
                )}
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                    {expenseModalType === 'recurring' ? 'Recurring Expenses' : 'Non-Recurring Expenses'}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                    {expenseModalType === 'recurring' 
                      ? `${classifyExpenses.recurring.length} transactions • ${formatCurrency(classifyExpenses.recurringTotal)}`
                      : `${classifyExpenses.nonRecurring.length} transactions • ${formatCurrency(classifyExpenses.nonRecurringTotal)}`
                    }
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setExpenseModalType(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} style={{ color: '#64748b' }} />
              </button>
            </div>

            {/* Modal Body - Table */}
            <div style={{ padding: '0', maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(expenseModalType === 'recurring' ? classifyExpenses.recurring : classifyExpenses.nonRecurring).map((txn, index) => (
                    <tr 
                      key={index} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: '#64748b' }}>{txn.date || '-'}</td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>{txn.description || txn.particulars || '-'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          background: '#f1f5f9',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          color: '#475569'
                        }}>
                          {txn.category?.category || 'General'}
                        </span>
                      </td>
                      <td style={{ 
                        padding: '14px 16px', 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#ef4444',
                        textAlign: 'right'
                      }}>
                        {formatCurrency(Math.abs(txn.amount))}
                      </td>
                    </tr>
                  ))}
                  {(expenseModalType === 'recurring' ? classifyExpenses.recurring : classifyExpenses.nonRecurring).length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        No {expenseModalType} expenses found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                {expenseModalType === 'recurring' 
                  ? 'Recurring expenses include subscriptions, EMIs, rent, utilities, etc.'
                  : 'Non-recurring expenses are one-time or irregular payments'
                }
              </span>
              <button
                onClick={() => setExpenseModalType(null)}
                style={{
                  background: '#1e293b',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chatbot - Available on all tabs */}
      <AIChatbot user={user} />
    </div>
  );
};

export default Dashboard;