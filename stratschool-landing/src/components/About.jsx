import React from 'react';
import { 
  Target, 
  Users, 
  TrendingUp, 
  Shield, 
  Award,
  Lightbulb,
  Heart,
  Globe
} from 'lucide-react';
import '../styles/About.css';

const About = () => {
  const stats = [
    { number: "500+", label: "Entrepreneurs Served", icon: <Users /> },
    { number: "₹50M+", label: "Financial Data Processed", icon: <TrendingUp /> },
    { number: "95%", label: "Time Saved on Finance", icon: <Shield /> },
    { number: "24/7", label: "AI Support Available", icon: <Award /> }
  ];

  const values = [
    {
      icon: <Target />,
      title: "Mission-Driven",
      description: "Empowering solo entrepreneurs with enterprise-grade financial tools"
    },
    {
      icon: <Lightbulb />,
      title: "Innovation First",
      description: "Cutting-edge AI technology to solve real financial challenges"
    },
    {
      icon: <Heart />,
      title: "Customer-Centric",
      description: "Built by entrepreneurs, for entrepreneurs who understand the struggle"
    },
    {
      icon: <Globe />,
      title: "Global Impact",
      description: "Making professional financial management accessible worldwide"
    }
  ];

  return (
    <section id="about" className="about">
      <div className="about-container">
        {/* Hero Section */}
        <div className="about-hero">
          <div className="about-content">
            <div className="section-badge">
              <Target className="badge-icon" />
              <span>About StratSchool</span>
            </div>
            <h2 className="about-title">
              Democratizing Financial Management for
              <span className="title-highlight"> Solo Entrepreneurs</span>
            </h2>
            <p className="about-description">
              At StratSchool, we believe every entrepreneur deserves access to professional-grade 
              financial tools. Our AI CFO is designed specifically for solo entrepreneurs and 
              startups who need enterprise-level financial management without the enterprise cost.
            </p>
          </div>
          <div className="about-visual">
            <div className="visual-card">
              <div className="card-header">
                <div className="card-icon">
                  <TrendingUp />
                </div>
                <h3>The Problem</h3>
              </div>
              <p>
                Solo entrepreneurs spend 40+ hours monthly on financial tasks that could be automated, 
                taking focus away from growing their business.
              </p>
            </div>
            <div className="visual-card highlight">
              <div className="card-header">
                <div className="card-icon">
                  <Lightbulb />
                </div>
                <h3>Our Solution</h3>
              </div>
              <p>
                An AI-powered CFO that automates 95% of financial tasks, providing real-time insights 
                and professional reports in minutes, not hours.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="stats-section">
          <h3 className="stats-title">Trusted by entrepreneurs worldwide</h3>
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-icon">
                  {stat.icon}
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Values Section */}
        <div className="values-section">
          <div className="values-header">
            <h3 className="values-title">Our Core Values</h3>
            <p className="values-description">
              What drives us to build the best financial AI for entrepreneurs
            </p>
          </div>
          <div className="values-grid">
            {values.map((value, index) => (
              <div key={index} className="value-card">
                <div className="value-icon">
                  {value.icon}
                </div>
                <h4 className="value-title">{value.title}</h4>
                <p className="value-description">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Target Audience Section */}
        <div className="audience-section">
          <div className="audience-content">
            <h3 className="audience-title">Built for Solo Entrepreneurs & Startups</h3>
            <div className="audience-grid">
              <div className="audience-card">
                <h4>Solo Entrepreneurs</h4>
                <ul>
                  <li>Freelancers and consultants</li>
                  <li>E-commerce business owners</li>
                  <li>Content creators and influencers</li>
                  <li>Digital service providers</li>
                </ul>
              </div>
              <div className="audience-card">
                <h4>Early-Stage Startups</h4>
                <ul>
                  <li>Pre-seed and seed stage companies</li>
                  <li>Bootstrap startups</li>
                  <li>Teams of 1-10 people</li>
                  <li>Companies raising their first rounds</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Why Choose Section */}
        <div className="why-choose-section">
          <div className="why-choose-content">
            <h3 className="why-choose-title">Why You Need an AI CFO</h3>
            <div className="reasons-grid">
              <div className="reason">
                <div className="reason-number">01</div>
                <div className="reason-content">
                  <h4>Focus on Growth</h4>
                  <p>Stop spending time on repetitive financial tasks and focus on what matters - growing your business.</p>
                </div>
              </div>
              <div className="reason">
                <div className="reason-number">02</div>
                <div className="reason-content">
                  <h4>Professional Reports</h4>
                  <p>Generate investor-ready financial reports that would typically cost thousands from accounting firms.</p>
                </div>
              </div>
              <div className="reason">
                <div className="reason-number">03</div>
                <div className="reason-content">
                  <h4>Stay Compliant</h4>
                  <p>Never miss tax deadlines or compliance requirements with automated tracking and reminders.</p>
                </div>
              </div>
              <div className="reason">
                <div className="reason-number">04</div>
                <div className="reason-content">
                  <h4>Make Data-Driven Decisions</h4>
                  <p>Get real-time insights and forecasts to make informed business decisions with confidence.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;