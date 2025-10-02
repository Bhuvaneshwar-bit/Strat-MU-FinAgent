import React, { useState } from 'react';
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
  Plus,
  Filter,
  Download,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import '../styles/ProfessionalDashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'automation', label: 'Automation', icon: Zap },
    { id: 'forecasting', label: 'Forecasting', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const aiMetrics = [
    {
      title: 'Cash Flow Health',
      value: 'Excellent',
      subValue: '$127,340',
      change: '+18.2%',
      trend: 'positive',
      icon: DollarSign,
      description: '3-month runway secured'
    },
    {
      title: 'AI Automation',
      value: '24/7 Active',
      subValue: '847 tasks',
      change: '+156%',
      trend: 'positive',
      icon: Zap,
      description: 'Processed this month'
    },
    {
      title: 'Cost Optimization',
      value: 'Saving 23%',
      subValue: '$8,420',
      change: '+$2,100',
      trend: 'positive',
      icon: Target,
      description: 'Monthly savings identified'
    },
    {
      title: 'Forecast Accuracy',
      value: '97.4%',
      subValue: 'High confidence',
      change: '+2.1%',
      trend: 'positive',
      icon: Brain,
      description: 'Prediction reliability'
    }
  ];

  const coreCapabilities = [
    {
      title: 'Intelligent Bookkeeping',
      description: 'AI automatically categorizes transactions, reconciles accounts, and maintains accurate records with 99.7% precision.',
      features: ['Real-time transaction processing', 'Smart categorization engine', 'Automated reconciliation', 'Receipt scanning & OCR'],
      status: 'active',
      icon: Calculator,
      color: 'blue'
    },
    {
      title: 'Advanced Cash Flow Management',
      description: 'Predictive cash flow modeling with 13-week rolling forecasts and intelligent payment optimization strategies.',
      features: ['13-week cash flow forecasts', 'Payment timing optimization', 'Scenario planning', 'Risk alerts & notifications'],
      status: 'active',
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

  const quickActions = [
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
                    <button key={index} className="quick-action">
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
                    <button className="secondary-button">
                      <RefreshCw className="button-icon" />
                      Refresh
                    </button>
                    <button className="primary-button">
                      <Download className="button-icon" />
                      Export
                    </button>
                  </div>
                </div>

                <div className="metrics-grid">
                  {aiMetrics.map((metric, index) => {
                    const Icon = metric.icon;
                    return (
                      <div key={index} className="metric-card">
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
                    4 AI Systems Active
                  </span>
                </div>

                <div className="capabilities-grid">
                  {coreCapabilities.map((capability, index) => {
                    const Icon = capability.icon;
                    return (
                      <div key={index} className={`capability-card ${capability.color}`}>
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

          {/* Additional tab content would go here */}
          {activeTab !== 'overview' && (
            <div className="tab-placeholder">
              <div className="placeholder-content">
                <div className="placeholder-icon">
                  <Brain />
                </div>
                <h3>{navigationItems.find(item => item.id === activeTab)?.label} Coming Soon</h3>
                <p>This advanced AI feature is being developed to provide you with even more powerful financial automation.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;