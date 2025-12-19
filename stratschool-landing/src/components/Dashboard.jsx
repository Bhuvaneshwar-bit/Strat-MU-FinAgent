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
  ChevronLeft,
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
  Shuffle,
  Wallet,
  Clock,
  Flame,
  Activity,
  Moon,
  Sun,
  Menu,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import '../styles/ProfessionalDashboard.css';
import InvoiceGeneration from './InvoiceGeneration';
import BookkeepingDashboard from './BookkeepingDashboard';
import AIChatbot from './AIChatbot';

// Logo imports
import LogoDark from '../assets/Dark Mode - Nebulaa - Logo only.png';
import LogoLight from '../assets/Light Mode - Nebulaa - Logo only.jpg';

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
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('nebulaa-dark-mode');
    return saved ? JSON.parse(saved) : true; // Default to dark mode
  });

  // Apply dark mode class to body
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    document.body.classList.toggle('light-mode', !darkMode);
    localStorage.setItem('nebulaa-dark-mode', JSON.stringify(darkMode));
  }, [darkMode]);
  
  // Expense breakdown dropdown states
  const [expenseDropdownOpen, setExpenseDropdownOpen] = useState(false);
  const [expenseModalType, setExpenseModalType] = useState(null); // 'recurring' | 'non-recurring'
  
  // Expense tab states
  const [showPieLegend, setShowPieLegend] = useState(false);
  const [pieLegendLocked, setPieLegendLocked] = useState(false);
  const [expenseViewMode, setExpenseViewMode] = useState('monthly'); // 'weekly' | 'monthly'
  const [hoveredPieIndex, setHoveredPieIndex] = useState(null);

  // Revenue tab states
  const [showRevenuePieLegend, setShowRevenuePieLegend] = useState(false);
  const [revenuePieLegendLocked, setRevenuePieLegendLocked] = useState(false);
  const [revenueViewMode, setRevenueViewMode] = useState('monthly'); // 'weekly' | 'monthly'
  const [hoveredRevenuePieIndex, setHoveredRevenuePieIndex] = useState(null);

  // Vendor suggestion states
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState(null);
  const [vendorSuggestions, setVendorSuggestions] = useState([]);
  const [loadingVendorSuggestions, setLoadingVendorSuggestions] = useState(false);

  // Debit transactions pagination states
  const [debitCurrentPage, setDebitCurrentPage] = useState(1);
  const [debitRowsPerPage, setDebitRowsPerPage] = useState(5);

  // Credit transactions pagination states
  const [creditCurrentPage, setCreditCurrentPage] = useState(1);
  const [creditRowsPerPage, setCreditRowsPerPage] = useState(5);

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

    // Use ?? instead of || for numeric values to handle negative numbers correctly
    const totalRevenue = plData.analysisMetrics?.totalRevenue ?? plData.plStatement?.revenue?.totalRevenue ?? plData.plStatement?.revenue?.total ?? 0;
    const totalExpenses = plData.analysisMetrics?.totalExpenses ?? plData.plStatement?.expenses?.totalExpenses ?? plData.plStatement?.expenses?.total ?? 0;
    
    // Calculate net profit - can be negative!
    let netProfit = plData.analysisMetrics?.netIncome ?? plData.analysisMetrics?.netProfit ?? plData.plStatement?.profitability?.netIncome ?? plData.plStatement?.netIncome ?? null;
    
    // If netProfit is still null, calculate it from revenue - expenses
    if (netProfit === null) {
      netProfit = totalRevenue - totalExpenses;
    }
    
    // Calculate profit margin - can be negative!
    let profitMargin = plData.plStatement?.profitability?.netProfitMargin ?? plData.analysisMetrics?.profitMargin ?? null;
    if (profitMargin === null && totalRevenue > 0) {
      profitMargin = ((netProfit / totalRevenue) * 100).toFixed(2);
    } else if (profitMargin === null) {
      profitMargin = 0;
    }
    
    // Parse profitMargin if it's a string with %
    if (typeof profitMargin === 'string') {
      profitMargin = parseFloat(profitMargin.replace('%', '')) || 0;
    }

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      revenueBreakdown: plData.plStatement?.revenue?.revenueStreams || plData.plStatement?.revenue?.categories || [],
      expenseBreakdown: plData.plStatement?.expenses?.expenseCategories || plData.plStatement?.expenses?.categories || [],
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

    // Count vendor occurrences for recurring detection
    const vendorCount = new Map();
    metrics.debitTransactions.forEach(txn => {
      const description = (txn.description || txn.particulars || '').toLowerCase();
      const vendorKey = description.split('/').slice(0, 3).join('/').substring(0, 50);
      vendorCount.set(vendorKey, (vendorCount.get(vendorKey) || 0) + 1);
    });

    const recurring = [];
    const nonRecurring = [];

    metrics.debitTransactions.forEach(txn => {
      const description = (txn.description || txn.particulars || '').toLowerCase();
      const category = (txn.category?.category || '').toLowerCase();
      const vendorKey = description.split('/').slice(0, 3).join('/').substring(0, 50);
      
      const hasRecurringKeyword = recurringKeywords.some(keyword => 
        description.includes(keyword) || category.includes(keyword)
      );
      const isRepeatedVendor = (vendorCount.get(vendorKey) || 0) >= 2;

      if (hasRecurringKeyword || isRepeatedVendor) {
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

  // Calculate financial health metrics (Cash Available, Burn Rate, Runway)
  const financialHealth = useMemo(() => {
    const totalRevenue = metrics.totalRevenue || 0;
    const totalExpenses = metrics.totalExpenses || 0;
    const netProfit = metrics.netProfit || (totalRevenue - totalExpenses);
    
    // Cash Available = Net of all transactions (revenue - expenses)
    // For a more accurate picture, this would typically be the closing balance
    const cashAvailable = Math.max(0, totalRevenue - totalExpenses);
    
    // Calculate the date range to determine monthly averages
    const allTransactions = metrics.transactions || [];
    let monthsOfData = 1;
    
    if (allTransactions.length > 0) {
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split(/[\/\-]/);
        if (parts.length === 3) {
          const p0 = parseInt(parts[0]);
          const p1 = parseInt(parts[1]);
          const p2 = parseInt(parts[2]);
          if (p0 > 31 || parts[0].length === 4) {
            return new Date(p0, p1 - 1, p2);
          } else {
            const fullYear = p2 < 100 ? (p2 > 50 ? 1900 + p2 : 2000 + p2) : p2;
            return new Date(fullYear, p1 - 1, p0);
          }
        }
        return new Date(dateStr);
      };
      
      const dates = allTransactions
        .map(t => parseDate(t.date))
        .filter(d => d && !isNaN(d.getTime()))
        .sort((a, b) => a - b);
      
      if (dates.length >= 2) {
        const firstDate = dates[0];
        const lastDate = dates[dates.length - 1];
        const diffTime = Math.abs(lastDate - firstDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        monthsOfData = Math.max(1, diffDays / 30);
      }
    }
    
    // Monthly Burn Rate = Total Expenses / Number of Months
    const monthlyBurnRate = totalExpenses / monthsOfData;
    
    // Runway = Cash Available / Monthly Burn Rate (in months)
    const runway = monthlyBurnRate > 0 ? cashAvailable / monthlyBurnRate : 0;
    
    // ===== HEALTH SCORE CALCULATION =====
    // Score is 0-100 based on 5 weighted factors
    
    // 1. Profitability Score (25 points max)
    // Positive margin = full points, negative = proportional reduction
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    let profitabilityScore = 0;
    if (profitMargin >= 20) profitabilityScore = 25;
    else if (profitMargin >= 10) profitabilityScore = 20;
    else if (profitMargin >= 5) profitabilityScore = 15;
    else if (profitMargin >= 0) profitabilityScore = 10;
    else if (profitMargin >= -10) profitabilityScore = 5;
    else profitabilityScore = 0;
    
    // 2. Runway Score (25 points max)
    // 12+ months = full points, <3 months = critical
    let runwayScore = 0;
    if (runway >= 12) runwayScore = 25;
    else if (runway >= 9) runwayScore = 20;
    else if (runway >= 6) runwayScore = 15;
    else if (runway >= 3) runwayScore = 10;
    else if (runway >= 1) runwayScore = 5;
    else runwayScore = 0;
    
    // 3. Revenue Coverage Ratio (20 points max)
    // Revenue / Expenses ratio - how well revenue covers expenses
    const coverageRatio = totalExpenses > 0 ? totalRevenue / totalExpenses : 1;
    let coverageScore = 0;
    if (coverageRatio >= 1.5) coverageScore = 20;
    else if (coverageRatio >= 1.2) coverageScore = 16;
    else if (coverageRatio >= 1.0) coverageScore = 12;
    else if (coverageRatio >= 0.8) coverageScore = 8;
    else if (coverageRatio >= 0.5) coverageScore = 4;
    else coverageScore = 0;
    
    // 4. Burn Rate Efficiency (15 points max)
    // Lower burn rate relative to revenue = better
    const burnRateRatio = totalRevenue > 0 ? (monthlyBurnRate / (totalRevenue / monthsOfData)) : 1;
    let burnEfficiencyScore = 0;
    if (burnRateRatio <= 0.5) burnEfficiencyScore = 15;
    else if (burnRateRatio <= 0.7) burnEfficiencyScore = 12;
    else if (burnRateRatio <= 0.9) burnEfficiencyScore = 9;
    else if (burnRateRatio <= 1.0) burnEfficiencyScore = 6;
    else if (burnRateRatio <= 1.2) burnEfficiencyScore = 3;
    else burnEfficiencyScore = 0;
    
    // 5. Cash Position Score (15 points max)
    // Based on absolute cash available relative to monthly burn
    const cashMonths = monthlyBurnRate > 0 ? cashAvailable / monthlyBurnRate : 0;
    let cashPositionScore = 0;
    if (cashMonths >= 6) cashPositionScore = 15;
    else if (cashMonths >= 4) cashPositionScore = 12;
    else if (cashMonths >= 2) cashPositionScore = 9;
    else if (cashMonths >= 1) cashPositionScore = 6;
    else if (cashMonths > 0) cashPositionScore = 3;
    else cashPositionScore = 0;
    
    // Total Health Score
    const healthScore = Math.round(profitabilityScore + runwayScore + coverageScore + burnEfficiencyScore + cashPositionScore);
    
    // Health Score Grade
    let healthGrade = 'F';
    let healthStatus = 'Critical';
    if (healthScore >= 90) { healthGrade = 'A+'; healthStatus = 'Excellent'; }
    else if (healthScore >= 80) { healthGrade = 'A'; healthStatus = 'Very Good'; }
    else if (healthScore >= 70) { healthGrade = 'B+'; healthStatus = 'Good'; }
    else if (healthScore >= 60) { healthGrade = 'B'; healthStatus = 'Fair'; }
    else if (healthScore >= 50) { healthGrade = 'C'; healthStatus = 'Average'; }
    else if (healthScore >= 40) { healthGrade = 'D'; healthStatus = 'Below Average'; }
    else if (healthScore >= 25) { healthGrade = 'E'; healthStatus = 'Poor'; }
    else { healthGrade = 'F'; healthStatus = 'Critical'; }
    
    return {
      cashAvailable,
      monthlyBurnRate,
      runway: Math.max(0, runway),
      monthsOfData,
      healthScore,
      healthGrade,
      healthStatus,
      // Breakdown for tooltip
      scoreBreakdown: {
        profitabilityScore,
        runwayScore,
        coverageScore,
        burnEfficiencyScore,
        cashPositionScore,
        profitMargin: profitMargin.toFixed(1),
        coverageRatio: coverageRatio.toFixed(2),
        burnRateRatio: burnRateRatio.toFixed(2)
      }
    };
  }, [metrics.totalRevenue, metrics.totalExpenses, metrics.netProfit, metrics.transactions]);

  // Generate bar chart data for expenses over time
  const expenseBarData = useMemo(() => {
    if (!metrics.debitTransactions || metrics.debitTransactions.length === 0) return { overall: [], recurring: [], nonRecurring: [] };

    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      // Try different date formats
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        const p0 = parseInt(parts[0]);
        const p1 = parseInt(parts[1]);
        const p2 = parseInt(parts[2]);
        
        // Detect YYYY-MM-DD format (first part is 4 digits or > 31)
        if (p0 > 31 || parts[0].length === 4) {
          // YYYY-MM-DD format
          return new Date(p0, p1 - 1, p2);
        } else {
          // DD/MM/YYYY or DD-MM-YYYY format
          const fullYear = p2 < 100 ? (p2 > 50 ? 1900 + p2 : 2000 + p2) : p2;
          return new Date(fullYear, p1 - 1, p0);
        }
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

    // Group transactions with date tracking for proper sorting
    const overallMap = new Map();
    const recurringMap = new Map();
    const nonRecurringMap = new Map();
    const dateTracker = new Map(); // To store actual dates for sorting

    const recurringKeywords = [
      'subscription', 'monthly', 'rent', 'salary', 'wages', 'insurance', 'emi', 'loan',
      'internet', 'phone', 'utility', 'electric', 'water', 'gas', 'netflix', 'spotify',
      'amazon prime', 'swiggy', 'zomato', 'uber', 'ola', 'gym', 'membership', 'premium'
    ];

    // Count vendor occurrences for recurring detection
    const vendorCount = new Map();
    metrics.debitTransactions.forEach(txn => {
      const description = (txn.description || txn.particulars || '').toLowerCase();
      const vendorKey = description.split('/').slice(0, 3).join('/').substring(0, 50);
      vendorCount.set(vendorKey, (vendorCount.get(vendorKey) || 0) + 1);
    });

    metrics.debitTransactions.forEach(txn => {
      const date = parseDate(txn.date);
      if (!date || isNaN(date.getTime())) return;

      const key = expenseViewMode === 'weekly' ? getWeekKey(date) : getMonthKey(date);
      const amount = Math.abs(txn.amount || 0);

      // Track the date for proper sorting (use first of month for monthly view)
      if (!dateTracker.has(key)) {
        if (expenseViewMode === 'monthly') {
          dateTracker.set(key, new Date(date.getFullYear(), date.getMonth(), 1).getTime());
        } else {
          dateTracker.set(key, date.getTime());
        }
      }

      // Overall
      overallMap.set(key, (overallMap.get(key) || 0) + amount);

      // Check if recurring by keywords OR repeated vendor
      const description = (txn.description || txn.particulars || '').toLowerCase();
      const category = (txn.category?.category || '').toLowerCase();
      const vendorKey = description.split('/').slice(0, 3).join('/').substring(0, 50);
      
      const hasRecurringKeyword = recurringKeywords.some(keyword => 
        description.includes(keyword) || category.includes(keyword)
      );
      const isRepeatedVendor = (vendorCount.get(vendorKey) || 0) >= 2;

      if (hasRecurringKeyword || isRepeatedVendor) {
        recurringMap.set(key, (recurringMap.get(key) || 0) + amount);
      } else {
        nonRecurringMap.set(key, (nonRecurringMap.get(key) || 0) + amount);
      }
    });

    // Sort keys chronologically using actual dates
    const sortedKeys = Array.from(overallMap.keys()).sort((a, b) => {
      return (dateTracker.get(a) || 0) - (dateTracker.get(b) || 0);
    });

    return {
      overall: sortedKeys.map(key => ({ name: key, amount: overallMap.get(key) || 0 })),
      recurring: sortedKeys.map(key => ({ name: key, amount: recurringMap.get(key) || 0 })),
      nonRecurring: sortedKeys.map(key => ({ name: key, amount: nonRecurringMap.get(key) || 0 }))
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

  // Classify revenue as recurring vs non-recurring
  const classifyRevenue = useMemo(() => {
    if (!metrics.creditTransactions || metrics.creditTransactions.length === 0) {
      return { recurring: [], nonRecurring: [], recurringTotal: 0, nonRecurringTotal: 0 };
    }

    // Keywords that indicate recurring revenue
    const recurringKeywords = [
      'salary', 'wages', 'monthly', 'subscription', 'rental', 'rent', 'interest',
      'dividend', 'pension', 'retainer', 'recurring', 'regular', 'fixed', 'emi',
      'installment', 'lease', 'royalty', 'commission', 'auto-credit', 'standing instruction'
    ];

    // First pass: count how many times each vendor/source appears
    const vendorCount = new Map();
    metrics.creditTransactions.forEach(txn => {
      const description = (txn.description || txn.particulars || '').toLowerCase();
      // Extract key part of description (first 30 chars or before common separators)
      const vendorKey = description.split('/').slice(0, 3).join('/').substring(0, 50);
      vendorCount.set(vendorKey, (vendorCount.get(vendorKey) || 0) + 1);
    });

    const recurring = [];
    const nonRecurring = [];

    metrics.creditTransactions.forEach(txn => {
      const description = (txn.description || txn.particulars || '').toLowerCase();
      const category = (txn.category?.category || '').toLowerCase();
      const vendorKey = description.split('/').slice(0, 3).join('/').substring(0, 50);
      
      // Check if recurring by keywords OR if same vendor appears 2+ times
      const hasRecurringKeyword = recurringKeywords.some(keyword => 
        description.includes(keyword) || category.includes(keyword)
      );
      const isRepeatedVendor = (vendorCount.get(vendorKey) || 0) >= 2;

      if (hasRecurringKeyword || isRepeatedVendor) {
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
  }, [metrics.creditTransactions]);

  // Generate bar chart data for revenue over time
  const revenueBarData = useMemo(() => {
    if (!metrics.creditTransactions || metrics.creditTransactions.length === 0) return { overall: [], recurring: [], nonRecurring: [] };

    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        const p0 = parseInt(parts[0]);
        const p1 = parseInt(parts[1]);
        const p2 = parseInt(parts[2]);
        
        // Detect YYYY-MM-DD format (first part is 4 digits or > 31)
        if (p0 > 31 || parts[0].length === 4) {
          // YYYY-MM-DD format
          return new Date(p0, p1 - 1, p2);
        } else {
          // DD/MM/YYYY or DD-MM-YYYY format
          const fullYear = p2 < 100 ? (p2 > 50 ? 1900 + p2 : 2000 + p2) : p2;
          return new Date(fullYear, p1 - 1, p0);
        }
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

    const overallMap = new Map();
    const recurringMap = new Map();
    const nonRecurringMap = new Map();
    const dateTracker = new Map();

    const recurringKeywords = [
      'salary', 'wages', 'monthly', 'subscription', 'rental', 'rent', 'interest',
      'dividend', 'pension', 'retainer', 'recurring', 'regular', 'fixed'
    ];

    // Count vendor occurrences for recurring detection
    const vendorCount = new Map();
    metrics.creditTransactions.forEach(txn => {
      const description = (txn.description || txn.particulars || '').toLowerCase();
      const vendorKey = description.split('/').slice(0, 3).join('/').substring(0, 50);
      vendorCount.set(vendorKey, (vendorCount.get(vendorKey) || 0) + 1);
    });

    metrics.creditTransactions.forEach(txn => {
      const date = parseDate(txn.date);
      if (!date || isNaN(date.getTime())) return;

      const key = revenueViewMode === 'weekly' ? getWeekKey(date) : getMonthKey(date);
      const amount = Math.abs(txn.amount || 0);

      if (!dateTracker.has(key)) {
        if (revenueViewMode === 'monthly') {
          dateTracker.set(key, new Date(date.getFullYear(), date.getMonth(), 1).getTime());
        } else {
          dateTracker.set(key, date.getTime());
        }
      }

      overallMap.set(key, (overallMap.get(key) || 0) + amount);

      const description = (txn.description || txn.particulars || '').toLowerCase();
      const category = (txn.category?.category || '').toLowerCase();
      const vendorKey = description.split('/').slice(0, 3).join('/').substring(0, 50);
      
      const hasRecurringKeyword = recurringKeywords.some(keyword => 
        description.includes(keyword) || category.includes(keyword)
      );
      const isRepeatedVendor = (vendorCount.get(vendorKey) || 0) >= 2;

      if (hasRecurringKeyword || isRepeatedVendor) {
        recurringMap.set(key, (recurringMap.get(key) || 0) + amount);
      } else {
        nonRecurringMap.set(key, (nonRecurringMap.get(key) || 0) + amount);
      }
    });

    const sortedKeys = Array.from(overallMap.keys()).sort((a, b) => {
      return (dateTracker.get(a) || 0) - (dateTracker.get(b) || 0);
    });

    return {
      overall: sortedKeys.map(key => ({ name: key, amount: overallMap.get(key) || 0 })),
      recurring: sortedKeys.map(key => ({ name: key, amount: recurringMap.get(key) || 0 })),
      nonRecurring: sortedKeys.map(key => ({ name: key, amount: nonRecurringMap.get(key) || 0 }))
    };
  }, [metrics.creditTransactions, revenueViewMode]);

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

  // Handle expense category click to get vendor suggestions
  const handleExpenseCategoryForSuggestions = async (category, transactions) => {
    setSelectedExpenseCategory({ category, transactions });
    setLoadingVendorSuggestions(true);
    
    // Extract actual vendors from transactions
    const vendorAnalysis = analyzeTransactionVendors(transactions);
    
    // Generate AI-powered vendor suggestions based on actual transaction vendors
    const suggestions = generateSmartVendorAlternatives(vendorAnalysis, category);
    
    setTimeout(() => {
      setVendorSuggestions(suggestions);
      setLoadingVendorSuggestions(false);
    }, 1000);
  };

  // Analyze transactions to extract vendor names
  const analyzeTransactionVendors = (transactions) => {
    const vendorMap = {};
    
    transactions.forEach(txn => {
      const description = (txn.description || txn.particulars || '').toLowerCase();
      
      // Extract vendor name from description
      const vendor = extractVendorName(description);
      if (vendor) {
        if (!vendorMap[vendor.name]) {
          vendorMap[vendor.name] = {
            name: vendor.name,
            displayName: vendor.displayName,
            type: vendor.type,
            count: 0,
            total: 0,
            transactions: []
          };
        }
        vendorMap[vendor.name].count++;
        vendorMap[vendor.name].total += Math.abs(txn.amount || 0);
        vendorMap[vendor.name].transactions.push(txn);
      }
    });
    
    // Sort by total spent
    return Object.values(vendorMap).sort((a, b) => b.total - a.total);
  };

  // Extract vendor name from transaction description
  const extractVendorName = (description) => {
    const vendorPatterns = [
      // Food Delivery
      { pattern: /swiggy/i, name: 'swiggy', displayName: 'Swiggy', type: 'food_delivery' },
      { pattern: /zomato/i, name: 'zomato', displayName: 'Zomato', type: 'food_delivery' },
      { pattern: /uber\s*eats/i, name: 'ubereats', displayName: 'Uber Eats', type: 'food_delivery' },
      { pattern: /dunzo/i, name: 'dunzo', displayName: 'Dunzo', type: 'food_delivery' },
      { pattern: /eatsure/i, name: 'eatsure', displayName: 'EatSure', type: 'food_delivery' },
      
      // E-commerce
      { pattern: /amazon/i, name: 'amazon', displayName: 'Amazon', type: 'ecommerce' },
      { pattern: /flipkart/i, name: 'flipkart', displayName: 'Flipkart', type: 'ecommerce' },
      { pattern: /myntra/i, name: 'myntra', displayName: 'Myntra', type: 'ecommerce' },
      { pattern: /meesho/i, name: 'meesho', displayName: 'Meesho', type: 'ecommerce' },
      { pattern: /ajio/i, name: 'ajio', displayName: 'AJIO', type: 'ecommerce' },
      { pattern: /nykaa/i, name: 'nykaa', displayName: 'Nykaa', type: 'ecommerce' },
      
      // Cab/Transport
      { pattern: /uber/i, name: 'uber', displayName: 'Uber', type: 'transport' },
      { pattern: /ola/i, name: 'ola', displayName: 'Ola', type: 'transport' },
      { pattern: /rapido/i, name: 'rapido', displayName: 'Rapido', type: 'transport' },
      { pattern: /meru/i, name: 'meru', displayName: 'Meru Cabs', type: 'transport' },
      
      // Cloud/Software
      { pattern: /aws|amazon\s*web/i, name: 'aws', displayName: 'AWS', type: 'cloud' },
      { pattern: /google\s*cloud|gcp/i, name: 'gcp', displayName: 'Google Cloud', type: 'cloud' },
      { pattern: /azure|microsoft\s*cloud/i, name: 'azure', displayName: 'Azure', type: 'cloud' },
      { pattern: /digitalocean/i, name: 'digitalocean', displayName: 'DigitalOcean', type: 'cloud' },
      
      // Subscriptions
      { pattern: /netflix/i, name: 'netflix', displayName: 'Netflix', type: 'streaming' },
      { pattern: /spotify/i, name: 'spotify', displayName: 'Spotify', type: 'streaming' },
      { pattern: /hotstar|disney/i, name: 'hotstar', displayName: 'Disney+ Hotstar', type: 'streaming' },
      { pattern: /prime\s*video/i, name: 'primevideo', displayName: 'Prime Video', type: 'streaming' },
      { pattern: /youtube\s*premium/i, name: 'youtube', displayName: 'YouTube Premium', type: 'streaming' },
      
      // Groceries
      { pattern: /bigbasket/i, name: 'bigbasket', displayName: 'BigBasket', type: 'grocery' },
      { pattern: /blinkit|grofers/i, name: 'blinkit', displayName: 'Blinkit', type: 'grocery' },
      { pattern: /zepto/i, name: 'zepto', displayName: 'Zepto', type: 'grocery' },
      { pattern: /instamart/i, name: 'instamart', displayName: 'Swiggy Instamart', type: 'grocery' },
      { pattern: /dmart/i, name: 'dmart', displayName: 'DMart', type: 'grocery' },
      
      // Travel
      { pattern: /makemytrip|mmt/i, name: 'makemytrip', displayName: 'MakeMyTrip', type: 'travel' },
      { pattern: /goibibo/i, name: 'goibibo', displayName: 'Goibibo', type: 'travel' },
      { pattern: /cleartrip/i, name: 'cleartrip', displayName: 'Cleartrip', type: 'travel' },
      { pattern: /yatra/i, name: 'yatra', displayName: 'Yatra', type: 'travel' },
      { pattern: /ixigo/i, name: 'ixigo', displayName: 'ixigo', type: 'travel' },
      
      // Payments/Recharges
      { pattern: /paytm/i, name: 'paytm', displayName: 'Paytm', type: 'payments' },
      { pattern: /phonepe/i, name: 'phonepe', displayName: 'PhonePe', type: 'payments' },
      { pattern: /gpay|google\s*pay/i, name: 'gpay', displayName: 'Google Pay', type: 'payments' },
      
      // Food Chains
      { pattern: /mcdonald|mcd/i, name: 'mcdonalds', displayName: "McDonald's", type: 'restaurant' },
      { pattern: /domino/i, name: 'dominos', displayName: "Domino's", type: 'restaurant' },
      { pattern: /pizza\s*hut/i, name: 'pizzahut', displayName: 'Pizza Hut', type: 'restaurant' },
      { pattern: /kfc/i, name: 'kfc', displayName: 'KFC', type: 'restaurant' },
      { pattern: /burger\s*king/i, name: 'burgerking', displayName: 'Burger King', type: 'restaurant' },
      { pattern: /starbucks/i, name: 'starbucks', displayName: 'Starbucks', type: 'restaurant' },
      { pattern: /cafe\s*coffee\s*day|ccd/i, name: 'ccd', displayName: 'Cafe Coffee Day', type: 'restaurant' },
      
      // Office/Stationery
      { pattern: /staples/i, name: 'staples', displayName: 'Staples', type: 'office' },
      { pattern: /officedepot/i, name: 'officedepot', displayName: 'Office Depot', type: 'office' },
    ];
    
    for (const { pattern, name, displayName, type } of vendorPatterns) {
      if (pattern.test(description)) {
        return { name, displayName, type };
      }
    }
    
    return null;
  };

  // Generate smart vendor alternatives based on actual vendors found
  const generateSmartVendorAlternatives = (vendorAnalysis, category) => {
    // Database of vendor alternatives with specific reasons
    const vendorAlternatives = {
      // Food Delivery Alternatives
      swiggy: [
        { vendor: 'Zomato', savings: '10-15%', reason: 'Often has better coupons and Zomato Pro offers 40% off on select restaurants. Check for restaurant-specific deals.' },
        { vendor: 'EatSure (by Rebel Foods)', savings: '15-20%', reason: 'Multi-brand cloud kitchen with consistent quality. Combo meals are 15-20% cheaper than individual orders.' },
        { vendor: 'Direct Restaurant Apps', savings: '20-30%', reason: 'Order directly from restaurant apps (Dominos, McD) to avoid platform fees of ₹30-50 per order.' },
        { vendor: 'ONDC Apps (Magicpin, Paytm)', savings: '15-25%', reason: 'Government-backed ONDC network has lower commission = lower prices. Same restaurants, better deals.' },
        { vendor: 'Continue with Swiggy', savings: '5-10%', reason: 'If you have Swiggy One membership, stick with it. Use Swiggy Money wallet for extra 10% cashback.', isCurrent: true }
      ],
      zomato: [
        { vendor: 'Swiggy', savings: '10-15%', reason: 'Compare prices for the same restaurant. Swiggy often has different offers and lower delivery fees in some areas.' },
        { vendor: 'EatSure (by Rebel Foods)', savings: '15-20%', reason: 'Behrouz Biryani, Faasos, Oven Story all in one app with better combo pricing than Zomato.' },
        { vendor: 'Direct Restaurant Apps', savings: '20-30%', reason: 'Skip platform commission. Pizza chains and QSRs offer exclusive app-only discounts.' },
        { vendor: 'ONDC Apps (Magicpin)', savings: '15-25%', reason: 'Same restaurants listed on ONDC at lower prices due to reduced platform fees.' },
        { vendor: 'Continue with Zomato', savings: '5-10%', reason: 'Maximize Zomato Pro/Gold membership. Stack offers with bank cards for up to 25% savings.', isCurrent: true }
      ],
      
      // E-commerce Alternatives
      amazon: [
        { vendor: 'Flipkart', savings: '5-15%', reason: 'Compare prices - Flipkart often beats Amazon during Big Billion Days. SuperCoins give extra 5% value.' },
        { vendor: 'Meesho', savings: '20-40%', reason: 'Direct from manufacturers/resellers. Great for bulk office supplies and non-branded items.' },
        { vendor: 'IndiaMart/Alibaba', savings: '30-50%', reason: 'For bulk B2B purchases, wholesale prices are 30-50% lower. Minimum order quantities apply.' },
        { vendor: 'Local Wholesale Markets', savings: '25-35%', reason: 'For office supplies, electronics - local markets avoid shipping and platform fees.' },
        { vendor: 'Continue with Amazon', savings: '5-10%', reason: 'Amazon Business offers GST invoicing and bulk discounts. Prime saves on shipping costs.', isCurrent: true }
      ],
      flipkart: [
        { vendor: 'Amazon', savings: '5-15%', reason: 'Price match and compare. Amazon often has better deals on electronics and faster delivery.' },
        { vendor: 'Meesho', savings: '20-40%', reason: 'Significantly cheaper for fashion, home items. Quality varies but returns are free.' },
        { vendor: 'Croma/Reliance Digital', savings: '10-15%', reason: 'For electronics, physical stores offer price matching plus instant exchange and warranty.' },
        { vendor: 'Brand Direct Websites', savings: '15-25%', reason: 'Buy directly from brand websites during sales - avoid marketplace commissions.' },
        { vendor: 'Continue with Flipkart', savings: '5-10%', reason: 'Flipkart Plus membership and Axis Bank cards give additional 5-10% off.', isCurrent: true }
      ],
      
      // Transport Alternatives
      uber: [
        { vendor: 'Ola', savings: '10-20%', reason: 'Compare prices for the same route. Ola often has lower surge pricing and better offers in tier-2 cities.' },
        { vendor: 'Rapido (Bike/Auto)', savings: '40-60%', reason: 'For solo travel, Rapido bike taxis cost 40-60% less. Auto option is still 20% cheaper than cabs.' },
        { vendor: 'BluSmart (EV Cabs)', savings: '15-20%', reason: 'Fixed pricing, no surge. Electric cabs are 15-20% cheaper and eco-friendly. Available in Delhi/Bangalore.' },
        { vendor: 'Metro + Last Mile', savings: '50-70%', reason: 'Metro + auto/Rapido for last mile saves 50-70% on daily commute. Consider monthly metro pass.' },
        { vendor: 'Continue with Uber', savings: '5-10%', reason: 'Use Uber Pass for 15% off. Schedule rides in advance to avoid surge pricing.', isCurrent: true }
      ],
      ola: [
        { vendor: 'Uber', savings: '10-20%', reason: 'Compare real-time prices. Uber often has better airport pricing and international consistency.' },
        { vendor: 'Rapido', savings: '40-60%', reason: 'Bike taxis are significantly cheaper for short distances. Auto option available in most cities.' },
        { vendor: 'BluSmart', savings: '15-20%', reason: 'No surge pricing ever. Clean EV cabs with transparent pricing. Expanding to more cities.' },
        { vendor: 'Namma Yatri/Other Local', savings: '20-30%', reason: 'Driver-friendly apps charge zero commission = lower fares passed to you.' },
        { vendor: 'Continue with Ola', savings: '5-10%', reason: 'Ola Select membership offers priority booking and discounts on every ride.', isCurrent: true }
      ],
      
      // Cloud Services Alternatives
      aws: [
        { vendor: 'Google Cloud (GCP)', savings: '20-30%', reason: 'GCP offers sustained use discounts automatically. BigQuery is cheaper for analytics workloads.' },
        { vendor: 'DigitalOcean', savings: '40-60%', reason: 'For startups and small workloads, DO is 40-60% cheaper with simpler pricing. Great for MVPs.' },
        { vendor: 'Linode/Vultr', savings: '30-50%', reason: 'Straightforward VPS pricing without complex billing. Good for predictable workloads.' },
        { vendor: 'Reserved Instances', savings: '30-40%', reason: 'Commit to 1-3 year reserved instances on AWS itself for up to 72% savings vs on-demand.' },
        { vendor: 'Continue with AWS', savings: '20-30%', reason: 'Use AWS Cost Explorer to rightsize instances. Spot instances can save 60-90% for flexible workloads.', isCurrent: true }
      ],
      
      // Streaming Alternatives
      netflix: [
        { vendor: 'Amazon Prime Video', savings: '30-40%', reason: 'Prime membership includes video + shopping benefits. ₹1499/year vs Netflix ₹649/month.' },
        { vendor: 'Disney+ Hotstar', savings: '40-50%', reason: 'At ₹299/month, includes sports + Disney + Star content. Annual plan even cheaper.' },
        { vendor: 'YouTube Premium', savings: '20-30%', reason: 'Includes ad-free YouTube + YouTube Music. Great if you watch a lot of YouTube content.' },
        { vendor: 'JioCinema', savings: '60-80%', reason: 'Free with Jio, premium at ₹29/month. Has sports, HBO content, and originals.' },
        { vendor: 'Continue with Netflix', savings: '10-15%', reason: 'Share with family (4 screens) to split cost. Mobile-only plan at ₹149 if you watch on phone.', isCurrent: true }
      ],
      
      // Grocery Alternatives
      bigbasket: [
        { vendor: 'Zepto/Blinkit', savings: '5-10%', reason: 'Quick commerce apps often have better deals on daily essentials. Compare prices for your regular items.' },
        { vendor: 'DMart Ready', savings: '15-25%', reason: 'DMart prices are consistently 15-25% lower. Order online for pickup or delivery in select areas.' },
        { vendor: 'JioMart', savings: '10-20%', reason: 'Reliance retail pricing with extra discounts for Jio users. Good for monthly grocery stock-up.' },
        { vendor: 'Local Kirana + Dunzo', savings: '10-15%', reason: 'Local shops often match online prices minus delivery fees. Build a relationship for credit terms.' },
        { vendor: 'Continue with BigBasket', savings: '5-10%', reason: 'BB Star membership gives free delivery + extra discounts. Smart Basket for recurring items.', isCurrent: true }
      ],
      
      // Travel Alternatives  
      makemytrip: [
        { vendor: 'Direct Airline/Hotel Booking', savings: '10-20%', reason: 'Book directly on airline websites for same price + better cancellation policies + loyalty points.' },
        { vendor: 'ixigo/Confirmtkt', savings: '5-15%', reason: 'Train bookings show all options including Tatkal tips. Flight price predictions help time bookings.' },
        { vendor: 'Google Flights', savings: '10-25%', reason: 'Price tracking alerts for cheapest days. Often finds OTA prices lower than direct booking.' },
        { vendor: 'Corporate Travel Desk', savings: '15-30%', reason: 'If your company has a travel desk, use it for negotiated corporate rates and GST benefits.' },
        { vendor: 'Continue with MakeMyTrip', savings: '5-10%', reason: 'MyBiz for business travel has GST invoicing. Stack ICICI card offers for up to 12% off.', isCurrent: true }
      ]
    };
    
    // If we found specific vendors in transactions, get alternatives for the top vendor
    if (vendorAnalysis.length > 0) {
      const topVendor = vendorAnalysis[0];
      const alternatives = vendorAlternatives[topVendor.name];
      
      if (alternatives) {
        return alternatives.map((alt, index) => ({
          ...alt,
          id: index + 1,
          currentVendor: topVendor.displayName,
          currentSpend: formatCurrency(topVendor.total / topVendor.count),
          totalSpent: formatCurrency(topVendor.total),
          transactionCount: topVendor.count,
          potentialSavings: formatCurrency((topVendor.total * parseInt(alt.savings) / 100))
        }));
      }
    }
    
    // Fallback: Generic category-based suggestions
    const genericSuggestions = getGenericCategorySuggestions(category);
    const totalSpent = vendorAnalysis.reduce((sum, v) => sum + v.total, 0) || 10000;
    
    return genericSuggestions.map((sugg, index) => ({
      ...sugg,
      id: index + 1,
      currentVendor: 'Multiple Vendors',
      currentSpend: formatCurrency(totalSpent / Math.max(vendorAnalysis.length, 1)),
      totalSpent: formatCurrency(totalSpent),
      transactionCount: vendorAnalysis.reduce((sum, v) => sum + v.count, 0),
      potentialSavings: formatCurrency(totalSpent * parseInt(sugg.savings) / 100)
    }));
  };

  // Generic category suggestions when no specific vendor is detected
  const getGenericCategorySuggestions = (category) => {
    const categoryMap = {
      'Food & Entertainment': [
        { vendor: 'Compare Swiggy vs Zomato', savings: '10-15%', reason: 'Always compare prices on both apps before ordering. Use browser extensions like CashKaro for extra cashback.' },
        { vendor: 'Restaurant Direct Apps', savings: '20-30%', reason: 'Major chains like Dominos, McD, Pizza Hut offer exclusive app discounts not available on aggregators.' },
        { vendor: 'Corporate Food Cards', savings: '20-30%', reason: 'Sodexo/Ticket Restaurant cards are tax-free up to ₹50/meal. Significant tax savings.' },
        { vendor: 'ONDC-based Apps', savings: '15-25%', reason: 'Magicpin, Paytm Food use ONDC - lower commissions mean lower prices for same restaurants.' },
        { vendor: 'Meal Subscriptions', savings: '25-35%', reason: 'Services like Box8 XL, Lunchbox offer weekly meal plans at 25-35% less than daily orders.' }
      ],
      'Travel & Transportation': [
        { vendor: 'Compare All Platforms', savings: '10-20%', reason: 'Use Skyscanner, Google Flights to compare across MMT, Goibibo, Cleartrip before booking.' },
        { vendor: 'Book in Advance', savings: '20-40%', reason: 'Flight prices are lowest 3-6 weeks before travel. Set price alerts to book at the right time.' },
        { vendor: 'Corporate Travel Account', savings: '15-30%', reason: 'Set up a corporate account for negotiated rates, GST invoicing, and centralized expense tracking.' },
        { vendor: 'Ride-sharing/Carpooling', savings: '30-50%', reason: 'QuickRide, sRide for daily commute. Share cabs with colleagues going the same way.' },
        { vendor: 'Public Transport + Last Mile', savings: '50-70%', reason: 'Metro/bus pass + Rapido/auto for last mile is 50-70% cheaper than door-to-door cabs.' }
      ],
      'Office Supplies': [
        { vendor: 'Amazon Business', savings: '15-25%', reason: 'GST invoicing, bulk discounts, and quantity-based pricing. Register for free business account.' },
        { vendor: 'IndiaMART Wholesale', savings: '30-50%', reason: 'Buy directly from manufacturers for items like paper, stationery, cleaning supplies.' },
        { vendor: 'Local Wholesale Markets', savings: '25-40%', reason: 'Chandni Chowk, Crawford Market equivalents in your city for bulk purchases without GST sometimes.' },
        { vendor: 'Quarterly Bulk Orders', savings: '15-25%', reason: 'Instead of ordering as needed, do quarterly bulk orders to negotiate better prices and save shipping.' },
        { vendor: 'Refurbished/Second-hand', savings: '40-60%', reason: 'For furniture, electronics - certified refurbished products from Cashify, certified retailers.' }
      ],
      'default': [
        { vendor: 'Bulk Purchasing', savings: '15-25%', reason: 'Consolidate orders and buy in bulk to negotiate better rates with existing vendors.' },
        { vendor: 'Vendor Comparison', savings: '10-20%', reason: 'Get quotes from 3-4 vendors before any significant purchase. Competition drives prices down.' },
        { vendor: 'Annual Contracts', savings: '15-30%', reason: 'Convert recurring purchases to annual contracts for volume discounts and price locks.' },
        { vendor: 'Digital Alternatives', savings: '20-40%', reason: 'Replace physical products with digital alternatives where possible - subscriptions, cloud storage, etc.' },
        { vendor: 'Review & Negotiate', savings: '10-15%', reason: 'Regularly review vendor performance and renegotiate terms. Loyalty should earn you better rates.' }
      ]
    };
    
    return categoryMap[category] || categoryMap['default'];
  };

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'revenue', label: 'Revenue', icon: TrendingUp },
    { id: 'expense', label: 'Expense', icon: ArrowDownRight },
    { id: 'invoice', label: 'Invoice Generation', icon: Receipt },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className={`professional-dashboard ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* Professional Header */}
      <header className="dashboard-header">
        <div className="header-brand">
          {/* Logo moved to sidebar */}
        </div>

        <div className="header-actions">
          {/* Dark Mode Toggle */}
          <button 
            className="action-button theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="action-icon" /> : <Moon className="action-icon" />}
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
        {/* Professional Sidebar - Collapsible */}
        <aside 
          className="dashboard-sidebar"
          style={{
            width: sidebarCollapsed ? '70px' : '260px',
            minWidth: sidebarCollapsed ? '70px' : '260px',
            transition: 'width 0.3s ease, min-width 0.3s ease'
          }}
        >
          {/* Sidebar Header with Logo and Collapse Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            padding: sidebarCollapsed ? '12px 8px' : '12px 16px',
            borderBottom: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0'
          }}>
            {/* Logo and Brand */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              overflow: 'hidden'
            }}>
              <img 
                src={darkMode ? LogoDark : LogoLight} 
                alt="Nebulaa Logo" 
                style={{
                  width: '36px',
                  height: '36px',
                  objectFit: 'contain',
                  flexShrink: 0
                }}
              />
              {!sidebarCollapsed && (
                <div style={{ whiteSpace: 'nowrap' }}>
                  <h1 style={{ 
                    fontSize: '18px', 
                    fontWeight: '700', 
                    color: darkMode ? '#ededed' : '#1e293b',
                    margin: 0,
                    lineHeight: 1.2
                  }}>Nebulaa</h1>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#ffcc29',
                    letterSpacing: '0.5px'
                  }}>InFINity</span>
                </div>
              )}
            </div>

            {/* Collapse Toggle Button */}
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: 'none',
                  background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: darkMode ? '#8b949e' : '#64748b',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                title="Collapse Sidebar"
              >
                <PanelLeftClose size={16} />
              </button>
            )}
          </div>

          {/* Expand button when collapsed - shown below logo */}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              style={{
                width: '32px',
                height: '32px',
                margin: '12px auto',
                borderRadius: '6px',
                border: 'none',
                background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: darkMode ? '#8b949e' : '#64748b',
                transition: 'all 0.2s ease'
              }}
              title="Expand Sidebar"
            >
              <PanelLeft size={16} />
            </button>
          )}

          <nav className="sidebar-navigation" style={{ padding: sidebarCollapsed ? '12px 8px' : '16px' }}>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-button ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    padding: sidebarCollapsed ? '12px' : '12px 16px'
                  }}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <Icon className="nav-icon" />
                  {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
                  {activeTab === item.id && !sidebarCollapsed && <div className="active-indicator" />}
                </button>
              );
            })}
          </nav>
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
                          overflow: 'visible',
                          zIndex: expenseDropdownOpen ? 999 : 1
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

                        {/* Expense Dropdown */}
                        <div 
                          className="expense-dropdown"
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: '0',
                            right: '0',
                            marginTop: '8px',
                            background: darkMode ? '#0d1117' : '#ffffff',
                            borderRadius: '12px',
                            boxShadow: darkMode ? '0 20px 40px rgba(0,0,0,0.4)' : '0 20px 40px rgba(0,0,0,0.15)',
                            border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                            padding: '8px',
                            zIndex: 999,
                            opacity: expenseDropdownOpen ? 1 : 0,
                            transform: expenseDropdownOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
                            pointerEvents: expenseDropdownOpen ? 'auto' : 'none',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        >
                          <div 
                            onClick={() => { setExpenseModalType('recurring'); setExpenseDropdownOpen(false); }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              background: '#fef2f2',
                              borderRadius: '8px',
                              marginBottom: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#fef2f2'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Repeat size={16} style={{ color: '#dc2626' }} />
                              <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>Recurring</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>
                                {formatCurrency(classifyExpenses.recurringTotal)}
                              </span>
                              <ChevronRight size={14} style={{ color: '#94a3b8' }} />
                            </div>
                          </div>
                          
                          <div 
                            onClick={() => { setExpenseModalType('non-recurring'); setExpenseDropdownOpen(false); }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              background: '#fff7ed',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#ffedd5'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#fff7ed'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Shuffle size={16} style={{ color: '#ea580c' }} />
                              <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>Non-Recurring</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '14px', fontWeight: '600', color: '#ea580c' }}>
                                {formatCurrency(classifyExpenses.nonRecurringTotal)}
                              </span>
                              <ChevronRight size={14} style={{ color: '#94a3b8' }} />
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
                          <div className="metric-icon">
                            <PieChartIcon size={24} />
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

                    {/* Financial Health Metrics - Second Row */}
                    <div className="metrics-grid financial-health-grid" style={{ marginTop: '24px' }}>
                      {/* Total Cash Available Card */}
                      <div 
                        className={`metric-card cash ${isAnimating ? 'slide-up' : ''}`}
                        style={{
                          animationDelay: '500ms',
                          opacity: isAnimating ? 1 : 0,
                          transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="metric-header">
                          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' }}>
                            <Wallet style={{ color: '#0284c7' }} />
                          </div>
                          <div className="metric-trend">
                            <span className="trend-indicator" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                              <DollarSign className="trend-arrow" size={14} />
                              Cash
                            </span>
                          </div>
                        </div>
                        <div className="metric-content">
                          <h4 className="metric-title">
                            Total Cash Available
                            <button 
                              className="info-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(activeTooltip === 'cash' ? null : 'cash');
                              }}
                            >
                              <Info size={14} />
                            </button>
                            {activeTooltip === 'cash' && (
                              <div className="info-tooltip">
                                <button className="tooltip-close" onClick={() => setActiveTooltip(null)}>
                                  <X size={12} />
                                </button>
                                Net cash position (Revenue - Expenses)
                              </div>
                            )}
                          </h4>
                          <div className="metric-value" style={{ color: '#0284c7' }}>
                            {formatCurrency(financialHealth.cashAvailable)}
                          </div>
                        </div>
                      </div>

                      {/* Burn Rate Card */}
                      <div 
                        className={`metric-card burn ${isAnimating ? 'slide-up' : ''}`}
                        style={{
                          animationDelay: '600ms',
                          opacity: isAnimating ? 1 : 0,
                          transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="metric-header">
                          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
                            <Flame style={{ color: '#d97706' }} />
                          </div>
                          <div className="metric-trend">
                            <span className="trend-indicator" style={{ background: '#fef3c7', color: '#d97706' }}>
                              <TrendingUp className="trend-arrow" size={14} />
                              Monthly
                            </span>
                          </div>
                        </div>
                        <div className="metric-content">
                          <h4 className="metric-title">
                            Burn Rate
                            <button 
                              className="info-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(activeTooltip === 'burn' ? null : 'burn');
                              }}
                            >
                              <Info size={14} />
                            </button>
                            {activeTooltip === 'burn' && (
                              <div className="info-tooltip">
                                <button className="tooltip-close" onClick={() => setActiveTooltip(null)}>
                                  <X size={12} />
                                </button>
                                Average monthly spending rate
                              </div>
                            )}
                          </h4>
                          <div className="metric-value" style={{ color: '#d97706' }}>
                            {formatCurrency(financialHealth.monthlyBurnRate)}<span style={{ fontSize: '14px', fontWeight: '400', color: '#94a3b8' }}>/mo</span>
                          </div>
                        </div>
                      </div>

                      {/* Runway Card */}
                      <div 
                        className={`metric-card runway ${isAnimating ? 'slide-up' : ''}`}
                        style={{
                          animationDelay: '700ms',
                          opacity: isAnimating ? 1 : 0,
                          transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="metric-header">
                          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' }}>
                            <Clock style={{ color: '#9333ea' }} />
                          </div>
                          <div className="metric-trend">
                            <span className="trend-indicator" style={{ 
                              background: financialHealth.runway > 6 ? '#dcfce7' : financialHealth.runway > 3 ? '#fef3c7' : '#fee2e2', 
                              color: financialHealth.runway > 6 ? '#16a34a' : financialHealth.runway > 3 ? '#d97706' : '#dc2626' 
                            }}>
                              <Clock className="trend-arrow" size={14} />
                              {financialHealth.runway > 6 ? 'Healthy' : financialHealth.runway > 3 ? 'Caution' : 'Critical'}
                            </span>
                          </div>
                        </div>
                        <div className="metric-content">
                          <h4 className="metric-title">
                            Runway
                            <button 
                              className="info-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(activeTooltip === 'runway' ? null : 'runway');
                              }}
                            >
                              <Info size={14} />
                            </button>
                            {activeTooltip === 'runway' && (
                              <div className="info-tooltip">
                                <button className="tooltip-close" onClick={() => setActiveTooltip(null)}>
                                  <X size={12} />
                                </button>
                                Months until cash runs out at current burn rate
                              </div>
                            )}
                          </h4>
                          <div className="metric-value" style={{ color: '#9333ea' }}>
                            {financialHealth.runway.toFixed(1)}<span style={{ fontSize: '14px', fontWeight: '400', color: '#94a3b8' }}> months</span>
                          </div>
                        </div>
                      </div>

                      {/* Health Score Card */}
                      <div 
                        className={`metric-card healthscore ${isAnimating ? 'slide-up' : ''}`}
                        style={{
                          animationDelay: '800ms',
                          opacity: isAnimating ? 1 : 0,
                          transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="metric-header">
                          <div className="metric-icon" style={{ 
                            background: financialHealth.healthScore >= 70 
                              ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' 
                              : financialHealth.healthScore >= 50 
                                ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                                : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
                          }}>
                            <Activity style={{ 
                              color: financialHealth.healthScore >= 70 ? '#16a34a' : financialHealth.healthScore >= 50 ? '#d97706' : '#dc2626' 
                            }} />
                          </div>
                          <div className="metric-trend">
                            <span className="trend-indicator" style={{ 
                              background: financialHealth.healthScore >= 70 ? '#dcfce7' : financialHealth.healthScore >= 50 ? '#fef3c7' : '#fee2e2', 
                              color: financialHealth.healthScore >= 70 ? '#16a34a' : financialHealth.healthScore >= 50 ? '#d97706' : '#dc2626' 
                            }}>
                              <Activity className="trend-arrow" size={14} />
                              {financialHealth.healthGrade}
                            </span>
                          </div>
                        </div>
                        <div className="metric-content">
                          <h4 className="metric-title">
                            Health Score
                            <button 
                              className="info-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(activeTooltip === 'healthscore' ? null : 'healthscore');
                              }}
                            >
                              <Info size={14} />
                            </button>
                          </h4>
                          <div className="metric-value" style={{ 
                            color: financialHealth.healthScore >= 70 ? '#16a34a' : financialHealth.healthScore >= 50 ? '#d97706' : '#dc2626',
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '8px'
                          }}>
                            {financialHealth.healthScore}<span style={{ fontSize: '14px', fontWeight: '400', color: '#94a3b8' }}>/100</span>
                            <span style={{ 
                              fontSize: '12px', 
                              fontWeight: '500', 
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: financialHealth.healthScore >= 70 ? '#dcfce7' : financialHealth.healthScore >= 50 ? '#fef3c7' : '#fee2e2',
                              color: financialHealth.healthScore >= 70 ? '#16a34a' : financialHealth.healthScore >= 50 ? '#d97706' : '#dc2626'
                            }}>
                              {financialHealth.healthStatus}
                            </span>
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

          {/* Revenue Tab - Professional Dashboard Layout */}
          {activeTab === 'revenue' && (
            <div className="revenue-tab-content" onClick={() => { if (!revenuePieLegendLocked) setShowRevenuePieLegend(false); }}>
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
                        background: darkMode ? '#0d1117' : '#ffffff',
                        borderRadius: '20px',
                        padding: '28px',
                        boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
                        border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                        position: 'relative',
                        minHeight: '380px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: darkMode ? '#ededed' : '#1e293b', marginBottom: '24px' }}>
                        Revenue by Category
                      </h3>
                      
                      {/* Pie Chart */}
                      <div 
                        style={{ position: 'relative', width: '100%', height: '280px' }}
                        onMouseEnter={() => !revenuePieLegendLocked && setShowRevenuePieLegend(true)}
                        onMouseLeave={() => !revenuePieLegendLocked && setShowRevenuePieLegend(false)}
                        onClick={() => setRevenuePieLegendLocked(!revenuePieLegendLocked)}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={revenuePieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={110}
                              paddingAngle={3}
                              dataKey="value"
                              onMouseEnter={(_, index) => setHoveredRevenuePieIndex(index)}
                              onMouseLeave={() => setHoveredRevenuePieIndex(null)}
                            >
                              {revenuePieData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                                  stroke={hoveredRevenuePieIndex === index ? '#1e293b' : '#fff'}
                                  strokeWidth={hoveredRevenuePieIndex === index ? 3 : 2}
                                  style={{ 
                                    cursor: 'pointer',
                                    filter: hoveredRevenuePieIndex === index ? 'brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
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
                          <div style={{ fontSize: '22px', fontWeight: '800', color: '#22c55e' }}>
                            {formatCurrency(metrics.totalRevenue)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Total Revenue</div>
                        </div>

                        {/* Legend Overlay on Hover/Click */}
                        {showRevenuePieLegend && (
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
                              {revenuePieLegendLocked ? '🔒 Click anywhere to close' : '💡 Click to lock legend'}
                            </div>
                            {revenuePieData.map((item, index) => {
                              const total = revenuePieData.reduce((s, i) => s + i.value, 0);
                              const percent = ((item.value / total) * 100).toFixed(1);
                              return (
                                <div key={index} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  marginBottom: '6px',
                                  background: hoveredRevenuePieIndex === index ? '#f1f5f9' : 'transparent',
                                  transition: 'background 0.2s ease'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: CHART_COLORS[index % CHART_COLORS.length], boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div>
                                    <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>{item.name}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{formatCurrency(item.value)}</span>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#22c55e', background: '#f0fdf4', padding: '4px 8px', borderRadius: '6px' }}>{percent}%</span>
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

                    {/* TOP RIGHT: Overall Revenue Bar Chart */}
                    <div style={{
                      background: darkMode ? '#0d1117' : '#ffffff',
                      borderRadius: '20px',
                      padding: '28px',
                      boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
                      border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                      minHeight: '380px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: darkMode ? '#ededed' : '#1e293b', margin: 0 }}>
                          Overall Revenue
                        </h3>
                        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '12px', padding: '6px' }}>
                          <button 
                            onClick={() => setRevenueViewMode('weekly')}
                            style={{
                              padding: '10px 20px',
                              fontSize: '14px',
                              fontWeight: '600',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: revenueViewMode === 'weekly' ? 'white' : 'transparent',
                              color: revenueViewMode === 'weekly' ? '#1e293b' : '#64748b',
                              boxShadow: revenueViewMode === 'weekly' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                              transition: 'all 0.2s ease'
                            }}
                          >Weekly</button>
                          <button 
                            onClick={() => setRevenueViewMode('monthly')}
                            style={{
                              padding: '10px 20px',
                              fontSize: '14px',
                              fontWeight: '600',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: revenueViewMode === 'monthly' ? 'white' : 'transparent',
                              color: revenueViewMode === 'monthly' ? '#1e293b' : '#64748b',
                              boxShadow: revenueViewMode === 'monthly' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                              transition: 'all 0.2s ease'
                            }}
                          >Monthly</button>
                        </div>
                      </div>
                      <div style={{ flex: 1, minHeight: '280px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={revenueBarData.overall} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
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
                              formatter={(value) => [formatCurrency(value), 'Total Revenue']}
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
                              fill="#22c55e" 
                              radius={[8, 8, 0, 0]}
                              maxBarSize={60}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* BOTTOM LEFT: Non-Recurring Revenue */}
                    <div style={{
                      background: darkMode ? '#0d1117' : '#ffffff',
                      borderRadius: '20px',
                      padding: '28px',
                      boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
                      border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                      minHeight: '320px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '12px', 
                          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                        }}>
                          <Shuffle size={20} style={{ color: 'white' }} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: '700', color: darkMode ? '#ededed' : '#1e293b', margin: 0 }}>
                            Non-Recurring Revenue
                          </h3>
                          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>One-time income sources</p>
                        </div>
                      </div>
                      <div style={{ flex: 1, minHeight: '180px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={revenueBarData.nonRecurring} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
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
                              fill="#8b5cf6" 
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
                        background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', 
                        borderRadius: '12px',
                        border: '1px solid #ddd6fe'
                      }}>
                        <span style={{ fontSize: '14px', color: '#5b21b6', fontWeight: '500' }}>Total Non-Recurring</span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: '#7c3aed' }}>{formatCurrency(classifyRevenue.nonRecurringTotal)}</span>
                      </div>
                    </div>

                    {/* BOTTOM RIGHT: Recurring Revenue */}
                    <div style={{
                      background: darkMode ? '#0d1117' : '#ffffff',
                      borderRadius: '20px',
                      padding: '28px',
                      boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
                      border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                      minHeight: '320px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '12px', 
                          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                        }}>
                          <Repeat size={20} style={{ color: 'white' }} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: '700', color: darkMode ? '#ededed' : '#1e293b', margin: 0 }}>
                            Recurring Revenue
                          </h3>
                          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Regular income streams</p>
                        </div>
                      </div>
                      <div style={{ flex: 1, minHeight: '180px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={revenueBarData.recurring} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
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
                              fill="#22c55e" 
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
                        background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', 
                        borderRadius: '12px',
                        border: '1px solid #bbf7d0'
                      }}>
                        <span style={{ fontSize: '14px', color: '#166534', fontWeight: '500' }}>Total Recurring</span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>{formatCurrency(classifyRevenue.recurringTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Credit Transactions Table with Pagination */}
                  <div className="transactions-table-section" style={{ marginTop: '24px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: '16px',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <h3 style={{ margin: 0 }}>All Credit Transactions</h3>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        fontSize: '14px',
                        color: darkMode ? '#8b949e' : '#64748b'
                      }}>
                        <span>Show</span>
                        <select
                          value={creditRowsPerPage}
                          onChange={(e) => {
                            setCreditRowsPerPage(Number(e.target.value));
                            setCreditCurrentPage(1);
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                            background: darkMode ? '#161b22' : '#ffffff',
                            color: darkMode ? '#ededed' : '#1e293b',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={15}>15</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                        <span>per page</span>
                      </div>
                    </div>
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
                            metrics.creditTransactions
                              .slice((creditCurrentPage - 1) * creditRowsPerPage, creditCurrentPage * creditRowsPerPage)
                              .map((txn, index) => {
                                const actualIndex = (creditCurrentPage - 1) * creditRowsPerPage + index;
                                return (
                              <tr key={actualIndex}>
                                <td className="date-col">{txn.date || '-'}</td>
                                <td className="description-col">{txn.description || txn.particulars || '-'}</td>
                                <td className="category-col">
                                  {editingCategory?.index === actualIndex && editingCategory?.type === 'credit' ? (
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
                                      onClick={() => handleCategoryClick(actualIndex, 'credit', txn.category?.category || 'Other Income')}
                                      title="Click to change category"
                                    >
                                      {txn.category?.category || 'Other Income'}
                                    </span>
                                  )}
                                </td>
                                <td className="amount-col revenue-amount">{formatCurrency(Math.abs(txn.amount))}</td>
                              </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td colSpan="4" className="no-data-row">No credit transactions found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {metrics.creditTransactions.length > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '20px',
                        padding: '16px 20px',
                        background: darkMode ? '#161b22' : '#f8fafc',
                        borderRadius: '12px',
                        border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <div style={{ fontSize: '14px', color: darkMode ? '#8b949e' : '#64748b' }}>
                          Showing {((creditCurrentPage - 1) * creditRowsPerPage) + 1} to {Math.min(creditCurrentPage * creditRowsPerPage, metrics.creditTransactions.length)} of {metrics.creditTransactions.length} transactions
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => setCreditCurrentPage(1)}
                            disabled={creditCurrentPage === 1}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                              background: darkMode ? '#0d1117' : '#ffffff',
                              color: creditCurrentPage === 1 ? (darkMode ? '#484f58' : '#cbd5e1') : (darkMode ? '#ededed' : '#1e293b'),
                              cursor: creditCurrentPage === 1 ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            First
                          </button>
                          <button
                            onClick={() => setCreditCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={creditCurrentPage === 1}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                              background: darkMode ? '#0d1117' : '#ffffff',
                              color: creditCurrentPage === 1 ? (darkMode ? '#484f58' : '#cbd5e1') : (darkMode ? '#ededed' : '#1e293b'),
                              cursor: creditCurrentPage === 1 ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            ← Prev
                          </button>
                          
                          {/* Page Numbers */}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {(() => {
                              const totalPages = Math.ceil(metrics.creditTransactions.length / creditRowsPerPage);
                              const pages = [];
                              let startPage = Math.max(1, creditCurrentPage - 2);
                              let endPage = Math.min(totalPages, startPage + 4);
                              
                              if (endPage - startPage < 4) {
                                startPage = Math.max(1, endPage - 4);
                              }
                              
                              for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                  <button
                                    key={i}
                                    onClick={() => setCreditCurrentPage(i)}
                                    style={{
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      border: i === creditCurrentPage ? '1px solid #22c55e' : (darkMode ? '1px solid #21262d' : '1px solid #e2e8f0'),
                                      background: i === creditCurrentPage ? 'linear-gradient(135deg, #22c55e, #16a34a)' : (darkMode ? '#0d1117' : '#ffffff'),
                                      color: i === creditCurrentPage ? '#ffffff' : (darkMode ? '#ededed' : '#1e293b'),
                                      cursor: 'pointer',
                                      fontSize: '13px',
                                      fontWeight: i === creditCurrentPage ? '600' : '500',
                                      minWidth: '36px'
                                    }}
                                  >
                                    {i}
                                  </button>
                                );
                              }
                              return pages;
                            })()}
                          </div>
                          
                          <button
                            onClick={() => setCreditCurrentPage(prev => Math.min(prev + 1, Math.ceil(metrics.creditTransactions.length / creditRowsPerPage)))}
                            disabled={creditCurrentPage >= Math.ceil(metrics.creditTransactions.length / creditRowsPerPage)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                              background: darkMode ? '#0d1117' : '#ffffff',
                              color: creditCurrentPage >= Math.ceil(metrics.creditTransactions.length / creditRowsPerPage) ? (darkMode ? '#484f58' : '#cbd5e1') : (darkMode ? '#ededed' : '#1e293b'),
                              cursor: creditCurrentPage >= Math.ceil(metrics.creditTransactions.length / creditRowsPerPage) ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            Next →
                          </button>
                          <button
                            onClick={() => setCreditCurrentPage(Math.ceil(metrics.creditTransactions.length / creditRowsPerPage))}
                            disabled={creditCurrentPage >= Math.ceil(metrics.creditTransactions.length / creditRowsPerPage)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                              background: darkMode ? '#0d1117' : '#ffffff',
                              color: creditCurrentPage >= Math.ceil(metrics.creditTransactions.length / creditRowsPerPage) ? (darkMode ? '#484f58' : '#cbd5e1') : (darkMode ? '#ededed' : '#1e293b'),
                              cursor: creditCurrentPage >= Math.ceil(metrics.creditTransactions.length / creditRowsPerPage) ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            Last
                          </button>
                        </div>
                      </div>
                    )}
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
                        background: darkMode ? '#0d1117' : '#ffffff',
                        borderRadius: '20px',
                        padding: '28px',
                        boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
                        border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                        position: 'relative',
                        minHeight: '380px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: darkMode ? '#ededed' : '#1e293b', marginBottom: '24px' }}>
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
                      background: darkMode ? '#0d1117' : '#ffffff',
                      borderRadius: '20px',
                      padding: '28px',
                      boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
                      border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                      minHeight: '380px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: darkMode ? '#ededed' : '#1e293b', margin: 0 }}>
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
                      background: darkMode ? '#0d1117' : '#ffffff',
                      borderRadius: '20px',
                      padding: '28px',
                      boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
                      border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
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
                          <h3 style={{ fontSize: '18px', fontWeight: '700', color: darkMode ? '#ededed' : '#1e293b', margin: 0 }}>
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
                      background: darkMode ? '#0d1117' : '#ffffff',
                      borderRadius: '20px',
                      padding: '28px',
                      boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
                      border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
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
                          <h3 style={{ fontSize: '18px', fontWeight: '700', color: darkMode ? '#ededed' : '#1e293b', margin: 0 }}>
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

                  {/* Expense by Category - Smart Suggestions Section - MOVED ABOVE TABLE */}
                  <div style={{
                    marginTop: '32px',
                    background: darkMode ? '#0d1117' : '#ffffff',
                    borderRadius: '20px',
                    padding: '28px',
                    boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
                    border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                      <div style={{ 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: '12px', 
                        background: 'linear-gradient(135deg, #ffcc29, #e6b800)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(255, 204, 41, 0.3)'
                      }}>
                        <Lightbulb size={22} style={{ color: '#070A12' }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', color: darkMode ? '#ededed' : '#1e293b', margin: 0 }}>
                          Smart Expense Insights
                        </h3>
                        <p style={{ fontSize: '14px', color: darkMode ? '#8b949e' : '#64748b', margin: 0 }}>
                          Click on a category to get AI-powered vendor suggestions
                        </p>
                      </div>
                    </div>

                    {/* Category Cards Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '16px'
                    }}>
                      {(() => {
                        // Group transactions by category
                        const categoryGroups = {};
                        metrics.debitTransactions.forEach(txn => {
                          const cat = txn.category?.category || 'General Expenses';
                          if (!categoryGroups[cat]) {
                            categoryGroups[cat] = { transactions: [], total: 0 };
                          }
                          categoryGroups[cat].transactions.push(txn);
                          categoryGroups[cat].total += Math.abs(txn.amount || 0);
                        });

                        // Sort by total amount
                        const sortedCategories = Object.entries(categoryGroups)
                          .sort((a, b) => b[1].total - a[1].total);

                        return sortedCategories.map(([category, data], index) => {
                          const percentage = ((data.total / metrics.totalExpenses) * 100).toFixed(1);
                          const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
                          const color = colors[index % colors.length];

                          return (
                            <div
                              key={category}
                              onClick={() => handleExpenseCategoryForSuggestions(category, data.transactions)}
                              style={{
                                background: darkMode ? '#161b22' : '#f8fafc',
                                borderRadius: '16px',
                                padding: '20px',
                                cursor: 'pointer',
                                border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = darkMode 
                                  ? '0 8px 30px rgba(0,0,0,0.4)' 
                                  : '0 8px 30px rgba(0,0,0,0.12)';
                                e.currentTarget.style.borderColor = '#ffcc29';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = darkMode ? '#21262d' : '#e2e8f0';
                              }}
                            >
                              {/* Color indicator bar */}
                              <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '4px',
                                height: '100%',
                                background: color,
                                borderRadius: '4px 0 0 4px'
                              }} />

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ flex: 1 }}>
                                  <h4 style={{ 
                                    fontSize: '15px', 
                                    fontWeight: '600', 
                                    color: darkMode ? '#ededed' : '#1e293b',
                                    margin: 0,
                                    marginBottom: '4px'
                                  }}>
                                    {category}
                                  </h4>
                                  <p style={{ 
                                    fontSize: '12px', 
                                    color: darkMode ? '#8b949e' : '#64748b',
                                    margin: 0
                                  }}>
                                    {data.transactions.length} transaction{data.transactions.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <div style={{
                                  background: `${color}20`,
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: color
                                }}>
                                  {percentage}%
                                </div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ 
                                  fontSize: '20px', 
                                  fontWeight: '700', 
                                  color: color 
                                }}>
                                  {formatCurrency(data.total)}
                                </span>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px',
                                  color: '#ffcc29',
                                  fontWeight: '500'
                                }}>
                                  <Lightbulb size={14} />
                                  Get Tips
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div style={{
                                marginTop: '12px',
                                height: '4px',
                                background: darkMode ? '#21262d' : '#e2e8f0',
                                borderRadius: '2px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${percentage}%`,
                                  height: '100%',
                                  background: color,
                                  borderRadius: '2px',
                                  transition: 'width 0.5s ease'
                                }} />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Debit Transactions Table with Pagination */}
                  <div className="transactions-table-section" style={{ marginTop: '24px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: '16px',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <h3 style={{ margin: 0 }}>All Debit Transactions</h3>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        fontSize: '14px',
                        color: darkMode ? '#8b949e' : '#64748b'
                      }}>
                        <span>Show</span>
                        <select
                          value={debitRowsPerPage}
                          onChange={(e) => {
                            setDebitRowsPerPage(Number(e.target.value));
                            setDebitCurrentPage(1);
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                            background: darkMode ? '#161b22' : '#ffffff',
                            color: darkMode ? '#ededed' : '#1e293b',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={15}>15</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                        <span>per page</span>
                      </div>
                    </div>
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
                            metrics.debitTransactions
                              .slice((debitCurrentPage - 1) * debitRowsPerPage, debitCurrentPage * debitRowsPerPage)
                              .map((txn, index) => {
                                const actualIndex = (debitCurrentPage - 1) * debitRowsPerPage + index;
                                return (
                              <tr key={actualIndex}>
                                <td className="date-col">{txn.date || '-'}</td>
                                <td className="description-col">{txn.description || txn.particulars || '-'}</td>
                                <td className="category-col">
                                  {editingCategory?.index === actualIndex && editingCategory?.type === 'debit' ? (
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
                                      onClick={() => handleCategoryClick(actualIndex, 'debit', txn.category?.category || 'General Expenses')}
                                      title="Click to change category"
                                    >
                                      {txn.category?.category || 'General Expenses'}
                                    </span>
                                  )}
                                </td>
                                <td className="amount-col expense-amount">{formatCurrency(Math.abs(txn.amount))}</td>
                              </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td colSpan="4" className="no-data-row">No debit transactions found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {metrics.debitTransactions.length > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '20px',
                        padding: '16px 20px',
                        background: darkMode ? '#161b22' : '#f8fafc',
                        borderRadius: '12px',
                        border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <div style={{ fontSize: '14px', color: darkMode ? '#8b949e' : '#64748b' }}>
                          Showing {((debitCurrentPage - 1) * debitRowsPerPage) + 1} to {Math.min(debitCurrentPage * debitRowsPerPage, metrics.debitTransactions.length)} of {metrics.debitTransactions.length} transactions
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => setDebitCurrentPage(1)}
                            disabled={debitCurrentPage === 1}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                              background: darkMode ? '#0d1117' : '#ffffff',
                              color: debitCurrentPage === 1 ? (darkMode ? '#484f58' : '#cbd5e1') : (darkMode ? '#ededed' : '#1e293b'),
                              cursor: debitCurrentPage === 1 ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            First
                          </button>
                          <button
                            onClick={() => setDebitCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={debitCurrentPage === 1}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                              background: darkMode ? '#0d1117' : '#ffffff',
                              color: debitCurrentPage === 1 ? (darkMode ? '#484f58' : '#cbd5e1') : (darkMode ? '#ededed' : '#1e293b'),
                              cursor: debitCurrentPage === 1 ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            ← Prev
                          </button>
                          
                          {/* Page Numbers */}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {(() => {
                              const totalPages = Math.ceil(metrics.debitTransactions.length / debitRowsPerPage);
                              const pages = [];
                              let startPage = Math.max(1, debitCurrentPage - 2);
                              let endPage = Math.min(totalPages, startPage + 4);
                              
                              if (endPage - startPage < 4) {
                                startPage = Math.max(1, endPage - 4);
                              }
                              
                              for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                  <button
                                    key={i}
                                    onClick={() => setDebitCurrentPage(i)}
                                    style={{
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      border: i === debitCurrentPage ? '1px solid #ffcc29' : (darkMode ? '1px solid #21262d' : '1px solid #e2e8f0'),
                                      background: i === debitCurrentPage ? 'linear-gradient(135deg, #ffcc29, #e6b800)' : (darkMode ? '#0d1117' : '#ffffff'),
                                      color: i === debitCurrentPage ? '#070A12' : (darkMode ? '#ededed' : '#1e293b'),
                                      cursor: 'pointer',
                                      fontSize: '13px',
                                      fontWeight: i === debitCurrentPage ? '600' : '500',
                                      minWidth: '36px'
                                    }}
                                  >
                                    {i}
                                  </button>
                                );
                              }
                              return pages;
                            })()}
                          </div>
                          
                          <button
                            onClick={() => setDebitCurrentPage(prev => Math.min(prev + 1, Math.ceil(metrics.debitTransactions.length / debitRowsPerPage)))}
                            disabled={debitCurrentPage >= Math.ceil(metrics.debitTransactions.length / debitRowsPerPage)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                              background: darkMode ? '#0d1117' : '#ffffff',
                              color: debitCurrentPage >= Math.ceil(metrics.debitTransactions.length / debitRowsPerPage) ? (darkMode ? '#484f58' : '#cbd5e1') : (darkMode ? '#ededed' : '#1e293b'),
                              cursor: debitCurrentPage >= Math.ceil(metrics.debitTransactions.length / debitRowsPerPage) ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            Next →
                          </button>
                          <button
                            onClick={() => setDebitCurrentPage(Math.ceil(metrics.debitTransactions.length / debitRowsPerPage))}
                            disabled={debitCurrentPage >= Math.ceil(metrics.debitTransactions.length / debitRowsPerPage)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
                              background: darkMode ? '#0d1117' : '#ffffff',
                              color: debitCurrentPage >= Math.ceil(metrics.debitTransactions.length / debitRowsPerPage) ? (darkMode ? '#484f58' : '#cbd5e1') : (darkMode ? '#ededed' : '#1e293b'),
                              cursor: debitCurrentPage >= Math.ceil(metrics.debitTransactions.length / debitRowsPerPage) ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            Last
                          </button>
                        </div>
                      </div>
                    )}
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
                <p>Configure your InFINity preferences, automation rules, notification settings, and integration parameters for optimal performance.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Click-outside handler for expense dropdown */}
      {expenseDropdownOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 998
          }}
          onClick={() => setExpenseDropdownOpen(false)}
        />
      )}

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
              background: darkMode ? '#0d1117' : '#ffffff',
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
              borderBottom: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
              background: expenseModalType === 'recurring' 
                ? (darkMode ? 'rgba(220, 38, 38, 0.15)' : '#fef2f2') 
                : (darkMode ? 'rgba(249, 115, 22, 0.15)' : '#fff7ed')
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {expenseModalType === 'recurring' ? (
                  <Repeat size={24} style={{ color: '#dc2626' }} />
                ) : (
                  <Shuffle size={24} style={{ color: '#f97316' }} />
                )}
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', color: darkMode ? '#ededed' : '#1e293b', margin: 0 }}>
                    {expenseModalType === 'recurring' ? 'Recurring Expenses' : 'Non-Recurring Expenses'}
                  </h2>
                  <p style={{ fontSize: '13px', color: darkMode ? '#8b949e' : '#64748b', margin: '4px 0 0 0' }}>
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
                <X size={20} style={{ color: darkMode ? '#8b949e' : '#64748b' }} />
              </button>
            </div>

            {/* Modal Body - Table */}
            <div style={{ padding: '0', maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: darkMode ? '#161b22' : '#f8fafc', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: darkMode ? '#8b949e' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: darkMode ? '#8b949e' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: darkMode ? '#8b949e' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: darkMode ? '#8b949e' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(expenseModalType === 'recurring' ? classifyExpenses.recurring : classifyExpenses.nonRecurring).map((txn, index) => (
                    <tr 
                      key={index} 
                      style={{ 
                        borderBottom: darkMode ? '1px solid #21262d' : '1px solid #f1f5f9',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = darkMode ? '#161b22' : '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: darkMode ? '#8b949e' : '#64748b' }}>{txn.date || '-'}</td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: darkMode ? '#ededed' : '#1e293b', fontWeight: '500' }}>{txn.description || txn.particulars || '-'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          background: darkMode ? '#21262d' : '#f1f5f9',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          color: darkMode ? '#c9d1d9' : '#475569'
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
                      <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: darkMode ? '#8b949e' : '#64748b' }}>
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
              borderTop: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: darkMode ? '#161b22' : '#f8fafc'
            }}>
              <span style={{ fontSize: '13px', color: darkMode ? '#8b949e' : '#64748b' }}>
                {expenseModalType === 'recurring' 
                  ? 'Recurring expenses include subscriptions, EMIs, rent, utilities, etc.'
                  : 'Non-recurring expenses are one-time or irregular payments'
                }
              </span>
              <button
                onClick={() => setExpenseModalType(null)}
                style={{
                  background: darkMode ? '#21262d' : '#1e293b',
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

      {/* Health Score Modal */}
      {activeTooltip === 'healthscore' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setActiveTooltip(null)}>
          <div style={{
            background: darkMode ? '#0d1117' : '#ffffff',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: financialHealth.healthScore >= 70 ? '#dcfce7' : financialHealth.healthScore >= 50 ? '#fef3c7' : '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Activity size={20} style={{ color: financialHealth.healthScore >= 70 ? '#16a34a' : financialHealth.healthScore >= 50 ? '#d97706' : '#dc2626' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>How is Health Score calculated?</h3>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Understanding your financial wellness</span>
                </div>
              </div>
              <button
                onClick={() => setActiveTooltip(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 20px', color: '#475569', fontSize: '14px', lineHeight: '1.6' }}>
                Your Health Score is a comprehensive measure of your business's financial wellness, scored out of <strong>100 points</strong>. It considers five key factors:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #6366f1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ color: '#1e293b', fontSize: '14px' }}>1. Profitability</strong>
                    <span style={{ background: '#6366f1', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>{financialHealth.scoreBreakdown.profitabilityScore}/25 pts</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>How much profit you're making relative to revenue. Your margin is <strong>{financialHealth.scoreBreakdown.profitMargin}%</strong>.</p>
                </div>

                <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ color: '#1e293b', fontSize: '14px' }}>2. Runway</strong>
                    <span style={{ background: '#8b5cf6', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>{financialHealth.scoreBreakdown.runwayScore}/25 pts</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>How many months you can operate with current cash. More runway = better score.</p>
                </div>

                <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #0ea5e9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ color: '#1e293b', fontSize: '14px' }}>3. Revenue Coverage</strong>
                    <span style={{ background: '#0ea5e9', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>{financialHealth.scoreBreakdown.coverageScore}/20 pts</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Whether your revenue covers expenses. Your ratio is <strong>{financialHealth.scoreBreakdown.coverageRatio}x</strong>.</p>
                </div>

                <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ color: '#1e293b', fontSize: '14px' }}>4. Burn Efficiency</strong>
                    <span style={{ background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>{financialHealth.scoreBreakdown.burnEfficiencyScore}/15 pts</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>How efficiently you're spending relative to income.</p>
                </div>

                <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ color: '#1e293b', fontSize: '14px' }}>5. Cash Reserves</strong>
                    <span style={{ background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>{financialHealth.scoreBreakdown.cashPositionScore}/15 pts</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Your cash cushion for emergencies and opportunities.</p>
                </div>
              </div>

              {/* Score Summary */}
              <div style={{
                background: financialHealth.healthScore >= 70 ? '#f0fdf4' : financialHealth.healthScore >= 50 ? '#fffbeb' : '#fef2f2',
                padding: '16px 20px',
                borderRadius: '12px',
                border: `1px solid ${financialHealth.healthScore >= 70 ? '#bbf7d0' : financialHealth.healthScore >= 50 ? '#fde68a' : '#fecaca'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Your Total Score</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '24px', 
                      fontWeight: '700', 
                      color: financialHealth.healthScore >= 70 ? '#16a34a' : financialHealth.healthScore >= 50 ? '#d97706' : '#dc2626' 
                    }}>
                      {financialHealth.healthScore}
                    </span>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>/100</span>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: financialHealth.healthScore >= 70 ? '#16a34a' : financialHealth.healthScore >= 50 ? '#d97706' : '#dc2626',
                      color: 'white'
                    }}>
                      {financialHealth.healthGrade}
                    </span>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                  {financialHealth.healthScore >= 80 ? "Excellent! Your business is in great financial shape. Keep up the good work!" :
                   financialHealth.healthScore >= 60 ? "Good progress! There's room for improvement but your fundamentals are solid." :
                   financialHealth.healthScore >= 40 ? "Fair. Consider reducing expenses or finding ways to increase revenue." :
                   "Needs attention. Review your cash flow and spending patterns urgently."}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setActiveTooltip(null)}
                style={{
                  background: '#1e293b',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Suggestions Modal */}
      {selectedExpenseCategory && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => {
            setSelectedExpenseCategory(null);
            setVendorSuggestions([]);
          }}
        >
          <div 
            style={{
              background: darkMode ? '#0d1117' : '#ffffff',
              borderRadius: '20px',
              width: '90%',
              maxWidth: '700px',
              maxHeight: '85vh',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              animation: 'slideUp 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #ffcc29, #e6b800)',
              padding: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'rgba(7, 10, 18, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Lightbulb size={26} style={{ color: '#070A12' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#070A12' }}>
                    Smart Savings Tips
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: 'rgba(7, 10, 18, 0.7)' }}>
                    {selectedExpenseCategory.category}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedExpenseCategory(null);
                  setVendorSuggestions([]);
                }}
                style={{
                  background: 'rgba(7, 10, 18, 0.15)',
                  border: 'none',
                  borderRadius: '10px',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={22} style={{ color: '#070A12' }} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ 
              padding: '24px', 
              maxHeight: '60vh', 
              overflowY: 'auto',
              background: darkMode ? '#0d1117' : '#ffffff'
            }}>
              {loadingVendorSuggestions ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: '4px solid #21262d',
                    borderTopColor: '#ffcc29',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px'
                  }} />
                  <p style={{ color: darkMode ? '#8b949e' : '#64748b', fontSize: '16px' }}>
                    Analyzing your spending patterns...
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary Card - Shows current vendor */}
                  <div style={{
                    background: darkMode ? '#161b22' : '#f8fafc',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '24px',
                    border: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0'
                  }}>
                    {vendorSuggestions[0]?.currentVendor && vendorSuggestions[0].currentVendor !== 'Multiple Vendors' && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '12px',
                        padding: '8px 12px',
                        background: darkMode ? '#0d1117' : '#fee2e2',
                        borderRadius: '8px',
                        width: 'fit-content'
                      }}>
                        <span style={{ fontSize: '13px', color: darkMode ? '#f87171' : '#dc2626' }}>
                          Currently using:
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: darkMode ? '#fca5a5' : '#991b1b' }}>
                          {vendorSuggestions[0].currentVendor}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', color: darkMode ? '#8b949e' : '#64748b' }}>
                        Total Spent in {selectedExpenseCategory.category}
                      </span>
                      <span style={{ fontSize: '14px', color: darkMode ? '#8b949e' : '#64748b' }}>
                        {vendorSuggestions[0]?.transactionCount || selectedExpenseCategory.transactions?.length || 0} Transactions
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: '700', 
                      color: '#ef4444',
                      marginBottom: '8px'
                    }}>
                      {vendorSuggestions[0]?.totalSpent || formatCurrency(selectedExpenseCategory.transactions?.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) || 0)}
                    </div>
                    <p style={{ 
                      fontSize: '13px', 
                      color: darkMode ? '#8b949e' : '#64748b',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Brain size={14} style={{ color: '#ffcc29' }} />
                      Here are 5 alternatives to help you save money:
                    </p>
                  </div>

                  {/* Suggestion Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {vendorSuggestions.map((suggestion, index) => (
                      <div 
                        key={suggestion.id}
                        style={{
                          background: suggestion.isCurrent 
                            ? (darkMode ? '#0f1419' : '#f0fdf4') 
                            : (darkMode ? '#161b22' : '#ffffff'),
                          borderRadius: '16px',
                          padding: '20px',
                          border: suggestion.isCurrent 
                            ? '2px solid #22c55e' 
                            : (darkMode ? '1px solid #21262d' : '1px solid #e2e8f0'),
                          transition: 'all 0.3s ease',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          if (!suggestion.isCurrent) {
                            e.currentTarget.style.borderColor = '#ffcc29';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 204, 41, 0.15)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!suggestion.isCurrent) {
                            e.currentTarget.style.borderColor = darkMode ? '#21262d' : '#e2e8f0';
                            e.currentTarget.style.boxShadow = 'none';
                          }
                        }}
                      >
                        {/* Best Choice / Current Option Badge */}
                        {suggestion.isCurrent && (
                          <div style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '20px',
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            ✓ Stick with Current
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: suggestion.isCurrent 
                                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              fontWeight: '700',
                              color: 'white'
                            }}>
                              {suggestion.isCurrent ? '✓' : index + 1}
                            </div>
                            <div>
                              <h4 style={{ 
                                margin: 0, 
                                fontSize: '16px', 
                                fontWeight: '600', 
                                color: darkMode ? '#ededed' : '#1e293b' 
                              }}>
                                {suggestion.vendor}
                              </h4>
                              {suggestion.isCurrent && vendorSuggestions[0]?.currentVendor && (
                                <p style={{ 
                                  margin: '2px 0 0', 
                                  fontSize: '12px', 
                                  color: '#22c55e',
                                  fontWeight: '500'
                                }}>
                                  You're already using a good option!
                                </p>
                              )}
                            </div>
                          </div>
                          <div style={{
                            background: suggestion.isCurrent 
                              ? 'linear-gradient(135deg, #22c55e20, #16a34a20)'
                              : 'linear-gradient(135deg, #3b82f620, #2563eb20)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: suggestion.isCurrent ? '#22c55e' : '#3b82f6'
                          }}>
                            {suggestion.isCurrent ? 'Optimize' : 'Save'} {suggestion.savings}
                          </div>
                        </div>

                        <div style={{
                          background: darkMode ? '#0d1117' : '#f8fafc',
                          borderRadius: '10px',
                          padding: '14px',
                          marginTop: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <Zap size={16} style={{ color: '#ffcc29', marginTop: '2px', flexShrink: 0 }} />
                            <p style={{ 
                              margin: 0, 
                              fontSize: '14px', 
                              color: darkMode ? '#c9d1d9' : '#475569',
                              lineHeight: '1.6'
                            }}>
                              {suggestion.reason}
                            </p>
                          </div>
                        </div>

                        {!suggestion.isCurrent && (
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            marginTop: '16px',
                            padding: '12px 16px',
                            background: darkMode ? '#0d1117' : '#eff6ff',
                            borderRadius: '10px',
                            border: '1px solid #3b82f630'
                          }}>
                            <div>
                              <span style={{ fontSize: '12px', color: darkMode ? '#8b949e' : '#64748b' }}>You Spent</span>
                              <p style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: '600', color: '#ef4444' }}>
                                {suggestion.totalSpent}
                              </p>
                            </div>
                            <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center' }}>
                              <ArrowUpRight size={20} style={{ color: '#22c55e', transform: 'rotate(90deg)' }} />
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '12px', color: darkMode ? '#8b949e' : '#64748b' }}>Could Save</span>
                              <p style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: '600', color: '#22c55e' }}>
                                {suggestion.potentialSavings}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pro Tip */}
                  <div style={{
                    marginTop: '24px',
                    background: 'linear-gradient(135deg, #ffcc2910, #e6b80010)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid #ffcc2940',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <Brain size={20} style={{ color: '#ffcc29', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <h5 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '600', color: '#ffcc29' }}>
                        Pro Tip
                      </h5>
                      <p style={{ margin: 0, fontSize: '13px', color: darkMode ? '#c9d1d9' : '#475569', lineHeight: '1.5' }}>
                        Review your top spending categories monthly. Small changes in vendor choices can lead to 
                        significant annual savings of 15-30% without compromising on quality.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: darkMode ? '1px solid #21262d' : '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              background: darkMode ? '#0d1117' : '#ffffff'
            }}>
              <button
                onClick={() => {
                  setSelectedExpenseCategory(null);
                  setVendorSuggestions([]);
                }}
                style={{
                  background: 'linear-gradient(135deg, #ffcc29, #e6b800)',
                  color: '#070A12',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 204, 41, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Got it, Thanks!
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