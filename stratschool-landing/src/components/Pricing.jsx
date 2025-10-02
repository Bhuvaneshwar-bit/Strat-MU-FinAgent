import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Star, 
  TrendingUp, 
  Shield, 
  Zap,
  Crown,
  Rocket
} from 'lucide-react';
import '../styles/Pricing.css';

const Pricing = ({ onBookDemo }) => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      name: "Starter",
      subtitle: "Perfect for new entrepreneurs",
      icon: <Zap />,
      price: {
        monthly: 2999,
        annual: 29990
      },
      savings: 17,
      features: [
        "Automated bookkeeping",
        "Expense categorization", 
        "Basic financial dashboard",
        "P&L statement generation",
        "Email support",
        "Up to 500 transactions/month",
        "Mobile app access",
        "Basic reporting"
      ],
      limitations: [
        "No cashflow forecasting",
        "No investor reports",
        "No GST filing automation",
        "No AI advisor chat"
      ],
      popular: false,
      cta: "Start Free Trial"
    },
    {
      name: "Professional",
      subtitle: "For growing businesses",
      icon: <TrendingUp />,
      price: {
        monthly: 4999,
        annual: 49990
      },
      savings: 17,
      features: [
        "Everything in Starter",
        "AI-powered cashflow forecasting",
        "Advanced financial dashboard",
        "Investor-ready reports",
        "GST filing automation",
        "Priority email support",
        "Up to 2,000 transactions/month",
        "Custom report templates",
        "API access",
        "Multi-currency support"
      ],
      limitations: [
        "No AI advisor chat",
        "No phone support"
      ],
      popular: true,
      cta: "Start Free Trial"
    },
    {
      name: "Enterprise",
      subtitle: "For established startups",
      icon: <Crown />,
      price: {
        monthly: 9999,
        annual: 99990
      },
      savings: 17,
      features: [
        "Everything in Professional",
        "24/7 AI Financial Advisor",
        "Unlimited transactions",
        "Advanced scenario planning",
        "Custom integrations",
        "Dedicated account manager",
        "Phone + email support",
        "White-label reports",
        "Team collaboration tools",
        "Advanced compliance features",
        "Custom workflows",
        "Priority feature requests"
      ],
      limitations: [],
      popular: false,
      cta: "Contact Sales"
    }
  ];

  const faqs = [
    {
      question: "Is there a free trial?",
      answer: "Yes! We offer a 14-day free trial with full access to all features. No credit card required."
    },
    {
      question: "Can I change my plan anytime?",
      answer: "Absolutely. You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, UPI, net banking, and digital wallets. All payments are processed securely."
    },
    {
      question: "Is my financial data secure?",
      answer: "Yes, we use bank-level encryption and security measures. Your data is stored securely and never shared with third parties."
    },
    {
      question: "Do you offer refunds?",
      answer: "We offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund."
    },
    {
      question: "Can I integrate with my existing accounting software?",
      answer: "Yes, we integrate with popular accounting software like QuickBooks, Zoho Books, and more. API access is available in Professional+ plans."
    }
  ];

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <section id="pricing" className="pricing">
      <div className="pricing-container">
        <div className="pricing-header">
          <div className="section-badge">
            <Star className="badge-icon" />
            <span>Simple Pricing</span>
          </div>
          <h2 className="pricing-title">
            Choose the plan that grows with your business
          </h2>
          <p className="pricing-description">
            Start with our free trial and scale as you grow. All plans include core features 
            with no hidden fees or setup costs.
          </p>
          
          <div className="billing-toggle">
            <span className={billingCycle === 'monthly' ? 'active' : ''}>Monthly</span>
            <button 
              className="toggle-switch"
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            >
              <div className={`toggle-slider ${billingCycle === 'annual' ? 'annual' : 'monthly'}`}></div>
            </button>
            <span className={billingCycle === 'annual' ? 'active' : ''}>
              Annual 
              <span className="savings-badge">Save 17%</span>
            </span>
          </div>
        </div>

        <div className="pricing-grid">
          {plans.map((plan, index) => (
            <div key={index} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
              {plan.popular && (
                <div className="popular-badge">
                  <Star className="badge-star" />
                  Most Popular
                </div>
              )}
              
              <div className="plan-header">
                <div className="plan-icon">
                  {plan.icon}
                </div>
                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-subtitle">{plan.subtitle}</p>
              </div>

              <div className="plan-pricing">
                <div className="price">
                  <span className="currency">₹</span>
                  <span className="amount">
                    {billingCycle === 'monthly' 
                      ? plan.price.monthly.toLocaleString('en-IN')
                      : Math.floor(plan.price.annual / 12).toLocaleString('en-IN')
                    }
                  </span>
                  <span className="period">/month</span>
                </div>
                {billingCycle === 'annual' && (
                  <div className="annual-price">
                    {formatPrice(plan.price.annual)} billed annually
                  </div>
                )}
              </div>

              <button 
                className={`plan-cta ${plan.popular ? 'popular-cta' : ''}`}
                onClick={plan.cta === 'Contact Sales' ? onBookDemo : () => {}}
              >
                {plan.cta}
                <Rocket className="cta-icon" />
              </button>

              <div className="plan-features">
                <h4>What's included:</h4>
                <ul className="features-list">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="feature-item">
                      <Check className="feature-check" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {plan.limitations.length > 0 && (
                  <ul className="limitations-list">
                    {plan.limitations.map((limitation, idx) => (
                      <li key={idx} className="limitation-item">
                        <X className="limitation-x" />
                        <span>{limitation}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pricing-features">
          <h3 className="features-title">All plans include:</h3>
          <div className="features-grid">
            <div className="feature-item">
              <Shield className="feature-icon" />
              <span>Bank-level security</span>
            </div>
            <div className="feature-item">
              <TrendingUp className="feature-icon" />
              <span>Real-time sync</span>
            </div>
            <div className="feature-item">
              <Zap className="feature-icon" />
              <span>Mobile app access</span>
            </div>
            <div className="feature-item">
              <Crown className="feature-icon" />
              <span>Regular updates</span>
            </div>
          </div>
        </div>

        <div className="faq-section">
          <h3 className="faq-title">Frequently Asked Questions</h3>
          <div className="faq-grid">
            {faqs.map((faq, index) => (
              <div key={index} className="faq-item">
                <h4 className="faq-question">{faq.question}</h4>
                <p className="faq-answer">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="pricing-cta">
          <div className="cta-content">
            <h3 className="cta-title">Ready to get started?</h3>
            <p className="cta-description">
              Join hundreds of entrepreneurs who've already automated their finances
            </p>
          </div>
          <div className="cta-buttons">
            <button className="cta-primary" onClick={onBookDemo}>
              Book a Demo
              <TrendingUp className="cta-icon" />
            </button>
            <button className="cta-secondary">
              Start Free Trial
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;