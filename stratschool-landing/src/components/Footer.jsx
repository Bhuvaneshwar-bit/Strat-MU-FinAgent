import React from 'react';
import { 
  TrendingUp, 
  Mail, 
  Phone, 
  MapPin,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  ArrowRight
} from 'lucide-react';
import '../styles/Footer.css';
import LogoDark from '../assets/dark-logo.png';
import LogoLight from '../assets/light-logo.png';

const Footer = ({ onBookDemo, darkMode }) => {
  const footerLinks = {
    product: [
      { name: 'Features', href: '#features' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'Integrations', href: '#' },
      { name: 'API', href: '#' },
      { name: 'Security', href: '#' }
    ],
    company: [
      { name: 'About Us', href: '#about' },
      { name: 'Careers', href: '#' },
      { name: 'Press', href: '#' },
      { name: 'Partners', href: '#' },
      { name: 'Contact', href: '#' }
    ],
    resources: [
      { name: 'Blog', href: '#' },
      { name: 'Help Center', href: '#' },
      { name: 'Webinars', href: '#' },
      { name: 'Case Studies', href: '#' },
      { name: 'Templates', href: '#' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '#' },
      { name: 'Terms of Service', href: '#' },
      { name: 'Cookie Policy', href: '#' },
      { name: 'GDPR', href: '#' },
      { name: 'Compliance', href: '#' }
    ]
  };

  const socialLinks = [
    { name: 'LinkedIn', icon: <Linkedin />, href: '#' },
    { name: 'Twitter', icon: <Twitter />, href: '#' },
    { name: 'Facebook', icon: <Facebook />, href: '#' },
    { name: 'Instagram', icon: <Instagram />, href: '#' }
  ];

  const scrollToSection = (href) => {
    if (href.startsWith('#')) {
      const element = document.getElementById(href.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className={`footer ${darkMode ? 'dark' : ''}`}>
      <div className="footer-container">
        {/* Newsletter Section */}
        <div className="footer-newsletter">
          <div className="newsletter-content">
            <h3 className="newsletter-title">Stay Updated</h3>
            <p className="newsletter-description">
              Get the latest updates on AI-powered financial management and exclusive insights for entrepreneurs.
            </p>
          </div>
          <div className="newsletter-form">
            <div className="newsletter-input-wrapper">
              <Mail className="newsletter-icon" />
              <input 
                type="email" 
                placeholder="Enter your email"
                className="newsletter-input"
              />
              <button className="newsletter-button">
                Subscribe
                <ArrowRight className="newsletter-arrow" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="footer-main">
          {/* Company Info */}
          <div className="footer-brand">
            <div className="footer-logo">
              <img src={darkMode ? LogoDark : LogoLight} alt="Nebulaa InFINity" className="logo-img" />
              <span className="logo-text">Nebulaa InFINity</span>
            </div>
            <p className="footer-description">
              Empowering solo entrepreneurs and startups with AI-powered financial management. 
              Your personal CFO that automates bookkeeping, forecasting, and compliance.
            </p>
            <div className="footer-contact">
              <div className="contact-item">
                <Mail className="contact-icon" />
                <span>hello@nebulaainfinity.com</span>
              </div>
              <div className="contact-item">
                <Phone className="contact-icon" />
                <span>+91 98765 43210</span>
              </div>
              <div className="contact-item">
                <MapPin className="contact-icon" />
                <span>Bangalore, India</span>
              </div>
            </div>
          </div>

          {/* Links Sections */}
          <div className="footer-links">
            <div className="links-section">
              <h4 className="links-title">Product</h4>
              <ul className="links-list">
                {footerLinks.product.map((link, index) => (
                  <li key={index}>
                    <button 
                      className="footer-link"
                      onClick={() => scrollToSection(link.href)}
                    >
                      {link.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="links-section">
              <h4 className="links-title">Company</h4>
              <ul className="links-list">
                {footerLinks.company.map((link, index) => (
                  <li key={index}>
                    <button 
                      className="footer-link"
                      onClick={() => scrollToSection(link.href)}
                    >
                      {link.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="links-section">
              <h4 className="links-title">Resources</h4>
              <ul className="links-list">
                {footerLinks.resources.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="footer-link">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="links-section">
              <h4 className="links-title">Legal</h4>
              <ul className="links-list">
                {footerLinks.legal.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="footer-link">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="footer-cta">
          <div className="cta-content">
            <h3 className="cta-title">Ready to automate your finances?</h3>
            <p className="cta-description">
              Join hundreds of entrepreneurs who've transformed their financial management with AI
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

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <p className="copyright">
              © 2025 Nebulaa InFINity. All rights reserved.
            </p>
            <div className="footer-badges">
              <span className="badge">SOC 2 Compliant</span>
              <span className="badge">ISO 27001</span>
              <span className="badge">GDPR Ready</span>
            </div>
          </div>

          <div className="footer-social">
            <span className="social-label">Follow us</span>
            <div className="social-links">
              {socialLinks.map((social, index) => (
                <a 
                  key={index}
                  href={social.href}
                  className="social-link"
                  aria-label={social.name}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;