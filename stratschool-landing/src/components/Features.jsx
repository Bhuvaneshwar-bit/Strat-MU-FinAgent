import React from 'react';
import { 
  BookOpen, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  FileText, 
  Calculator,
  MessageCircle,
  Zap,
  Shield,
  Clock,
  Brain,
  ChartLine
} from 'lucide-react';
import '../styles/Features.css';

const Features = ({ darkMode }) => {
  const features = [
    {
      icon: <BookOpen />,
      title: "Automated Bookkeeping",
      description: "AI-powered transaction categorization and reconciliation. Never miss an entry or spend hours organizing receipts.",
      benefits: ["Real-time sync", "Smart categorization", "Receipt scanning"]
    },
    {
      icon: <DollarSign />,
      title: "Expense Categorization",
      description: "Intelligent expense tracking with automated category assignment. Get insights into your spending patterns.",
      benefits: ["Auto-categorization", "Spending insights", "Tax optimization"]
    },
    {
      icon: <TrendingUp />,
      title: "Cashflow Forecasting",
      description: "Predict your financial future with AI-driven cashflow analysis. Know your runway and plan for growth.",
      benefits: ["Runway calculation", "Scenario planning", "Growth projections"]
    },
    {
      icon: <BarChart3 />,
      title: "Real-time Dashboard",
      description: "Get instant visibility into your financial health with live metrics and interactive charts.",
      benefits: ["Live metrics", "Custom widgets", "Mobile access"]
    },
    {
      icon: <FileText />,
      title: "Investor Ready Reports",
      description: "Generate professional financial reports that investors expect. From pitch decks to detailed analytics.",
      benefits: ["Professional templates", "One-click generation", "Investor insights"]
    },
    {
      icon: <Calculator />,
      title: "Automated GST Filing",
      description: "Stay compliant with automated GST calculations and filing. Never miss a deadline again.",
      benefits: ["Auto calculations", "Deadline reminders", "Compliance tracking"]
    },
    {
      icon: <ChartLine />,
      title: "P&L Statement Generation",
      description: "Automatic profit and loss statement generation with detailed breakdowns and trend analysis.",
      benefits: ["Monthly/Quarterly reports", "Trend analysis", "Export options"]
    },
    {
      icon: <MessageCircle />,
      title: "AI Financial Advisor",
      description: "Chat with your personal AI CFO for insights, recommendations, and financial guidance 24/7.",
      benefits: ["24/7 availability", "Personalized advice", "Natural language"]
    }
  ];

  const benefits = [
    {
      icon: <Zap />,
      title: "95% Time Saved",
      description: "Automate repetitive financial tasks and focus on growing your business"
    },
    {
      icon: <Shield />,
      title: "Bank-level Security",
      description: "Your financial data is protected with enterprise-grade encryption"
    },
    {
      icon: <Clock />,
      title: "Real-time Updates",
      description: "Get instant insights with live data synchronization across all platforms"
    },
    {
      icon: <Brain />,
      title: "AI-Powered Insights",
      description: "Leverage advanced AI to uncover hidden patterns in your financial data"
    }
  ];

  return (
    <section id="features" className={`features ${darkMode ? 'dark' : ''}`}>
      <div className="features-container">
        <div className="features-header">
          <div className="section-badge">
            <Brain className="badge-icon" />
            <span>AI-Powered Features</span>
          </div>
          <h2 className="features-title">
            Everything you need to manage your finances
          </h2>
          <p className="features-description">
            Nebulaa InFINity's AI CFO provides a complete suite of financial tools designed 
            specifically for solo entrepreneurs and startups. No more juggling multiple apps.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <ul className="feature-benefits">
                {feature.benefits.map((benefit, idx) => (
                  <li key={idx} className="feature-benefit">
                    <span className="benefit-dot"></span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="benefits-section">
          <h3 className="benefits-title">Why Choose Nebulaa InFINity AI CFO?</h3>
          <div className="benefits-grid">
            {benefits.map((benefit, index) => (
              <div key={index} className="benefit-card">
                <div className="benefit-icon">
                  {benefit.icon}
                </div>
                <div className="benefit-content">
                  <h4 className="benefit-title">{benefit.title}</h4>
                  <p className="benefit-description">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="features-cta">
          <div className="cta-content">
            <h3 className="cta-title">Ready to automate your finances?</h3>
            <p className="cta-description">
              Join hundreds of entrepreneurs who've already transformed their financial management
            </p>
          </div>
          <button className="cta-button">
            Start Free Trial
            <TrendingUp className="cta-icon" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Features;