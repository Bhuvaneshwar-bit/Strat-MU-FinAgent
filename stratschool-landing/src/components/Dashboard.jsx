import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Calculator, 
  FileText,
  Target,
  Settings,
  Bell,
  User,
  LogOut,
  Search,
  Brain,
  Zap,
  Shield,
  Lightbulb,
  ArrowUpRight,
  Download,
  RefreshCw,
  ChevronRight,
  Receipt,
  BookOpen
} from 'lucide-react';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import '../styles/ProfessionalDashboard.css';
import InvoiceGeneration from './InvoiceGeneration';
import AutomationPanel from './AutomationPanel';
import BookkeepingDashboard from './BookkeepingDashboard';

const Dashboard = ({ user, onLogout, onboardingData }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [overviewData, setOverviewData] = useState(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Load real-time overview data
  useEffect(() => {
    loadOverviewData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadOverviewData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Trigger animation when data loads
  useEffect(() => {
    if (overviewData && !isAnimating) {
      setIsAnimating(true);
    }
  }, [overviewData]);

  const loadOverviewData = async () => {
    try {
      setIsLoadingOverview(true);
      console.log('📊 Loading real-time overview data...');
      
      const response = await fetch(buildApiUrl(API_ENDPOINTS.OVERVIEW_DASHBOARD));
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Overview data loaded:', result);
        setOverviewData(result.data);
      } else {
        console.error('❌ Failed to load overview data:', response.status);
      }
    } catch (error) {
      console.error('❌ Error loading overview data:', error);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const handleRefreshOverview = () => {
    setIsAnimating(false);
    loadOverviewData();
  };

  const handleQuickAction = (actionType) => {
    switch (actionType) {
      case 'bookkeeping':
        setActiveTab('bookkeeping');
        break;
      case 'report':
        setActiveTab('reports');
        break;
      case 'forecast':
        setActiveTab('forecasting');
        break;
      default:
        break;
    }
  };

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'automation', label: 'Automation', icon: Zap },
    { id: 'bookkeeping', label: 'Automated Bookkeeping', icon: BookOpen },
    { id: 'forecasting', label: 'Forecasting', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'invoice', label: 'Invoice Generation', icon: Receipt },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Dynamic AI metrics based on real data
  const getAiMetrics = () => {
    if (!overviewData) {
      return [
        { title: 'Cash Flow Health', value: 'Loading...', subValue: '', change: '', trend: 'neutral', icon: DollarSign, description: 'Calculating...' },
        { title: 'AI Automation', value: 'Loading...', subValue: '', change: '', trend: 'neutral', icon: Zap, description: 'Analyzing...' },
        { title: 'Cost Optimization', value: 'Loading...', subValue: '', change: '', trend: 'neutral', icon: Target, description: 'Processing...' },
        { title: 'Forecast Accuracy', value: 'Loading...', subValue: '', change: '', trend: 'neutral', icon: Brain, description: 'Computing...' }
      ];
    }

    return [
      {
        title: 'Cash Flow Health',
        value: overviewData.cashFlowHealth.status,
        subValue: `$${overviewData.cashFlowHealth.amount.toLocaleString()}`,
        change: overviewData.cashFlowHealth.percentage,
        trend: overviewData.cashFlowHealth.trend,
        icon: DollarSign,
        description: overviewData.cashFlowHealth.description
      },
      {
        title: 'AI Automation',
        value: overviewData.aiAutomation.status,
        subValue: `${overviewData.aiAutomation.tasksProcessed} tasks`,
        change: overviewData.aiAutomation.automationRate,
        trend: overviewData.aiAutomation.trend,
        icon: Zap,
        description: overviewData.aiAutomation.description
      },
      {
        title: 'Cost Optimization',
        value: overviewData.costOptimization.status,
        subValue: `$${overviewData.costOptimization.amount.toLocaleString()}`,
        change: overviewData.costOptimization.percentage,
        trend: overviewData.costOptimization.trend,
        icon: Target,
        description: overviewData.costOptimization.description
      },
      {
        title: 'Forecast Accuracy',
        value: overviewData.forecastAccuracy.percentage,
        subValue: overviewData.forecastAccuracy.confidence,
        change: '+2.1%',
        trend: overviewData.forecastAccuracy.trend,
        icon: Brain,
        description: overviewData.forecastAccuracy.description
      }
    ];
  };

  // Dynamic core capabilities
  const getCoreCapabilities = () => {
    if (!overviewData) {
      return [
        {
          title: 'Intelligent Bookkeeping',
          description: 'Loading real-time bookkeeping data...',
          features: ['Initializing...'],
          status: 'loading',
          icon: Calculator,
          color: 'blue'
        },
        {
          title: 'Advanced Cash Flow Management',
          description: 'Calculating cash flow metrics...',
          features: ['Processing...'],
          status: 'loading',
          icon: DollarSign,
          color: 'green'
        }
      ];
    }

    return [
      {
        title: 'Intelligent Bookkeeping',
        description: `AI automatically categorizes transactions, reconciles accounts, and maintains accurate records with ${overviewData.capabilities.intelligentBookkeeping.precision} precision.`,
        features: overviewData.capabilities.intelligentBookkeeping.features
          .filter(f => f.active)
          .map(f => f.name),
        status: overviewData.capabilities.intelligentBookkeeping.active ? 'active' : 'inactive',
        icon: Calculator,
        color: 'blue'
      },
      {
        title: 'Advanced Cash Flow Management',
        description: 'Predictive cash flow modeling with 13-week rolling forecasts and intelligent payment optimization strategies.',
        features: overviewData.capabilities.cashFlowManagement.features
          .filter(f => f.active)
          .map(f => f.name),
        status: overviewData.capabilities.cashFlowManagement.active ? 'active' : 'inactive',
        icon: DollarSign,
        color: 'green'
      },
      {
        title: 'Professional Financial Reports',
        description: 'Generate investor-ready financial statements with AI-powered insights and comprehensive analytics.',
        features: ['P&L statements', 'Balance sheets', 'Cash flow reports', 'Executive summaries'],
        status: 'active',
        icon: FileText,
        color: 'purple'
      },
      {
        title: 'Strategic Financial Advisory',
        description: 'CFO-level insights and recommendations powered by AI analysis of your business performance.',
        features: ['Growth strategy recommendations', 'Investment guidance', 'Risk mitigation plans', 'Cost optimization alerts'],
        status: 'active',
        icon: Lightbulb,
        color: 'orange'
      }
    ];
  };

  const quickActions = [
    { title: 'Process Bank Statement', icon: BookOpen, action: 'bookkeeping' },
    { title: 'Generate Monthly Report', icon: FileText, action: 'report' },
    { title: 'Run Financial Health Check', icon: Brain, action: 'health-check' },
    { title: 'View Cash Flow Forecast', icon: TrendingUp, action: 'forecast' }
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

        <div className="header-search">
          <div className="search-container">
            <Search className="search-icon" />
            <input 
              type="text" 
              placeholder="Ask your AI CFO anything..." 
              className="search-input"
            />
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
              {/* Professional Welcome Section */}
              <section className="welcome-section">
                <div className="welcome-content">
                  <h2>Welcome back, {user?.firstName}!</h2>
                  <p>Your AI CFO has been working 24/7 to optimize your financial operations</p>
                </div>
                <div className="welcome-actions">
                  {quickActions.map((action, index) => (
                    <button 
                      key={index} 
                      className="quick-action"
                      onClick={() => handleQuickAction(action.action)}
                    >
                      <action.icon className="action-icon" />
                      <span>{action.title}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* AI Metrics Grid */}
              <section className="metrics-section">
                <div className="section-header">
                  <h3>AI-Powered Insights</h3>
                  <div className="header-actions">
                    <button 
                      className="secondary-button"
                      onClick={handleRefreshOverview}
                      disabled={isLoadingOverview}
                    >
                      <RefreshCw className={`button-icon ${isLoadingOverview ? 'spinning' : ''}`} />
                      Refresh
                    </button>
                    <button className="primary-button">
                      <Download className="button-icon" />
                      Export
                    </button>
                  </div>
                </div>

                <div className="metrics-grid">
                  {getAiMetrics().map((metric, index) => {
                    const Icon = metric.icon;
                    return (
                      <div 
                        key={index} 
                        className={`metric-card ${isAnimating ? 'slide-up' : ''}`}
                        style={{
                          animationDelay: `${index * 150}ms`,
                          opacity: isAnimating ? 1 : 0,
                          transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="metric-header">
                          <div className="metric-icon">
                            <Icon />
                          </div>
                          <div className="metric-trend">
                            <span className={`trend-indicator ${metric.trend}`}>
                              <ArrowUpRight className="trend-arrow" />
                              {metric.change}
                            </span>
                          </div>
                        </div>
                        <div className="metric-content">
                          <h4 className="metric-title">{metric.title}</h4>
                          <div className="metric-value">{metric.value}</div>
                          <div className="metric-subvalue">{metric.subValue}</div>
                          <p className="metric-description">{metric.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Core Capabilities */}
              <section className="capabilities-section">
                <div className="section-header">
                  <h3>Your AI CFO Capabilities</h3>
                  <span className="capability-badge">
                    <Brain className="badge-icon" />
                    {overviewData ? 
                      `${Object.values(overviewData.capabilities).filter(cap => cap.active).length} AI Systems Active` : 
                      'Initializing AI Systems...'
                    }
                  </span>
                </div>

                <div className="capabilities-grid">
                  {getCoreCapabilities().map((capability, index) => {
                    const Icon = capability.icon;
                    return (
                      <div 
                        key={index} 
                        className={`capability-card ${capability.color} ${isAnimating ? 'slide-up' : ''}`}
                        style={{
                          animationDelay: `${(index + 4) * 150}ms`,
                          opacity: isAnimating ? 1 : 0,
                          transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="capability-header">
                          <div className="capability-icon">
                            <Icon />
                          </div>
                          <div className="capability-status">
                            <span className="status-indicator active">
                              <Zap className="status-icon" />
                              Active
                            </span>
                          </div>
                        </div>
                        
                        <div className="capability-content">
                          <h4 className="capability-title">{capability.title}</h4>
                          <p className="capability-description">{capability.description}</p>
                          
                          <ul className="capability-features">
                            {capability.features.map((feature, featureIndex) => (
                              <li key={featureIndex} className="feature-item">
                                <div className="feature-check">✓</div>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="capability-footer">
                          <button className="capability-action">
                            View Details
                            <ChevronRight className="action-arrow" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {/* Additional tab content */}
          {activeTab === 'automation' && (
            <AutomationPanel 
              user={user} 
              hasProcessedBankStatement={onboardingData?.hasProcessedBankStatement || false}
              plData={onboardingData?.plData || null}
            />
          )}

          {activeTab === 'bookkeeping' && (
            <BookkeepingDashboard user={user} />
          )}

          {activeTab === 'forecasting' && (
            <div className="tab-placeholder">
              <div className="placeholder-content">
                <div className="placeholder-icon">
                  <TrendingUp />
                </div>
                <h3>Predictive Forecasting</h3>
                <p>AI-powered financial forecasting with 13-week rolling predictions, scenario planning, and risk analysis to help you make informed strategic decisions.</p>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="tab-placeholder">
              <div className="placeholder-content">
                <div className="placeholder-icon">
                  <FileText />
                </div>
                <h3>Financial Reports</h3>
                <p>Generate comprehensive financial statements, investor-ready reports, and executive summaries with AI-powered insights and analytics.</p>
              </div>
            </div>
          )}

          {activeTab === 'invoice' && (
            <InvoiceGeneration user={user} />
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
    </div>
  );
};

export default Dashboard;