import React from 'react';
import { ArrowRight, Brain, TrendingUp, Shield, Zap } from 'lucide-react';
import '../styles/Hero.css';

const Hero = ({ onBookDemo }) => {
  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-badge">
            <Brain className="badge-icon" />
            <span>AI-Powered Financial Management</span>
          </div>
          
          <h1 className="hero-title">
            Your AI CFO for
            <span className="hero-highlight"> Solo Entrepreneurs</span>
          </h1>
          
          <p className="hero-description">
            StratSchool's Agentic AI automates your entire financial workflow. From bookkeeping 
            to investor reports, cashflow forecasting to GST filing - get a complete CFO 
            solution designed for startups and solo entrepreneurs.
          </p>

          <div className="hero-features">
            <div className="hero-feature">
              <TrendingUp className="feature-icon" />
              <span>Automated Financial Reports</span>
            </div>
            <div className="hero-feature">
              <Shield className="feature-icon" />
              <span>GST Filing & Compliance</span>
            </div>
            <div className="hero-feature">
              <Zap className="feature-icon" />
              <span>Real-time Dashboard</span>
            </div>
          </div>

          <div className="hero-cta">
            <button className="cta-primary" onClick={onBookDemo}>
              Book a Demo
              <ArrowRight className="cta-icon" />
            </button>
            <button className="cta-secondary">
              Watch Demo Video
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">500+</span>
              <span className="stat-label">Entrepreneurs Served</span>
            </div>
            <div className="stat">
              <span className="stat-number">95%</span>
              <span className="stat-label">Time Saved on Finance</span>
            </div>
            <div className="stat">
              <span className="stat-number">24/7</span>
              <span className="stat-label">AI Assistant Available</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="dashboard-mockup">
            <div className="mockup-header">
              <div className="mockup-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="mockup-title">StratSchool AI CFO Dashboard</span>
            </div>
            <div className="mockup-content">
              <div className="mockup-sidebar">
                <div className="sidebar-item active">Dashboard</div>
                <div className="sidebar-item">P&L Statement</div>
                <div className="sidebar-item">Cash Flow</div>
                <div className="sidebar-item">Expenses</div>
                <div className="sidebar-item">Reports</div>
                <div className="sidebar-item">GST Filing</div>
              </div>
              <div className="mockup-main">
                <div className="metric-card">
                  <div className="metric-label">Monthly Revenue</div>
                  <div className="metric-value">₹2,45,000</div>
                  <div className="metric-change positive">+12% this month</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Cash Flow</div>
                  <div className="metric-value">₹1,89,500</div>
                  <div className="metric-change positive">+8% this month</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Runway</div>
                  <div className="metric-value">18 months</div>
                  <div className="metric-change neutral">Healthy</div>
                </div>
                <div className="chart-placeholder">
                  <div className="chart-bars">
                    <div className="bar" style={{height: '60%'}}></div>
                    <div className="bar" style={{height: '80%'}}></div>
                    <div className="bar" style={{height: '45%'}}></div>
                    <div className="bar" style={{height: '90%'}}></div>
                    <div className="bar" style={{height: '70%'}}></div>
                    <div className="bar" style={{height: '95%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;