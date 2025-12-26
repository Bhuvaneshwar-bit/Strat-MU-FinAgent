import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  CreditCard,
  Wallet,
  PiggyBank,
  Calendar,
  DollarSign,
  Activity,
  Target,
  ArrowUp,
  ArrowDown,
  X,
  Info,
  Zap,
  Shield,
  AlertCircle,
  RefreshCw,
  Upload,
  Scissors,
  Repeat,
  Ban,
  Plus,
  Percent,
  Clock,
  ShoppingCart,
  Building,
  Coffee,
  Car,
  Smartphone,
  Utensils,
  ShoppingBag,
  Briefcase,
  Gift
} from 'lucide-react';
import { buildApiUrl } from '../config/api';
import '../styles/Foresight.css';

const Foresight = ({ plData, darkMode, onNavigateToBookkeeping }) => {
  const [healthScore, setHealthScore] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [animateScore, setAnimateScore] = useState(false);
  const [scoreBreakdown, setScoreBreakdown] = useState({});

  // Get financial metrics from plData
  const getMetrics = useMemo(() => {
    if (!plData) return null;
    
    const allTransactions = plData.transactions || [];
    const creditTransactions = allTransactions.filter(t => t.amount > 0 || t.category?.type === 'revenue');
    const debitTransactions = allTransactions.filter(t => t.amount < 0 || t.category?.type === 'expenses');
    
    const totalRevenue = plData.analysisMetrics?.totalRevenue ?? plData.plStatement?.revenue?.totalRevenue ?? 0;
    const totalExpenses = plData.analysisMetrics?.totalExpenses ?? plData.plStatement?.expenses?.totalExpenses ?? 0;
    const netIncome = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100) : 0;
    
    // Analyze expense categories
    const expenseCategories = {};
    debitTransactions.forEach(t => {
      const cat = t.category?.category || t.description?.substring(0, 20) || 'Other';
      const amount = Math.abs(t.amount);
      expenseCategories[cat] = (expenseCategories[cat] || 0) + amount;
    });
    
    // Find top expense categories
    const sortedExpenses = Object.entries(expenseCategories)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount, percentage: (amount / totalExpenses) * 100 }));
    
    // Detect recurring expenses
    const recurringKeywords = ['subscription', 'emi', 'rent', 'salary', 'insurance', 'netflix', 'spotify', 'amazon', 'gym', 'premium', 'monthly'];
    const recurringExpenses = debitTransactions.filter(t => {
      const desc = (t.description || '').toLowerCase();
      return recurringKeywords.some(k => desc.includes(k));
    });
    const recurringTotal = recurringExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Detect non-essential spending
    const nonEssentialKeywords = ['restaurant', 'food', 'swiggy', 'zomato', 'coffee', 'cafe', 'entertainment', 'movie', 'shopping', 'amazon', 'flipkart', 'fashion'];
    const nonEssentialExpenses = debitTransactions.filter(t => {
      const desc = (t.description || '').toLowerCase();
      return nonEssentialKeywords.some(k => desc.includes(k));
    });
    const nonEssentialTotal = nonEssentialExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Revenue stream analysis
    const revenueCategories = {};
    creditTransactions.forEach(t => {
      const cat = t.category?.category || t.description?.substring(0, 20) || 'Other Income';
      revenueCategories[cat] = (revenueCategories[cat] || 0) + t.amount;
    });
    const revenueStreams = Object.entries(revenueCategories)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount, percentage: (amount / totalRevenue) * 100 }));
    
    // Cash flow patterns
    const monthlyData = {};
    allTransactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, expenses: 0 };
      }
      if (t.amount > 0) monthlyData[monthKey].revenue += t.amount;
      else monthlyData[monthKey].expenses += Math.abs(t.amount);
    });
    
    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      profitMargin,
      transactionCount: allTransactions.length,
      creditCount: creditTransactions.length,
      debitCount: debitTransactions.length,
      expenseCategories: sortedExpenses,
      topExpenseCategory: sortedExpenses[0] || null,
      secondExpenseCategory: sortedExpenses[1] || null,
      thirdExpenseCategory: sortedExpenses[2] || null,
      recurringTotal,
      recurringCount: recurringExpenses.length,
      nonEssentialTotal,
      nonEssentialCount: nonEssentialExpenses.length,
      revenueStreams,
      topRevenueStream: revenueStreams[0] || null,
      monthlyData,
      savingsRate: totalRevenue > 0 ? ((netIncome / totalRevenue) * 100) : 0,
      expenseRatio: totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100) : 0
    };
  }, [plData]);

  // Calculate health score based on actual data
  useEffect(() => {
    if (!getMetrics) return;
    
    const m = getMetrics;
    let score = 50;
    const breakdown = {};

    // 1. Profit Margin Factor (max 25 points)
    if (m.profitMargin >= 30) { score += 25; breakdown.profitMargin = { score: 25, label: 'Excellent Margins' }; }
    else if (m.profitMargin >= 20) { score += 20; breakdown.profitMargin = { score: 20, label: 'Good Margins' }; }
    else if (m.profitMargin >= 10) { score += 15; breakdown.profitMargin = { score: 15, label: 'Moderate Margins' }; }
    else if (m.profitMargin >= 0) { score += 5; breakdown.profitMargin = { score: 5, label: 'Low Margins' }; }
    else { score -= 10; breakdown.profitMargin = { score: -10, label: 'Negative Margins' }; }

    // 2. Expense Ratio Factor (max 15 points)
    if (m.expenseRatio < 50) { score += 15; breakdown.expenseRatio = { score: 15, label: 'Low Expenses' }; }
    else if (m.expenseRatio < 70) { score += 10; breakdown.expenseRatio = { score: 10, label: 'Moderate Expenses' }; }
    else if (m.expenseRatio < 90) { score += 5; breakdown.expenseRatio = { score: 5, label: 'High Expenses' }; }
    else { score -= 5; breakdown.expenseRatio = { score: -5, label: 'Overspending' }; }

    // 3. Recurring Expense Load (max 10 points)
    const recurringRatio = (m.recurringTotal / m.totalExpenses) * 100;
    if (recurringRatio < 30) { score += 10; breakdown.recurringLoad = { score: 10, label: 'Low Fixed Costs' }; }
    else if (recurringRatio < 50) { score += 5; breakdown.recurringLoad = { score: 5, label: 'Moderate Fixed Costs' }; }
    else { score -= 5; breakdown.recurringLoad = { score: -5, label: 'High Fixed Costs' }; }

    // 4. Diversification (max 5 points)
    if (m.revenueStreams.length >= 3) { score += 5; breakdown.diversification = { score: 5, label: 'Diversified' }; }
    else if (m.revenueStreams.length >= 2) { score += 3; breakdown.diversification = { score: 3, label: 'Some Diversification' }; }
    else { score += 0; breakdown.diversification = { score: 0, label: 'Single Source' }; }

    // 5. Non-Essential Spending (max -10 to +5 points)
    const nonEssentialRatio = (m.nonEssentialTotal / m.totalExpenses) * 100;
    if (nonEssentialRatio < 10) { score += 5; breakdown.nonEssential = { score: 5, label: 'Minimal Discretionary' }; }
    else if (nonEssentialRatio < 25) { score += 0; breakdown.nonEssential = { score: 0, label: 'Normal Discretionary' }; }
    else { score -= 10; breakdown.nonEssential = { score: -10, label: 'High Discretionary' }; }

    score = Math.max(0, Math.min(100, Math.round(score)));
    setHealthScore(score);
    setScoreBreakdown(breakdown);
  }, [getMetrics]);

  // Generate dynamic scenarios based on actual data
  useEffect(() => {
    if (!getMetrics) return;

    const m = getMetrics;
    const dynamicScenarios = [];

    // Icon mapping for categories
    const getCategoryIcon = (category) => {
      const cat = category?.toLowerCase() || '';
      if (cat.includes('food') || cat.includes('restaurant') || cat.includes('swiggy') || cat.includes('zomato')) return Utensils;
      if (cat.includes('transport') || cat.includes('uber') || cat.includes('ola') || cat.includes('fuel')) return Car;
      if (cat.includes('subscription') || cat.includes('netflix') || cat.includes('spotify')) return Smartphone;
      if (cat.includes('shopping') || cat.includes('amazon') || cat.includes('flipkart')) return ShoppingBag;
      if (cat.includes('rent') || cat.includes('office')) return Building;
      if (cat.includes('coffee') || cat.includes('cafe')) return Coffee;
      if (cat.includes('salary') || cat.includes('business')) return Briefcase;
      return ShoppingCart;
    };

    // 1. Top Expense Category - What if you reduce it by 30%?
    if (m.topExpenseCategory && m.topExpenseCategory.amount > 5000) {
      const reduction = m.topExpenseCategory.amount * 0.3;
      const newExpenses = m.totalExpenses - reduction;
      const newMargin = ((m.totalRevenue - newExpenses) / m.totalRevenue) * 100;
      const impactPoints = Math.min(10, Math.round(reduction / m.totalExpenses * 30));
      
      dynamicScenarios.push({
        id: 'reduce_top_expense',
        title: `Cut ${m.topExpenseCategory.category} by 30%`,
        description: `Your biggest expense is ${m.topExpenseCategory.category} at ₹${m.topExpenseCategory.amount.toLocaleString('en-IN')}`,
        icon: getCategoryIcon(m.topExpenseCategory.category),
        type: 'positive',
        impact: +impactPoints,
        color: '#22c55e',
        gradient: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
        details: {
          benefits: [
            `Save ₹${Math.round(reduction).toLocaleString('en-IN')} monthly`,
            `New profit margin: ${newMargin.toFixed(1)}% (was ${m.profitMargin.toFixed(1)}%)`,
            'More cash flow for growth'
          ],
          financialImpact: Math.round(reduction),
          newProfitMargin: Math.round(newMargin),
          recommendation: `Review your ${m.topExpenseCategory.category} spending for optimization opportunities`
        }
      });
    }

    // 2. Second expense category reduction
    if (m.secondExpenseCategory && m.secondExpenseCategory.amount > 3000) {
      const reduction = m.secondExpenseCategory.amount * 0.25;
      const impactPoints = Math.min(7, Math.round(reduction / m.totalExpenses * 25));
      
      dynamicScenarios.push({
        id: 'reduce_second_expense',
        title: `Reduce ${m.secondExpenseCategory.category} by 25%`,
        description: `Second highest spend: ₹${m.secondExpenseCategory.amount.toLocaleString('en-IN')}`,
        icon: getCategoryIcon(m.secondExpenseCategory.category),
        type: 'positive',
        impact: +impactPoints,
        color: '#22c55e',
        gradient: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
        details: {
          benefits: [
            `Save ₹${Math.round(reduction).toLocaleString('en-IN')} monthly`,
            'Improved expense efficiency',
            'Better cash management'
          ],
          financialImpact: Math.round(reduction),
          recommendation: `Negotiate better rates or find alternatives for ${m.secondExpenseCategory.category}`
        }
      });
    }

    // 3. Non-essential spending scenario (if significant)
    if (m.nonEssentialTotal > 2000) {
      const reduction = m.nonEssentialTotal * 0.5;
      const impactPoints = Math.min(8, Math.round(reduction / m.totalExpenses * 30));
      
      dynamicScenarios.push({
        id: 'cut_nonessential',
        title: 'Cut Non-Essential Spending by 50%',
        description: `You spend ₹${m.nonEssentialTotal.toLocaleString('en-IN')} on discretionary items`,
        icon: Scissors,
        type: 'positive',
        impact: +impactPoints,
        color: '#22c55e',
        gradient: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
        details: {
          benefits: [
            `Save ₹${Math.round(reduction).toLocaleString('en-IN')} monthly`,
            'Faster savings growth',
            'Financial discipline boost'
          ],
          financialImpact: Math.round(reduction),
          recommendation: 'Set a monthly discretionary spending budget'
        }
      });
    }

    // 4. Cancel recurring subscriptions (if any)
    if (m.recurringCount > 0 && m.recurringTotal > 1000) {
      const cancellation = m.recurringTotal * 0.3;
      const impactPoints = Math.min(6, Math.round(cancellation / m.totalExpenses * 25));
      
      dynamicScenarios.push({
        id: 'cancel_subscriptions',
        title: 'Cancel 30% of Subscriptions',
        description: `${m.recurringCount} recurring payments totaling ₹${m.recurringTotal.toLocaleString('en-IN')}`,
        icon: Repeat,
        type: 'positive',
        impact: +impactPoints,
        color: '#3b82f6',
        gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
        details: {
          benefits: [
            `Save ₹${Math.round(cancellation).toLocaleString('en-IN')} monthly`,
            'Reduced fixed obligations',
            'More financial flexibility'
          ],
          financialImpact: Math.round(cancellation),
          recommendation: 'Audit subscriptions monthly - cancel unused ones'
        }
      });
    }

    // 5. Revenue growth scenario
    if (m.totalRevenue > 0) {
      const growth = m.totalRevenue * 0.15;
      const newRevenue = m.totalRevenue + growth;
      const newMargin = ((newRevenue - m.totalExpenses) / newRevenue) * 100;
      
      dynamicScenarios.push({
        id: 'grow_revenue',
        title: 'Grow Revenue by 15%',
        description: `Current revenue: ₹${m.totalRevenue.toLocaleString('en-IN')}`,
        icon: TrendingUp,
        type: 'positive',
        impact: +5,
        color: '#22c55e',
        gradient: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
        details: {
          benefits: [
            `Additional ₹${Math.round(growth).toLocaleString('en-IN')} income`,
            `New profit margin: ${newMargin.toFixed(1)}%`,
            'Business momentum'
          ],
          financialImpact: Math.round(growth),
          newProfitMargin: Math.round(newMargin),
          recommendation: 'Focus on upselling and customer retention'
        }
      });
    }

    // 6. Diversify revenue (if single source)
    if (m.revenueStreams.length <= 2 && m.topRevenueStream) {
      const dependence = m.topRevenueStream.percentage;
      dynamicScenarios.push({
        id: 'diversify_revenue',
        title: 'Add a New Revenue Stream',
        description: `${dependence.toFixed(0)}% of income from ${m.topRevenueStream.category}`,
        icon: Plus,
        type: 'positive',
        impact: +6,
        color: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
        details: {
          benefits: [
            'Reduced income dependency',
            'Financial resilience',
            'Growth potential'
          ],
          recommendation: `Consider adding services or products complementary to ${m.topRevenueStream.category}`
        }
      });
    }

    // 7. Emergency fund scenario
    const monthlyExpense = m.totalExpenses;
    const emergencyTarget = monthlyExpense * 3;
    dynamicScenarios.push({
      id: 'emergency_fund',
      title: 'Build 3-Month Emergency Fund',
      description: `Target: ₹${emergencyTarget.toLocaleString('en-IN')} buffer`,
      icon: Shield,
      type: 'positive',
      impact: +8,
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
      details: {
        benefits: [
          'Protection against income disruption',
          'Peace of mind',
          'Avoid debt during emergencies'
        ],
        targetAmount: emergencyTarget,
        recommendation: 'Save 10% of income monthly until target reached'
      }
    });

    // 8. NEGATIVE: Expense increase scenario
    const expenseIncrease = m.totalExpenses * 0.2;
    const newMarginNeg = ((m.totalRevenue - (m.totalExpenses + expenseIncrease)) / m.totalRevenue) * 100;
    dynamicScenarios.push({
      id: 'expense_increase',
      title: 'If Expenses Rise 20%',
      description: 'Inflation, rent hikes, or unexpected costs',
      icon: AlertTriangle,
      type: 'negative',
      impact: -8,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
      details: {
        consequences: [
          `₹${Math.round(expenseIncrease).toLocaleString('en-IN')} additional monthly cost`,
          `Profit margin drops to ${newMarginNeg.toFixed(1)}%`,
          'Cash flow pressure'
        ],
        financialImpact: Math.round(expenseIncrease),
        recommendation: 'Maintain expense buffers and review contracts annually'
      }
    });

    // 9. NEGATIVE: Revenue drop
    if (m.totalRevenue > 0) {
      const drop = m.totalRevenue * 0.25;
      const newRev = m.totalRevenue - drop;
      const newMarginDrop = ((newRev - m.totalExpenses) / newRev) * 100;
      
      dynamicScenarios.push({
        id: 'revenue_drop',
        title: 'If Revenue Drops 25%',
        description: 'Market downturn or client loss',
        icon: TrendingDown,
        type: 'negative',
        impact: -12,
        color: '#ef4444',
        gradient: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
        details: {
          consequences: [
            `Lose ₹${Math.round(drop).toLocaleString('en-IN')} income`,
            `Profit margin: ${newMarginDrop.toFixed(1)}%`,
            'May need to cut costs drastically'
          ],
          financialImpact: Math.round(drop),
          recommendation: 'Diversify clients and build recurring revenue'
        }
      });
    }

    // 10. NEGATIVE: Top client loss (if single source dependency)
    if (m.topRevenueStream && m.topRevenueStream.percentage > 50) {
      dynamicScenarios.push({
        id: 'lose_top_client',
        title: `Lose ${m.topRevenueStream.category}`,
        description: `${m.topRevenueStream.percentage.toFixed(0)}% of your revenue at risk`,
        icon: XCircle,
        type: 'negative',
        impact: -15,
        color: '#ef4444',
        gradient: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
        details: {
          consequences: [
            `Lose ₹${m.topRevenueStream.amount.toLocaleString('en-IN')} immediately`,
            'Major cash flow crisis',
            'May not cover fixed expenses'
          ],
          financialImpact: Math.round(m.topRevenueStream.amount),
          recommendation: 'Urgently diversify - no client should be >30% of revenue'
        }
      });
    }

    // 11. Delayed payments scenario
    if (m.totalRevenue > 0) {
      dynamicScenarios.push({
        id: 'delayed_payments',
        title: 'Clients Pay 30 Days Late',
        description: 'What if receivables are delayed',
        icon: Clock,
        type: 'negative',
        impact: -5,
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
        details: {
          consequences: [
            'Cash flow gap',
            'May miss your own payments',
            'Working capital stress'
          ],
          financialImpact: Math.round(m.totalRevenue * 0.08),
          recommendation: 'Implement strict payment terms and follow-up process'
        }
      });
    }

    // 12. Savings rate improvement
    if (m.savingsRate < 20) {
      const targetSavings = m.totalRevenue * 0.2;
      const currentSavings = m.netIncome > 0 ? m.netIncome : 0;
      const improvement = targetSavings - currentSavings;
      
      dynamicScenarios.push({
        id: 'improve_savings',
        title: 'Achieve 20% Savings Rate',
        description: `Current: ${m.savingsRate.toFixed(1)}% → Target: 20%`,
        icon: PiggyBank,
        type: 'positive',
        impact: +7,
        color: '#22c55e',
        gradient: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
        details: {
          benefits: [
            `Save ₹${Math.round(targetSavings).toLocaleString('en-IN')}/month`,
            'Financial security',
            'Investment capital'
          ],
          financialImpact: Math.round(improvement),
          recommendation: 'Pay yourself first - automate savings'
        }
      });
    }

    setScenarios(dynamicScenarios);
    setLoading(false);
    setTimeout(() => setAnimateScore(true), 300);
  }, [getMetrics]);

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const ScenarioModal = ({ scenario, onClose }) => {
    const newScore = healthScore + scenario.impact;
    const clampedScore = Math.max(0, Math.min(100, newScore));
    
    return (
      <div className="scenario-modal-overlay" onClick={onClose}>
        <div className="scenario-modal" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>
            <X />
          </button>
          
          <div className="modal-header" style={{ background: scenario.gradient }}>
            <scenario.icon className="modal-icon" />
            <h2>{scenario.title}</h2>
          </div>
          
          <div className="modal-body">
            {/* Score Change Visual */}
            <div className="score-change-section">
              <div className="score-change-visual">
                <div className="score-box current">
                  <span className="score-label">Current</span>
                  <span className="score-value">{healthScore}</span>
                </div>
                <div className="score-arrow">
                  {scenario.impact > 0 ? <ArrowUp className="arrow-up" /> : <ArrowDown className="arrow-down" />}
                </div>
                <div className={`score-box new ${scenario.type}`}>
                  <span className="score-label">New Score</span>
                  <span className="score-value">{clampedScore}</span>
                </div>
              </div>
              <div className={`impact-badge ${scenario.type}`}>
                {scenario.impact > 0 ? '+' : ''}{scenario.impact} points
              </div>
            </div>

            {/* Details Section */}
            <div className="modal-details">
              {scenario.details.benefits && (
                <div className="details-section benefits">
                  <h4><CheckCircle /> Benefits</h4>
                  <ul>
                    {scenario.details.benefits.map((benefit, idx) => (
                      <li key={idx}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {scenario.details.consequences && (
                <div className="details-section consequences">
                  <h4><AlertTriangle /> Consequences</h4>
                  <ul>
                    {scenario.details.consequences.map((consequence, idx) => (
                      <li key={idx}>{consequence}</li>
                    ))}
                  </ul>
                </div>
              )}

              {scenario.details.financialImpact && (
                <div className="financial-impact">
                  <DollarSign />
                  <span>Financial Impact: </span>
                  <strong>₹{scenario.details.financialImpact.toLocaleString('en-IN')}</strong>
                </div>
              )}

              {scenario.details.newProfitMargin && (
                <div className="new-margin">
                  <Activity />
                  <span>New Profit Margin: </span>
                  <strong>{scenario.details.newProfitMargin}%</strong>
                </div>
              )}

              {scenario.details.targetAmount && (
                <div className="target-amount">
                  <Target />
                  <span>Target Amount: </span>
                  <strong>₹{scenario.details.targetAmount.toLocaleString('en-IN')}</strong>
                </div>
              )}

              <div className="recommendation">
                <Info />
                <p>{scenario.details.recommendation}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // No data state
  if (!plData) {
    return (
      <div className="foresight-container">
        <div className="foresight-header">
          <h2><Activity className="header-icon" /> Foresight</h2>
          <p>Financial scenario planning and health analysis</p>
        </div>
        
        <div className="no-data-container">
          <div className="no-data-icon">
            <AlertCircle />
          </div>
          <h3>No Financial Data Available</h3>
          <p>Upload a bank statement to see your financial health score and scenarios</p>
          <button onClick={onNavigateToBookkeeping} className="upload-btn">
            <Upload /> Upload Bank Statement
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`foresight-container ${darkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <div className="foresight-header">
        <h2><Activity className="header-icon" /> Foresight</h2>
        <p>Make a choice. See where it takes you.</p>
      </div>

      {/* Health Score Gauge */}
      <div className="health-score-section">
        <div className="score-gauge-container">
          <svg className="score-gauge" viewBox="0 0 200 120">
            {/* Background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={darkMode ? '#1e293b' : '#e2e8f0'}
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Score arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={`url(#scoreGradient)`}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(healthScore / 100) * 251.2} 251.2`}
              className={animateScore ? 'animate-score' : ''}
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="33%" stopColor="#f59e0b" />
                <stop offset="66%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
          </svg>
          
          <div className="score-display">
            <span className="score-number" style={{ color: getScoreColor(healthScore) }}>
              {healthScore}
            </span>
            <span className="score-max">/100</span>
          </div>
          
          <div className="score-label-container">
            <span className="score-status" style={{ color: getScoreColor(healthScore) }}>
              {getScoreLabel(healthScore)}
            </span>
          </div>
          
          <div className="score-range">
            <span>0</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* Scenarios Section */}
      <div className="scenarios-section">
        <h3 className="scenarios-title">What If Scenarios</h3>
        <p className="scenarios-subtitle">Click to see how each action affects your financial health</p>
        
        <div className="scenarios-grid">
          {scenarios.map((scenario) => {
            const Icon = scenario.icon;
            return (
              <div
                key={scenario.id}
                className={`scenario-card ${scenario.type}`}
                onClick={() => setSelectedScenario(scenario)}
                style={{ '--card-gradient': scenario.gradient }}
              >
                <div className="scenario-icon-wrapper" style={{ background: scenario.gradient }}>
                  <Icon className="scenario-icon" />
                </div>
                <h4>{scenario.title}</h4>
                <p>{scenario.description}</p>
                <div className={`scenario-impact ${scenario.type}`}>
                  {scenario.impact > 0 ? (
                    <><ArrowUp /> +{scenario.impact}</>
                  ) : (
                    <><ArrowDown /> {scenario.impact}</>
                  )}
                  <span>points</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scenario Modal */}
      {selectedScenario && (
        <ScenarioModal 
          scenario={selectedScenario} 
          onClose={() => setSelectedScenario(null)} 
        />
      )}
    </div>
  );
};

export default Foresight;
