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
  Gift,
  Play,
  RotateCcw,
  MessageSquare,
  Send,
  Loader2,
  Sparkles
} from 'lucide-react';
import { buildApiUrl } from '../config/api';
import '../styles/Foresight.css';

const Foresight = ({ plData, darkMode, initialHealthScore, onNavigateToBookkeeping }) => {
  const [healthScore, setHealthScore] = useState(initialHealthScore || 0);
  const [baseHealthScore, setBaseHealthScore] = useState(initialHealthScore || 0); // Original score from Dashboard
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [activeSimulation, setActiveSimulation] = useState(null); // Currently simulated scenario
  const [scenarios, setScenarios] = useState([]);
  const [customScenarios, setCustomScenarios] = useState([]); // AI-generated custom scenarios
  const [loading, setLoading] = useState(true);
  const [animateScore, setAnimateScore] = useState(false);
  const [scoreBreakdown, setScoreBreakdown] = useState({});
  
  // Custom scenario chatbot state
  const [showScenarioChat, setShowScenarioChat] = useState(false);
  const [scenarioInput, setScenarioInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);

  // Sync with Dashboard health score
  useEffect(() => {
    if (initialHealthScore !== undefined) {
      setHealthScore(initialHealthScore);
      setBaseHealthScore(initialHealthScore);
    }
  }, [initialHealthScore]);

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

  // Simulate scenario - updates the score
  const simulateScenario = (scenario, e) => {
    e.stopPropagation(); // Prevent card click
    
    if (activeSimulation?.id === scenario.id) {
      // If same scenario, reset
      resetSimulation();
      return;
    }
    
    const newScore = Math.max(0, Math.min(100, baseHealthScore + scenario.impact));
    setActiveSimulation(scenario);
    setAnimateScore(false);
    
    // Animate score change
    setTimeout(() => {
      setHealthScore(newScore);
      setAnimateScore(true);
    }, 50);
  };

  // Reset to original score
  const resetSimulation = () => {
    setActiveSimulation(null);
    setAnimateScore(false);
    setTimeout(() => {
      setHealthScore(baseHealthScore);
      setAnimateScore(true);
    }, 50);
  };

  // Generate custom scenario using AI
  const generateCustomScenario = async () => {
    if (!scenarioInput.trim() || isGenerating) return;
    
    const userMessage = scenarioInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setScenarioInput('');
    setIsGenerating(true);
    
    // Build comprehensive financial context
    const m = getMetrics || {};
    const expenseBreakdown = m.expenseCategories?.slice(0, 5).map(e => 
      `${e.category}: ₹${e.amount?.toLocaleString('en-IN')} (${e.percentage?.toFixed(1)}%)`
    ).join(', ') || 'No breakdown available';
    
    const revenueBreakdown = m.revenueStreams?.slice(0, 3).map(r => 
      `${r.category}: ₹${r.amount?.toLocaleString('en-IN')} (${r.percentage?.toFixed(1)}%)`
    ).join(', ') || 'No breakdown available';
    
    const topExpense = m.topExpenseCategory 
      ? `${m.topExpenseCategory.category} at ₹${m.topExpenseCategory.amount?.toLocaleString('en-IN')}`
      : 'Unknown';
    
    const topRevenue = m.topRevenueStream
      ? `${m.topRevenueStream.category} at ₹${m.topRevenueStream.amount?.toLocaleString('en-IN')} (${m.topRevenueStream.percentage?.toFixed(0)}% of income)`
      : 'Unknown';
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/api/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: `You are a senior business strategist analyzing this scenario: "${userMessage}"

=== BUSINESS FINANCIAL PROFILE ===
• Health Score: ${baseHealthScore}/100
• Monthly Revenue: ₹${m.totalRevenue?.toLocaleString('en-IN') || 0}
• Monthly Expenses: ₹${m.totalExpenses?.toLocaleString('en-IN') || 0}
• Net Income: ₹${m.netIncome?.toLocaleString('en-IN') || 0}
• Profit Margin: ${m.profitMargin?.toFixed(1) || 0}%

=== EXPENSE BREAKDOWN ===
${expenseBreakdown}
• Biggest Expense: ${topExpense}

=== REVENUE BREAKDOWN ===
${revenueBreakdown}
• Primary Income: ${topRevenue}

ANALYZE THE SCENARIO: "${userMessage}"

Think about:
1. What is the BEST possible outcome if this goes perfectly?
2. What is the WORST possible outcome if this fails?
3. What's a SMARTER alternative to achieve the same goal?

Respond in EXACTLY this JSON format (no markdown, pure JSON):
{
  "title": "Short title (4-5 words)",
  "description": "One line describing the scenario with ₹ amounts",
  "type": "positive" or "negative" (is this generally a good or risky decision?),
  "impact": number (-10 to +10, base case impact on health score),
  "bestCase": {
    "points": [
      "Specific positive outcome 1 (be detailed about what success looks like)",
      "Specific positive outcome 2 (mention ROI, productivity gains, revenue impact)",
      "Specific positive outcome 3 (how it improves their situation)",
      "Specific positive outcome 4 (long-term benefit)"
    ],
    "financialImpact": number (₹ benefit in best case),
    "impactPoints": number (health score change in best case, usually +5 to +12)
  },
  "worstCase": {
    "points": [
      "Specific negative outcome 1 (what goes wrong)",
      "Specific negative outcome 2 (hidden costs, time wasted)",
      "Specific negative outcome 3 (how it hurts their finances)",
      "Specific negative outcome 4 (opportunity cost)"
    ],
    "financialImpact": number (₹ loss/risk in worst case),
    "impactPoints": number (health score change in worst case, usually -3 to -10)
  },
  "recommendation": "A SMARTER alternative way to achieve the same goal. Be specific - suggest freelancers vs full-time, automation vs manual, phased approach vs all-at-once, etc. This should be actionable advice."
}

CRITICAL RULES:
- bestCase.points should be OPTIMISTIC but REALISTIC outcomes specific to the scenario
- worstCase.points should be REALISTIC risks specific to the scenario
- recommendation should suggest a BETTER/CHEAPER/SAFER alternative approach
- Use their actual financial data to calculate impacts
- BE SPECIFIC to the scenario - no generic business advice

Example for "hire 3 interns at ₹8000/month":
- bestCase: "Interns are skilled, contribute to sales, reduce workload on core team, one becomes full-time hire"
- worstCase: "Interns need constant supervision, make costly mistakes, leave after training"
- recommendation: "Consider hiring 1 experienced freelancer for ₹15000/month instead - more reliable, no training needed, can deliver immediately"`
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.response) {
        // Parse the AI response
        let scenarioData;
        try {
          // Try to extract JSON from the response
          const jsonMatch = data.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            scenarioData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found');
          }
        } catch (parseError) {
          // Fallback: create a basic scenario
          scenarioData = {
            title: userMessage.substring(0, 30),
            description: 'Custom scenario based on your input',
            type: 'positive',
            impact: 5,
            bestCase: {
              points: ['Potential improvement in financial health'],
              financialImpact: 10000,
              impactPoints: 5
            },
            worstCase: {
              points: ['May not work as expected'],
              financialImpact: 5000,
              impactPoints: -3
            },
            recommendation: 'Evaluate this scenario carefully before proceeding'
          };
        }
        
        // Create the scenario card with full best/worst case data from AI
        const newScenario = {
          id: `custom_${Date.now()}`,
          title: scenarioData.title || 'Custom Scenario',
          description: scenarioData.description || userMessage,
          icon: Sparkles,
          type: scenarioData.type || 'positive',
          impact: Math.max(-15, Math.min(15, scenarioData.impact || 5)),
          color: scenarioData.type === 'negative' ? '#ef4444' : '#22c55e',
          gradient: scenarioData.type === 'negative' 
            ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'
            : 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
          isCustom: true,
          details: {
            // Store the full best/worst case from AI
            bestCase: scenarioData.bestCase || {
              points: scenarioData.benefits || ['Positive outcome expected'],
              financialImpact: scenarioData.financialImpact || 10000,
              impactPoints: Math.abs(scenarioData.impact || 5)
            },
            worstCase: scenarioData.worstCase || {
              points: scenarioData.consequences || ['Some risks involved'],
              financialImpact: Math.round((scenarioData.financialImpact || 10000) * 0.3),
              impactPoints: -Math.abs(scenarioData.impact || 5)
            },
            recommendation: scenarioData.recommendation
          }
        };
        
        setCustomScenarios(prev => [...prev, newScenario]);
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `✨ Created scenario: "${newScenario.title}" with ${newScenario.impact > 0 ? '+' : ''}${newScenario.impact} points impact. Click "Simulate" on the card to see how it affects your score!`
        }]);
        
        // Close chat after short delay
        setTimeout(() => {
          setShowScenarioChat(false);
          setChatMessages([]);
        }, 2000);
        
      } else {
        throw new Error('Failed to generate scenario');
      }
    } catch (error) {
      console.error('Error generating scenario:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Sorry, I couldn\'t analyze that scenario. Please try rephrasing it.'
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete custom scenario
  const deleteCustomScenario = (scenarioId, e) => {
    e.stopPropagation();
    setCustomScenarios(prev => prev.filter(s => s.id !== scenarioId));
    if (activeSimulation?.id === scenarioId) {
      resetSimulation();
    }
  };

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
    const [selectedCase, setSelectedCase] = useState(null); // 'best' or 'worst'
    const m = getMetrics || {};
    
    // Generate best and worst case based on scenario type and user's data
    // CRITICAL: Best case impact should MATCH the card's impact for consistency
    const generateCases = () => {
      const cardImpact = scenario.impact; // This is what's shown on the card
      
      // Best case: Should match the card's impact (what user expects)
      const bestCase = {
        impact: cardImpact, // SAME as card
        title: 'Best Case Scenario',
        points: [],
        financialImpact: 0,
        show: true
      };
      
      // Worst case: Only show if there's a genuine risk/downside
      const worstCase = {
        impact: 0,
        title: 'Worst Case Scenario',
        points: [],
        financialImpact: 0,
        show: false // Default to hidden - only show if there's real risk
      };
      
      // Customize based on scenario - be SPECIFIC to business context
      if (scenario.id === 'reduce_top_expense' || scenario.id?.includes('reduce')) {
        const savings = scenario.details?.financialImpact || m.topExpenseCategory?.amount * 0.3 || 10000;
        const category = m.topExpenseCategory?.category || 'this expense';
        
        bestCase.points = [
          `Monthly savings: ₹${Math.round(savings).toLocaleString('en-IN')}`,
          `New profit margin: ${(m.profitMargin + (savings / m.totalRevenue * 100)).toFixed(1)}%`,
          `Freed up cash for working capital`,
          `No operational disruption if done smartly`
        ];
        bestCase.financialImpact = Math.round(savings);
        
        // Only show worst case if it's a significant operational expense
        const operationalCategories = ['salary', 'rent', 'marketing', 'inventory', 'staff'];
        const isOperational = operationalCategories.some(op => category.toLowerCase().includes(op));
        
        if (isOperational) {
          worstCase.show = true;
          worstCase.points = [
            `${category} cuts may impact delivery/quality`,
            `Hidden costs: ₹${Math.round(savings * 0.4).toLocaleString('en-IN')} in lost productivity`,
            `May need to reverse if operations suffer`,
            `Team capacity reduced`
          ];
          worstCase.financialImpact = Math.round(savings * 0.4);
          worstCase.impact = -Math.round(cardImpact * 0.5);
        }
      }
      else if (scenario.id === 'reduce_second_expense') {
        const savings = scenario.details?.financialImpact || m.secondExpenseCategory?.amount * 0.25 || 5000;
        bestCase.points = [
          `Save ₹${Math.round(savings).toLocaleString('en-IN')}/month`,
          `Secondary optimization - low risk`,
          `Cumulative improvement with other cuts`,
          `Better cost structure`
        ];
        bestCase.financialImpact = Math.round(savings);
        // No worst case for secondary expense cuts - low risk
      }
      else if (scenario.id === 'cut_nonessential') {
        const savings = scenario.details?.financialImpact || m.nonEssentialTotal * 0.5 || 5000;
        bestCase.points = [
          `Immediate savings: ₹${Math.round(savings).toLocaleString('en-IN')}/month`,
          `No impact on core business operations`,
          `Faster path to profitability`,
          `Builds financial discipline`
        ];
        bestCase.financialImpact = Math.round(savings);
        // No worst case - non-essential by definition has no downside
      }
      else if (scenario.id === 'cancel_subscriptions') {
        const savings = scenario.details?.financialImpact || m.recurringTotal * 0.3 || 3000;
        bestCase.points = [
          `Recurring savings: ₹${Math.round(savings).toLocaleString('en-IN')}/month`,
          `₹${Math.round(savings * 12).toLocaleString('en-IN')} annual impact`,
          `Reduced fixed cost burden`,
          `More flexible cash flow`
        ];
        bestCase.financialImpact = Math.round(savings);
        // Minor worst case - some subscriptions might be needed
        worstCase.show = true;
        worstCase.points = [
          `Some tools may be business-critical`,
          `Re-subscribing costs: ₹${Math.round(savings * 0.2).toLocaleString('en-IN')}`,
          `Temporary productivity dip`
        ];
        worstCase.financialImpact = Math.round(savings * 0.2);
        worstCase.impact = -Math.round(cardImpact * 0.3);
      }
      else if (scenario.id === 'grow_revenue') {
        const growth = scenario.details?.financialImpact || m.totalRevenue * 0.15;
        bestCase.points = [
          `Additional revenue: ₹${Math.round(growth).toLocaleString('en-IN')}/month`,
          `New profit margin: ${((m.totalRevenue + growth - m.totalExpenses) / (m.totalRevenue + growth) * 100).toFixed(1)}%`,
          `Stronger market position`,
          `Reinvestment capacity increases`
        ];
        bestCase.financialImpact = Math.round(growth);
        
        // Growth has real risks
        worstCase.show = true;
        worstCase.points = [
          `Growth costs exceed new revenue`,
          `Net loss: ₹${Math.round(growth * 0.3).toLocaleString('en-IN')}`,
          `Resources stretched thin`,
          `Quality/delivery may suffer`
        ];
        worstCase.financialImpact = Math.round(growth * 0.3);
        worstCase.impact = -5;
      }
      else if (scenario.id === 'diversify_revenue') {
        const currentDependence = m.topRevenueStream?.percentage || 70;
        bestCase.points = [
          `Reduce single-source dependency from ${currentDependence.toFixed(0)}%`,
          `Business survives if main client leaves`,
          `New growth opportunities`,
          `Higher business valuation`
        ];
        bestCase.financialImpact = Math.round(m.totalRevenue * 0.2);
        
        worstCase.show = true;
        worstCase.points = [
          `New revenue stream takes 6-12 months`,
          `Initial investment with no returns`,
          `Distraction from core business`
        ];
        worstCase.financialImpact = Math.round(m.totalRevenue * 0.1);
        worstCase.impact = -3;
      }
      else if (scenario.id === 'emergency_fund') {
        const target = m.totalExpenses * 3;
        bestCase.points = [
          `₹${Math.round(target).toLocaleString('en-IN')} safety cushion`,
          `Survive 3 months with zero income`,
          `Negotiate from position of strength`,
          `No panic decisions during crisis`
        ];
        bestCase.financialImpact = Math.round(target);
        // No real worst case for emergency fund - it's pure safety
      }
      else if (scenario.id === 'improve_savings') {
        const targetSavings = m.totalRevenue * 0.2;
        bestCase.points = [
          `Monthly savings: ₹${Math.round(targetSavings).toLocaleString('en-IN')}`,
          `Annual accumulation: ₹${Math.round(targetSavings * 12).toLocaleString('en-IN')}`,
          `Investment capital ready`,
          `Financial independence closer`
        ];
        bestCase.financialImpact = Math.round(targetSavings);
        // No worst case for savings improvement
      }
      else if (scenario.id === 'expense_increase') {
        // This is already a negative scenario - flip the logic
        const increase = scenario.details?.financialImpact || m.totalExpenses * 0.2;
        bestCase.points = [
          `Absorb 50% with existing reserves`,
          `Quick cost optimization offsets rest`,
          `Net impact: ₹${Math.round(increase * 0.5).toLocaleString('en-IN')}`,
          `Emerge with tighter cost structure`
        ];
        bestCase.financialImpact = Math.round(increase * 0.5);
        bestCase.impact = -Math.round(Math.abs(cardImpact) * 0.4); // Less negative
        
        worstCase.show = true;
        worstCase.points = [
          `Full ₹${Math.round(increase).toLocaleString('en-IN')} impact absorbed`,
          `Profit margin: ${(m.profitMargin - 15).toFixed(1)}%`,
          `Cash reserves depleted`,
          `May need working capital loan`
        ];
        worstCase.financialImpact = Math.round(increase);
        worstCase.impact = cardImpact - 4; // More negative than card
      }
      else if (scenario.id === 'revenue_drop') {
        const drop = scenario.details?.financialImpact || m.totalRevenue * 0.25;
        bestCase.points = [
          `Quick pivot finds replacement revenue`,
          `Net loss limited to ₹${Math.round(drop * 0.3).toLocaleString('en-IN')}`,
          `Lean operations weather the storm`,
          `Emerge with diversified client base`
        ];
        bestCase.financialImpact = Math.round(drop * 0.3);
        bestCase.impact = -Math.round(Math.abs(cardImpact) * 0.3);
        
        worstCase.show = true;
        worstCase.points = [
          `Full ₹${Math.round(drop).toLocaleString('en-IN')} revenue loss`,
          `Cannot cover fixed costs`,
          `Emergency measures needed`,
          `Business survival at risk`
        ];
        worstCase.financialImpact = Math.round(drop);
        worstCase.impact = cardImpact - 5;
      }
      else if (scenario.id === 'lose_top_client') {
        const loss = m.topRevenueStream?.amount || m.totalRevenue * 0.5;
        bestCase.points = [
          `Have backup clients ready`,
          `Recover 60% within 2 months`,
          `Net loss: ₹${Math.round(loss * 0.4).toLocaleString('en-IN')}`,
          `Forced diversification (good long-term)`
        ];
        bestCase.financialImpact = Math.round(loss * 0.4);
        bestCase.impact = -Math.round(Math.abs(cardImpact) * 0.4);
        
        worstCase.show = true;
        worstCase.points = [
          `Lose ₹${Math.round(loss).toLocaleString('en-IN')} immediately`,
          `No replacement revenue lined up`,
          `Fixed costs continue`,
          `May need to shut down operations`
        ];
        worstCase.financialImpact = Math.round(loss);
        worstCase.impact = cardImpact - 5;
      }
      else if (scenario.id === 'delayed_payments') {
        const impact = scenario.details?.financialImpact || m.totalRevenue * 0.08;
        bestCase.points = [
          `Have credit line to bridge gap`,
          `Interest cost: ₹${Math.round(impact * 0.3).toLocaleString('en-IN')}`,
          `Client eventually pays`,
          `Improve payment terms going forward`
        ];
        bestCase.financialImpact = Math.round(impact * 0.3);
        bestCase.impact = -Math.round(Math.abs(cardImpact) * 0.4);
        
        worstCase.show = true;
        worstCase.points = [
          `Cash crunch delays your payments`,
          `Late payment penalties: ₹${Math.round(impact).toLocaleString('en-IN')}`,
          `Vendor relationships strained`,
          `Credit score impact`
        ];
        worstCase.financialImpact = Math.round(impact);
        worstCase.impact = cardImpact - 3;
      }
      else if (scenario.isCustom) {
        // AI-generated custom scenario - use the AI-provided best/worst case
        const aiBestCase = scenario.details?.bestCase;
        const aiWorstCase = scenario.details?.worstCase;
        
        if (aiBestCase && aiBestCase.points && aiBestCase.points.length > 0) {
          bestCase.points = aiBestCase.points;
          bestCase.financialImpact = aiBestCase.financialImpact || 50000;
          bestCase.impact = aiBestCase.impactPoints || cardImpact;
        } else {
          // Fallback if AI didn't provide proper bestCase
          bestCase.points = [
            'Scenario executed successfully',
            'Expected financial benefits realized',
            'Positive impact on business operations'
          ];
          bestCase.financialImpact = 50000;
          bestCase.impact = Math.abs(cardImpact);
        }
        
        if (aiWorstCase && aiWorstCase.points && aiWorstCase.points.length > 0) {
          worstCase.show = true;
          worstCase.points = aiWorstCase.points;
          worstCase.financialImpact = aiWorstCase.financialImpact || 20000;
          worstCase.impact = aiWorstCase.impactPoints || -Math.abs(cardImpact);
        } else {
          // If no worst case from AI, still show one for custom scenarios
          worstCase.show = true;
          worstCase.points = [
            'Scenario doesn\'t work as expected',
            'Hidden costs or complications arise',
            'Time and resources wasted'
          ];
          worstCase.financialImpact = Math.round(bestCase.financialImpact * 0.3);
          worstCase.impact = -Math.abs(cardImpact);
        }
      }
      else {
        // Default fallback - but make it specific
        bestCase.points = scenario.details?.benefits || [
          `Positive impact on cash flow`,
          `Improved financial stability`,
          `Better positioned for growth`
        ];
        bestCase.financialImpact = scenario.details?.financialImpact || 10000;
        
        if (scenario.type === 'negative' || scenario.details?.consequences) {
          worstCase.show = true;
          worstCase.points = scenario.details?.consequences || [
            'Full negative impact realized',
            'May require corrective action'
          ];
          worstCase.financialImpact = scenario.details?.financialImpact ? Math.round(scenario.details.financialImpact * 0.5) : 5000;
          worstCase.impact = Math.min(-1, -Math.abs(cardImpact) * 0.5);
        }
      }
      
      return { bestCase, worstCase };
    };
    
    const { bestCase, worstCase } = generateCases();
    
    // Determine recommendation based on user's financial health and scenario type
    const getRecommendation = () => {
      // For custom scenarios, use the AI-provided smart recommendation
      if (scenario.isCustom && scenario.details?.recommendation) {
        return {
          suggest: 'smart',
          reason: scenario.details.recommendation
        };
      }
      
      // If no worst case exists, always recommend best case
      if (!worstCase.show) {
        return {
          suggest: 'best',
          reason: `This is a low-risk improvement. Your ${scenario.title.toLowerCase()} has no significant downside.`
        };
      }
      
      if (m.profitMargin < 10) {
        return {
          suggest: 'best',
          reason: `With ${m.profitMargin?.toFixed(1)}% profit margin, prioritize the best case. You need to improve margins.`
        };
      }
      if (m.savingsRate < 10) {
        return {
          suggest: 'best',
          reason: `Your savings rate is ${m.savingsRate?.toFixed(1)}%. Aim for best case to build financial buffer.`
        };
      }
      if (scenario.type === 'negative') {
        return {
          suggest: 'worst',
          reason: `This is a risk scenario. Plan for worst case to ensure your business can survive it.`
        };
      }
      return {
        suggest: 'best',
        reason: scenario.details?.recommendation || 'Your financial health supports pursuing the best case outcome.'
      };
    };
    
    const recommendation = getRecommendation();
    
    // Apply simulation
    const applySimulation = (caseType) => {
      const impact = caseType === 'best' ? bestCase.impact : worstCase.impact;
      const newScore = Math.max(0, Math.min(100, baseHealthScore + impact));
      setHealthScore(newScore);
      setActiveSimulation({
        ...scenario,
        appliedCase: caseType,
        appliedImpact: impact
      });
      setAnimateScore(true);
      onClose();
    };
    
    return (
      <div className="scenario-modal-overlay" onClick={onClose}>
        <div className="scenario-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
          <button className="modal-close" onClick={onClose}>
            <X />
          </button>
          
          <div className="modal-header" style={{ background: scenario.gradient }}>
            <scenario.icon className="modal-icon" />
            <h2>{scenario.title}</h2>
          </div>
          
          <div className="modal-body" style={{ padding: '24px' }}>
            {/* Current Score */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Current Health Score</div>
              <div style={{ 
                fontSize: '48px', 
                fontWeight: '700', 
                color: getScoreColor(baseHealthScore),
                lineHeight: 1
              }}>{baseHealthScore}</div>
            </div>
            
            {/* Best Case vs Worst Case */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {/* Best Case */}
              <div 
                onClick={() => setSelectedCase('best')}
                style={{
                  background: selectedCase === 'best' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.05)',
                  border: selectedCase === 'best' ? '2px solid #22c55e' : '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <ArrowUp style={{ color: '#22c55e' }} size={20} />
                  <span style={{ fontWeight: '600', color: '#22c55e' }}>Best Case</span>
                  <span style={{ 
                    marginLeft: 'auto', 
                    background: '#22c55e', 
                    color: '#000', 
                    padding: '4px 8px', 
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}>
                    {bestCase.impact > 0 ? '+' : ''}{bestCase.impact} pts
                  </span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e', marginBottom: '12px' }}>
                  {Math.max(0, Math.min(100, baseHealthScore + bestCase.impact))}
                  <span style={{ fontSize: '14px', fontWeight: '400', color: '#94a3b8' }}> new score</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', color: '#e2e8f0', fontSize: '13px' }}>
                  {bestCase.points.map((point, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>{point}</li>
                  ))}
                </ul>
                <div style={{ 
                  marginTop: '12px', 
                  padding: '8px 12px', 
                  background: 'rgba(34, 197, 94, 0.2)', 
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#22c55e'
                }}>
                  💰 Impact: {bestCase.impact > 0 ? '+' : ''}₹{bestCase.financialImpact.toLocaleString('en-IN')}
                </div>
              </div>
              
              {/* Worst Case - Only show if there's a genuine risk */}
              {worstCase.show ? (
              <div 
                onClick={() => setSelectedCase('worst')}
                style={{
                  background: selectedCase === 'worst' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.05)',
                  border: selectedCase === 'worst' ? '2px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <ArrowDown style={{ color: '#ef4444' }} size={20} />
                  <span style={{ fontWeight: '600', color: '#ef4444' }}>Worst Case</span>
                  <span style={{ 
                    marginLeft: 'auto', 
                    background: '#ef4444', 
                    color: '#fff', 
                    padding: '4px 8px', 
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}>
                    {worstCase.impact > 0 ? '+' : ''}{worstCase.impact} pts
                  </span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444', marginBottom: '12px' }}>
                  {Math.max(0, Math.min(100, baseHealthScore + worstCase.impact))}
                  <span style={{ fontSize: '14px', fontWeight: '400', color: '#94a3b8' }}> new score</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', color: '#e2e8f0', fontSize: '13px' }}>
                  {worstCase.points.map((point, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>{point}</li>
                  ))}
                </ul>
                <div style={{ 
                  marginTop: '12px', 
                  padding: '8px 12px', 
                  background: 'rgba(239, 68, 68, 0.2)', 
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#ef4444'
                }}>
                  💸 Risk: -₹{worstCase.financialImpact.toLocaleString('en-IN')}
                </div>
              </div>
              ) : (
                <div 
                  style={{
                    background: 'rgba(100, 116, 139, 0.1)',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '12px',
                    padding: '24px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}
                >
                  <CheckCircle style={{ color: '#22c55e', marginBottom: '12px' }} size={32} />
                  <span style={{ fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>No Significant Downside</span>
                  <span style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                    This is a low-risk improvement with no significant worst case scenario. Proceed with confidence.
                  </span>
                </div>
              )}
            </div>
            
            {/* AI Recommendation */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles style={{ color: '#D4AF37' }} size={18} />
                <span style={{ fontWeight: '600', color: '#D4AF37' }}>
                  {recommendation.suggest === 'smart' ? '💡 Smart Alternative' : 'AI Recommendation'}
                </span>
                {worstCase.show && recommendation.suggest !== 'smart' && (
                  <span style={{
                    marginLeft: 'auto',
                    background: recommendation.suggest === 'best' ? '#22c55e' : '#ef4444',
                    color: recommendation.suggest === 'best' ? '#000' : '#fff',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    Plan for {recommendation.suggest} case
                  </span>
                )}
              </div>
              <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14px', lineHeight: '1.5' }}>
                {recommendation.reason}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {/* Best Case Button - Always clickable when no worst case exists */}
              <button
                onClick={() => worstCase.show ? (selectedCase === 'best' && applySimulation('best')) : applySimulation('best')}
                disabled={worstCase.show && selectedCase !== 'best'}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: (!worstCase.show || selectedCase === 'best')
                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' 
                    : 'rgba(34, 197, 94, 0.2)',
                  color: (!worstCase.show || selectedCase === 'best') ? '#000' : '#22c55e',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: (!worstCase.show || selectedCase === 'best') ? 'pointer' : 'not-allowed',
                  opacity: (!worstCase.show || selectedCase === 'best') ? 1 : 0.5,
                  transition: 'all 0.2s'
                }}
              >
                <ArrowUp size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                {worstCase.show ? 'Simulate Best Case' : 'Apply This Improvement'}
              </button>
              {worstCase.show && (
                <button
                  onClick={() => applySimulation('worst')}
                  disabled={selectedCase !== 'worst'}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: selectedCase === 'worst' 
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                      : 'rgba(239, 68, 68, 0.2)',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: selectedCase === 'worst' ? 'pointer' : 'not-allowed',
                    opacity: selectedCase === 'worst' ? 1 : 0.5,
                    transition: 'all 0.2s'
                  }}
                >
                  <ArrowDown size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Simulate Worst Case
                </button>
              )}
            </div>
            
            {worstCase.show && (
              <p style={{ 
                textAlign: 'center', 
                color: '#64748b', 
                fontSize: '12px', 
                marginTop: '12px',
                marginBottom: 0 
              }}>
                Click on Best Case or Worst Case above to select, then simulate
              </p>
            )}
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
        {activeSimulation && (
          <div className="simulation-banner">
            <span className="simulation-label">
              <Play className="sim-icon" /> Simulating: {activeSimulation.title}
            </span>
            <button className="reset-simulation-btn" onClick={resetSimulation}>
              <RotateCcw /> Reset
            </button>
          </div>
        )}
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
        <div className="scenarios-header">
          <div>
            <h3 className="scenarios-title">What If Scenarios</h3>
            <p className="scenarios-subtitle">Click to see how each action affects your financial health</p>
          </div>
          <button 
            className="add-scenario-btn"
            onClick={() => setShowScenarioChat(true)}
          >
            <Plus className="btn-icon" /> Simulate Scenario
          </button>
        </div>
        
        {/* Custom Scenarios (AI Generated) */}
        {customScenarios.length > 0 && (
          <div className="custom-scenarios-section">
            <h4 className="custom-title"><Sparkles /> Your Custom Scenarios</h4>
            <div className="scenarios-grid">
              {customScenarios.map((scenario) => {
                const Icon = scenario.icon;
                const isActive = activeSimulation?.id === scenario.id;
                return (
                  <div
                    key={scenario.id}
                    className={`scenario-card ${scenario.type} ${isActive ? 'simulating' : ''} custom-card`}
                    onClick={() => setSelectedScenario(scenario)}
                    style={{ '--card-gradient': scenario.gradient }}
                  >
                    <button 
                      className="delete-scenario-btn"
                      onClick={(e) => deleteCustomScenario(scenario.id, e)}
                      title="Delete scenario"
                    >
                      <X />
                    </button>
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
                    <button 
                      className={`simulate-btn ${isActive ? 'active' : ''}`}
                      onClick={(e) => simulateScenario(scenario, e)}
                    >
                      {isActive ? (
                        <><RotateCcw className="btn-icon" /> Reset</>
                      ) : (
                        <><Play className="btn-icon" /> Simulate</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Default Scenarios */}
        <div className="scenarios-grid">
          {scenarios.map((scenario) => {
            const Icon = scenario.icon;
            const isActive = activeSimulation?.id === scenario.id;
            return (
              <div
                key={scenario.id}
                className={`scenario-card ${scenario.type} ${isActive ? 'simulating' : ''}`}
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
                <button 
                  className={`simulate-btn ${isActive ? 'active' : ''}`}
                  onClick={(e) => simulateScenario(scenario, e)}
                >
                  {isActive ? (
                    <><RotateCcw className="btn-icon" /> Reset</>
                  ) : (
                    <><Play className="btn-icon" /> Simulate</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Scenario Chat Modal */}
      {showScenarioChat && (
        <div className="scenario-chat-overlay" onClick={() => setShowScenarioChat(false)}>
          <div className="scenario-chat-modal" onClick={e => e.stopPropagation()}>
            <div className="chat-header">
              <div className="chat-title">
                <Sparkles className="chat-icon" />
                <h3>Create Custom Scenario</h3>
              </div>
              <button className="close-chat" onClick={() => setShowScenarioChat(false)}>
                <X />
              </button>
            </div>
            
            <div className="chat-body">
              <div className="chat-intro">
                <p>Describe a financial scenario you want to simulate. For example:</p>
                <div className="example-prompts">
                  <button onClick={() => setScenarioInput("What if I get a ₹5 lakh investment?")}>
                    💰 Get ₹5 lakh investment
                  </button>
                  <button onClick={() => setScenarioInput("What if I hire 2 new employees at ₹50,000/month each?")}>
                    👥 Hire 2 employees
                  </button>
                  <button onClick={() => setScenarioInput("What if I lose my biggest client?")}>
                    📉 Lose biggest client
                  </button>
                  <button onClick={() => setScenarioInput("What if I double my marketing spend?")}>
                    📢 Double marketing
                  </button>
                </div>
              </div>
              
              <div className="chat-messages">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-message ${msg.role}`}>
                    {msg.content}
                  </div>
                ))}
                {isGenerating && (
                  <div className="chat-message assistant generating">
                    <Loader2 className="spin" /> Analyzing scenario...
                  </div>
                )}
              </div>
            </div>
            
            <div className="chat-input-area">
              <input
                type="text"
                value={scenarioInput}
                onChange={(e) => setScenarioInput(e.target.value)}
                placeholder="Describe your scenario..."
                onKeyPress={(e) => e.key === 'Enter' && generateCustomScenario()}
                disabled={isGenerating}
              />
              <button 
                className="send-btn"
                onClick={generateCustomScenario}
                disabled={!scenarioInput.trim() || isGenerating}
              >
                {isGenerating ? <Loader2 className="spin" /> : <Send />}
              </button>
            </div>
          </div>
        </div>
      )}

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
