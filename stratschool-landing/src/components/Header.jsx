import React, { useState } from 'react';
import { Menu, X, TrendingUp, ChevronDown } from 'lucide-react';
import '../styles/Header.css';

const Header = ({ onBookDemo, onSignIn, onSignUp }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleFeatures = () => {
    setIsFeaturesOpen(!isFeaturesOpen);
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
    setIsFeaturesOpen(false);
  };

  const features = [
    { name: 'Automated Bookkeeping', description: 'AI-powered transaction categorization' },
    { name: 'Expense Categorization', description: 'Smart expense tracking and insights' },
    { name: 'Cashflow Forecasting', description: 'Predict your financial future' },
    { name: 'Real-time Dashboard', description: 'Live financial metrics and charts' },
    { name: 'Investor Reports', description: 'Professional financial reports' },
    { name: 'GST Filing', description: 'Automated tax compliance' },
    { name: 'P&L Generation', description: 'Automatic profit & loss statements' },
    { name: 'AI Financial Advisor', description: '24/7 conversational AI support' }
  ];

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-logo">
          <TrendingUp className="logo-icon" />
          <span className="logo-text">StratSchool</span>
        </div>

        <nav className={`header-nav ${isMenuOpen ? 'nav-open' : ''}`}>
          <button 
            className="nav-link"
            onClick={() => scrollToSection('about')}
          >
            About
          </button>
          <div className="nav-dropdown">
            <button 
              className="nav-link dropdown-trigger"
              onClick={toggleFeatures}
              onMouseEnter={() => setIsFeaturesOpen(true)}
            >
              Features
              <ChevronDown className={`dropdown-icon ${isFeaturesOpen ? 'open' : ''}`} />
            </button>
            {isFeaturesOpen && (
              <div 
                className="dropdown-menu"
                onMouseLeave={() => setIsFeaturesOpen(false)}
              >
                <div className="dropdown-content">
                  {features.map((feature, index) => (
                    <button
                      key={index}
                      className="dropdown-item"
                      onClick={() => scrollToSection('features')}
                    >
                      <div className="dropdown-item-content">
                        <span className="dropdown-item-name">{feature.name}</span>
                        <span className="dropdown-item-desc">{feature.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button 
            className="nav-link"
            onClick={() => scrollToSection('pricing')}
          >
            Pricing
          </button>
          <button 
            className="nav-link"
            onClick={onBookDemo}
          >
            Book Demo
          </button>
        </nav>

        <div className="header-auth">
          <button className="auth-btn signin-btn" onClick={onSignIn}>
            Sign In
          </button>
          <button className="auth-btn signup-btn" onClick={onSignUp}>
            Sign Up
          </button>
        </div>

        <button className="mobile-menu-btn" onClick={toggleMenu}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="mobile-nav">
          <button 
            className="mobile-nav-link"
            onClick={() => scrollToSection('about')}
          >
            About
          </button>
          <div className="mobile-features-section">
            <button 
              className="mobile-nav-link"
              onClick={toggleFeatures}
            >
              Features
              <ChevronDown className={`dropdown-icon ${isFeaturesOpen ? 'open' : ''}`} />
            </button>
            {isFeaturesOpen && (
              <div className="mobile-features-list">
                {features.map((feature, index) => (
                  <button
                    key={index}
                    className="mobile-feature-item"
                    onClick={() => scrollToSection('features')}
                  >
                    {feature.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button 
            className="mobile-nav-link"
            onClick={() => scrollToSection('pricing')}
          >
            Pricing
          </button>
          <button 
            className="mobile-nav-link"
            onClick={onBookDemo}
          >
            Book Demo
          </button>
          <div className="mobile-auth">
            <button className="auth-btn signin-btn" onClick={onSignIn}>
              Sign In
            </button>
            <button className="auth-btn signup-btn" onClick={onSignUp}>
              Sign Up
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;