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
  Shuffle,
  Wallet,
  Clock,
  Flame,
  Activity,
  Moon,
  Sun
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
          <div className="brand-logo">
            <img 
              src={darkMode ? LogoDark : LogoLight} 
              alt="Nebulaa Logo" 
              className="brand-logo-img"
            />
            <div className="brand-text">
              <h1>Nebulaa</h1>
              <span>InFINity</span>
            </div>
          </div>
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
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                            border: '1px solid #e2e8f0',
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
                          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                        }}>
                          <Shuffle size={20} style={{ color: 'white' }} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
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
                          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                        }}>
                          <Repeat size={20} style={{ color: 'white' }} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
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

                  {/* Credit Transactions Table */}
                  <div className="transactions-table-section" style={{ marginTop: '24px' }}>
                    <h3>All Credit Transactions</h3>
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
            background: 'white',
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

      {/* AI Chatbot - Available on all tabs */}
      <AIChatbot user={user} />
    </div>
  );
};

export default Dashboard;