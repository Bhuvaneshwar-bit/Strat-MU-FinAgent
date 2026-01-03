import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Search,
  Gift,
  CreditCard,
  Percent,
  Shield,
  Star,
  CheckCircle,
  IndianRupee,
  Clock,
  Users,
  Briefcase,
  X,
  Filter
} from 'lucide-react';
import '../styles/BankAccountOffers.css';

// Comprehensive Indian Banks Data
const INDIAN_BANKS = [
  // Private Banks
  {
    id: 'hdfc',
    name: 'HDFC Bank',
    type: 'Private',
    logo: 'https://www.hdfcbank.com/content/api/contentstream-id/723fb80a-2dde-42a3-9793-7ae1be57c87f/0f5c0469-7893-4cd8-a5c4-bec8adb1066f',
    color: '#004C8F',
    currentAccountOffers: [
      { type: 'startup', name: 'SmartUp Current Account', minBalance: 10000, features: ['Zero balance for 1st year', 'Free 50 RTGS/NEFT per month', 'Free business debit card', 'Startup India benefits'] },
      { type: 'regular', name: 'Regular Current Account', minBalance: 25000, features: ['Free 75 transactions/month', 'Free demand drafts', 'Sweep facility available'] },
      { type: 'premium', name: 'Apex Current Account', minBalance: 200000, features: ['Unlimited transactions', 'Dedicated RM', 'Priority banking', 'Free locker'] }
    ],
    specialOffers: ['1% cashback on utility payments (max ₹500/month)', 'Free POS machine for 1 year', 'Zero forex markup on international transactions'],
    charges: { chequebook: 'First 50 leaves free', ddCharges: '₹50 per DD', neftCharges: 'Free up to limit' },
    registrationUrl: 'https://www.hdfcbank.com/sme/current-accounts',
    rating: 4.5,
    processingTime: '2-3 days'
  },
  {
    id: 'icici',
    name: 'ICICI Bank',
    type: 'Private',
    logo: 'https://www.icicibank.com/etc.clientlibs/icicibank/clientlibs/clientlib-base/resources/images/logo.png',
    color: '#F37021',
    currentAccountOffers: [
      { type: 'startup', name: 'Startup Current Account', minBalance: 10000, features: ['Zero AMB for 1st year', 'Free 100 transactions/month', 'API banking access', 'Instant account opening'] },
      { type: 'regular', name: 'Roaming Current Account', minBalance: 25000, features: ['No home branch restriction', 'Free anywhere banking', 'Bulk payment facility'] },
      { type: 'premium', name: 'Premium Current Account', minBalance: 100000, features: ['Unlimited free transactions', 'Trade finance support', 'Forex services'] }
    ],
    specialOffers: ['Instant account activation', 'Free InstaBIZ app with invoicing', 'GST filing assistance'],
    charges: { chequebook: 'First 25 leaves free', ddCharges: '₹75 per DD', neftCharges: 'Free for digital' },
    registrationUrl: 'https://www.icicibank.com/business-banking/current-accounts',
    rating: 4.4,
    processingTime: 'Same day'
  },
  {
    id: 'axis',
    name: 'Axis Bank',
    type: 'Private',
    logo: 'https://www.axisbank.com/images/default-source/revamp_new/axis-bank-logo.png',
    color: '#97144D',
    currentAccountOffers: [
      { type: 'startup', name: 'Startup Account', minBalance: 10000, features: ['Zero balance - 1st year', 'Free 50 NEFT/RTGS monthly', 'Neo banking features', 'UPI business payments'] },
      { type: 'regular', name: 'Business Advantage', minBalance: 50000, features: ['100 free transactions/month', 'Free cash deposits up to 5L', 'Business debit card'] },
      { type: 'premium', name: 'Liberty Current Account', minBalance: 250000, features: ['Unlimited transactions', 'Priority processing', 'Dedicated support'] }
    ],
    specialOffers: ['Open.money integration', 'Free accounting software - 1 year', '0.25% extra FD rates'],
    charges: { chequebook: '50 leaves free', ddCharges: '₹50 per DD', neftCharges: 'Free online' },
    registrationUrl: 'https://www.axisbank.com/business-banking/accounts/current-account',
    rating: 4.3,
    processingTime: '1-2 days'
  },
  {
    id: 'kotak',
    name: 'Kotak Mahindra Bank',
    type: 'Private',
    logo: 'https://www.kotak.com/content/dam/Kotak/kotak-bank-logo.png',
    color: '#ED1C24',
    currentAccountOffers: [
      { type: 'startup', name: 'Startup Current Account', minBalance: 10000, features: ['No MAB for 2 years', 'Free 100 IMPS/month', 'Kotak Neo for business', 'Digital onboarding'] },
      { type: 'regular', name: 'Ace Current Account', minBalance: 25000, features: ['75 free transactions', 'Free anywhere banking', 'Sweep-in facility'] },
      { type: 'premium', name: 'Pro Current Account', minBalance: 100000, features: ['Unlimited transactions', 'Free forex cards', 'Insurance benefits'] }
    ],
    specialOffers: ['6% interest on FD (special rate)', 'Free GST invoicing tool', 'Instant overdraft facility'],
    charges: { chequebook: 'First 100 free', ddCharges: '₹40 per DD', neftCharges: 'Always free' },
    registrationUrl: 'https://www.kotak.com/en/business/current-account.html',
    rating: 4.4,
    processingTime: '1-2 days'
  },
  {
    id: 'yes',
    name: 'Yes Bank',
    type: 'Private',
    logo: 'https://www.yesbank.in/o/yes-bank-theme/images/yes_bank_logo.png',
    color: '#00518F',
    currentAccountOffers: [
      { type: 'startup', name: 'YES First Business', minBalance: 10000, features: ['Zero MAB - 1st year', 'Free 75 transactions', 'RazorpayX integration', 'API banking'] },
      { type: 'regular', name: 'Business Current Account', minBalance: 25000, features: ['50 free transactions', 'Multi-city cheque facility', 'Trade services'] },
      { type: 'premium', name: 'YES Premia', minBalance: 200000, features: ['Unlimited transactions', 'Premium lounge access', 'Dedicated RM'] }
    ],
    specialOffers: ['RazorpayX powered neo-banking', 'Free virtual cards', 'Instant vendor payments'],
    charges: { chequebook: '50 leaves free', ddCharges: '₹60 per DD', neftCharges: 'Free digital' },
    registrationUrl: 'https://www.yesbank.in/business-banking/accounts/current-account',
    rating: 4.1,
    processingTime: '2-3 days'
  },
  {
    id: 'indusind',
    name: 'IndusInd Bank',
    type: 'Private',
    logo: 'https://www.indusind.com/content/dam/indusind-corporate/images/logo.png',
    color: '#8B1538',
    currentAccountOffers: [
      { type: 'startup', name: 'Indus Young Business', minBalance: 10000, features: ['No MAB - 1 year', 'Free 60 transactions', 'Digital banking suite', 'UPI for business'] },
      { type: 'regular', name: 'Business Plus', minBalance: 50000, features: ['100 free transactions', 'Free cash handling 3L/month', 'Priority banking'] },
      { type: 'premium', name: 'Business Premium', minBalance: 200000, features: ['Unlimited free services', 'Trade finance', 'Forex solutions'] }
    ],
    specialOffers: ['IndusMobile biz app', '1% cashback on spends', 'Free e-commerce payment gateway'],
    charges: { chequebook: '75 leaves free', ddCharges: '₹50 per DD', neftCharges: 'Free online' },
    registrationUrl: 'https://www.indusind.com/in/en/business-banking/accounts/current-account.html',
    rating: 4.2,
    processingTime: '2-3 days'
  },
  {
    id: 'idfc',
    name: 'IDFC First Bank',
    type: 'Private',
    logo: 'https://www.idfcfirstbank.com/content/dam/idfcfirstbank/images/logo/idfc-first-bank-logo.png',
    color: '#9C1D26',
    currentAccountOffers: [
      { type: 'startup', name: 'Startup Current Account', minBalance: 10000, features: ['Zero MAB - 1st year', 'Free unlimited NEFT/RTGS', 'Video KYC opening', 'Modern mobile banking'] },
      { type: 'regular', name: 'Business Current Account', minBalance: 25000, features: ['75 free transactions', 'Free cash deposit 5L/month', 'Instant alerts'] },
      { type: 'premium', name: 'Business Premium', minBalance: 100000, features: ['Unlimited services', 'Airport lounge', 'Concierge services'] }
    ],
    specialOffers: ['Modern digital banking', '7% FD rates (highest in industry)', 'Free VISA Business card'],
    charges: { chequebook: 'Unlimited free', ddCharges: '₹25 per DD', neftCharges: 'Always free' },
    registrationUrl: 'https://www.idfcfirstbank.com/business-banking/current-account',
    rating: 4.3,
    processingTime: 'Same day'
  },
  {
    id: 'rbl',
    name: 'RBL Bank',
    type: 'Private',
    logo: 'https://www.rblbank.com/sites/default/files/rbl-logo.png',
    color: '#E31837',
    currentAccountOffers: [
      { type: 'startup', name: 'Neo Current Account', minBalance: 10000, features: ['Zero balance - 1 year', 'API banking ready', 'Fintech partnerships', 'Instant payouts'] },
      { type: 'regular', name: 'Business Edge', minBalance: 25000, features: ['50 free transactions', 'Trade finance', 'Multi-location banking'] },
      { type: 'premium', name: 'Business Premium', minBalance: 100000, features: ['Unlimited transactions', 'Dedicated support', 'Premium services'] }
    ],
    specialOffers: ['Fintech-friendly APIs', 'Open banking partner', 'Fast business loans'],
    charges: { chequebook: '50 leaves free', ddCharges: '₹50 per DD', neftCharges: 'Free online' },
    registrationUrl: 'https://www.rblbank.com/business-banking/current-account',
    rating: 4.0,
    processingTime: '2-3 days'
  },
  {
    id: 'federal',
    name: 'Federal Bank',
    type: 'Private',
    logo: 'https://www.federalbank.co.in/documents/10180/45777/FB-logo.png',
    color: '#003366',
    currentAccountOffers: [
      { type: 'startup', name: 'Startup Current Account', minBalance: 10000, features: ['No MAB - 1 year', 'Free 50 transactions', 'Jupiter/Fi integration', 'Digital first'] },
      { type: 'regular', name: 'Business Current Account', minBalance: 25000, features: ['75 free transactions', 'MSME benefits', 'Quick loans'] },
      { type: 'premium', name: 'Business Premium', minBalance: 100000, features: ['Unlimited transactions', 'NRI services', 'Trade services'] }
    ],
    specialOffers: ['Neo-bank partnerships (Jupiter, Fi)', 'Kerala govt MSME tie-up', 'Quick OD facility'],
    charges: { chequebook: '50 leaves free', ddCharges: '₹50 per DD', neftCharges: 'Free digital' },
    registrationUrl: 'https://www.federalbank.co.in/current-account',
    rating: 4.1,
    processingTime: '2-3 days'
  },

  // PSU Banks
  {
    id: 'sbi',
    name: 'State Bank of India',
    type: 'PSU',
    logo: 'https://www.sbi.co.in/documents/16012/1400010/SBI+Logo.png',
    color: '#2D4A9D',
    currentAccountOffers: [
      { type: 'startup', name: 'Start-up Current Account', minBalance: 5000, features: ['Lowest MAB in industry', 'Free 30 transactions', 'Pan-India network', 'Govt scheme eligibility'] },
      { type: 'regular', name: 'Regular Current Account', minBalance: 10000, features: ['50 free transactions', 'Largest branch network', 'Easy govt payments'] },
      { type: 'premium', name: 'Gold Current Account', minBalance: 100000, features: ['Unlimited transactions', 'Priority processing', 'Trade finance'] }
    ],
    specialOffers: ['Mudra Loan eligibility', 'Standup India scheme', 'Govt tender payments', 'Largest ATM network'],
    charges: { chequebook: '25 leaves free', ddCharges: '₹40 per DD', neftCharges: '₹2 per txn' },
    registrationUrl: 'https://sbi.co.in/web/business/sme/current-account',
    rating: 4.0,
    processingTime: '3-5 days'
  },
  {
    id: 'pnb',
    name: 'Punjab National Bank',
    type: 'PSU',
    logo: 'https://www.pnbindia.in/images/logo.png',
    color: '#ED1C24',
    currentAccountOffers: [
      { type: 'startup', name: 'PNB Start-up', minBalance: 5000, features: ['Low MAB', 'Free 25 transactions', 'MSME benefits', 'Wide network'] },
      { type: 'regular', name: 'PNB Business', minBalance: 10000, features: ['40 free transactions', 'Trade services', 'Govt payments'] },
      { type: 'premium', name: 'PNB Premium', minBalance: 50000, features: ['100 free transactions', 'Priority banking', 'Export-import services'] }
    ],
    specialOffers: ['MSME loan priority', 'Govt scheme benefits', 'Wide rural network'],
    charges: { chequebook: '25 leaves free', ddCharges: '₹35 per DD', neftCharges: '₹5 per txn' },
    registrationUrl: 'https://www.pnbindia.in/current-account.html',
    rating: 3.8,
    processingTime: '3-5 days'
  },
  {
    id: 'bob',
    name: 'Bank of Baroda',
    type: 'PSU',
    logo: 'https://www.bankofbaroda.in/-/media/project/bob/countrywebsites/india/home/logo/bob-logo.png',
    color: '#F7931E',
    currentAccountOffers: [
      { type: 'startup', name: 'BOB Start-up', minBalance: 5000, features: ['Low MAB', 'Free 30 transactions', 'Digital banking', 'MSME focus'] },
      { type: 'regular', name: 'BOB Business', minBalance: 15000, features: ['50 free transactions', 'Cash management', 'Trade services'] },
      { type: 'premium', name: 'BOB Premium', minBalance: 100000, features: ['Unlimited transactions', 'NRI services', 'Forex'] }
    ],
    specialOffers: ['Baroda connect digital banking', 'MSME priority lending', 'Export finance'],
    charges: { chequebook: '30 leaves free', ddCharges: '₹40 per DD', neftCharges: '₹5 per txn' },
    registrationUrl: 'https://www.bankofbaroda.in/business-banking/accounts/current-account',
    rating: 3.9,
    processingTime: '3-5 days'
  },
  {
    id: 'canara',
    name: 'Canara Bank',
    type: 'PSU',
    logo: 'https://canarabank.com/images/logo.png',
    color: '#FFD700',
    currentAccountOffers: [
      { type: 'startup', name: 'Canara Start-up', minBalance: 5000, features: ['Low MAB', 'Free 25 transactions', 'South India strong presence'] },
      { type: 'regular', name: 'Canara Business', minBalance: 10000, features: ['40 free transactions', 'MSME benefits', 'Quick processing'] },
      { type: 'premium', name: 'Canara Gold', minBalance: 50000, features: ['75 free transactions', 'Priority services', 'Trade finance'] }
    ],
    specialOffers: ['Strong South India network', 'MSME credit camp', 'Govt payment hub'],
    charges: { chequebook: '25 leaves free', ddCharges: '₹40 per DD', neftCharges: '₹5 per txn' },
    registrationUrl: 'https://canarabank.com/current-account',
    rating: 3.8,
    processingTime: '3-5 days'
  },
  {
    id: 'union',
    name: 'Union Bank of India',
    type: 'PSU',
    logo: 'https://www.unionbankofindia.co.in/images/union-logo.png',
    color: '#003F72',
    currentAccountOffers: [
      { type: 'startup', name: 'Union Start-up', minBalance: 5000, features: ['Low MAB', 'Free 25 transactions', 'Digital ready'] },
      { type: 'regular', name: 'Union Business', minBalance: 10000, features: ['40 free transactions', 'MSME focus', 'Pan-India'] },
      { type: 'premium', name: 'Union Premium', minBalance: 50000, features: ['75 free transactions', 'Trade services', 'Priority'] }
    ],
    specialOffers: ['MSME loans', 'Vyapaar app for business', 'Govt scheme benefits'],
    charges: { chequebook: '25 leaves free', ddCharges: '₹40 per DD', neftCharges: '₹5 per txn' },
    registrationUrl: 'https://www.unionbankofindia.co.in/english/current-account.aspx',
    rating: 3.7,
    processingTime: '3-5 days'
  },
  {
    id: 'boi',
    name: 'Bank of India',
    type: 'PSU',
    logo: 'https://bankofindia.co.in/o/boidev-theme/images/boi-logo.png',
    color: '#0066B3',
    currentAccountOffers: [
      { type: 'startup', name: 'Star Start-up', minBalance: 5000, features: ['Low MAB', 'Free 25 transactions', 'Wide network'] },
      { type: 'regular', name: 'Star Business', minBalance: 10000, features: ['40 free transactions', 'Trade services'] },
      { type: 'premium', name: 'Star Premium', minBalance: 50000, features: ['75 free transactions', 'Priority services'] }
    ],
    specialOffers: ['International presence', 'NRI services', 'Trade finance'],
    charges: { chequebook: '25 leaves free', ddCharges: '₹40 per DD', neftCharges: '₹5 per txn' },
    registrationUrl: 'https://bankofindia.co.in/current-account',
    rating: 3.7,
    processingTime: '3-5 days'
  },
  {
    id: 'indian',
    name: 'Indian Bank',
    type: 'PSU',
    logo: 'https://www.indianbank.in/images/logo.png',
    color: '#0052A4',
    currentAccountOffers: [
      { type: 'startup', name: 'IB Start-up', minBalance: 5000, features: ['Low MAB', 'Free 25 transactions', 'South focus'] },
      { type: 'regular', name: 'IB Business', minBalance: 10000, features: ['40 free transactions', 'MSME benefits'] },
      { type: 'premium', name: 'IB Premium', minBalance: 50000, features: ['75 free transactions', 'Priority banking'] }
    ],
    specialOffers: ['Strong Tamil Nadu presence', 'MSME loans', 'Easy documentation'],
    charges: { chequebook: '25 leaves free', ddCharges: '₹35 per DD', neftCharges: '₹5 per txn' },
    registrationUrl: 'https://www.indianbank.in/current-account/',
    rating: 3.8,
    processingTime: '3-5 days'
  },

  // Small Finance Banks
  {
    id: 'au',
    name: 'AU Small Finance Bank',
    type: 'Small Finance',
    logo: 'https://www.aubank.in/images/au-bank-logo.png',
    color: '#E31E25',
    currentAccountOffers: [
      { type: 'startup', name: 'AU Business Lite', minBalance: 10000, features: ['Zero MAB - 6 months', 'Free 50 transactions', 'Modern digital banking', 'Quick onboarding'] },
      { type: 'regular', name: 'AU Business', minBalance: 25000, features: ['75 free transactions', 'Free cash deposit 2L/month', 'Video banking'] },
      { type: 'premium', name: 'AU Business Plus', minBalance: 100000, features: ['Unlimited transactions', 'Premium services', 'Relationship manager'] }
    ],
    specialOffers: ['Highest FD rates (up to 8%)', 'Quick business loans', 'Modern mobile app', 'Video KYC'],
    charges: { chequebook: '50 leaves free', ddCharges: '₹30 per DD', neftCharges: 'Free online' },
    registrationUrl: 'https://www.aubank.in/business-banking/current-account',
    rating: 4.2,
    processingTime: '1-2 days'
  },
  {
    id: 'equitas',
    name: 'Equitas Small Finance Bank',
    type: 'Small Finance',
    logo: 'https://www.equitasbank.com/images/logo.png',
    color: '#00A859',
    currentAccountOffers: [
      { type: 'startup', name: 'Equitas Startup', minBalance: 10000, features: ['Low MAB', 'Free 40 transactions', 'Digital banking', 'MSME focus'] },
      { type: 'regular', name: 'Equitas Business', minBalance: 25000, features: ['60 free transactions', 'Business debit card', 'Quick loans'] },
      { type: 'premium', name: 'Equitas Premium', minBalance: 50000, features: ['100 free transactions', 'Priority services'] }
    ],
    specialOffers: ['MSME focused', 'Quick unsecured loans', 'High FD rates'],
    charges: { chequebook: '50 leaves free', ddCharges: '₹40 per DD', neftCharges: 'Free digital' },
    registrationUrl: 'https://www.equitasbank.com/current-account',
    rating: 4.0,
    processingTime: '2-3 days'
  },
  {
    id: 'ujjivan',
    name: 'Ujjivan Small Finance Bank',
    type: 'Small Finance',
    logo: 'https://www.ujjivansfb.in/images/logo.png',
    color: '#00AEEF',
    currentAccountOffers: [
      { type: 'startup', name: 'Ujjivan Startup', minBalance: 10000, features: ['Low MAB', 'Free 40 transactions', 'MSME support'] },
      { type: 'regular', name: 'Ujjivan Business', minBalance: 25000, features: ['60 free transactions', 'Business solutions'] },
      { type: 'premium', name: 'Ujjivan Premium', minBalance: 50000, features: ['100 free transactions', 'Priority banking'] }
    ],
    specialOffers: ['Micro-enterprise focus', 'Easy documentation', 'Quick disbursals'],
    charges: { chequebook: '50 leaves free', ddCharges: '₹40 per DD', neftCharges: 'Free digital' },
    registrationUrl: 'https://www.ujjivansfb.in/current-account',
    rating: 3.9,
    processingTime: '2-3 days'
  }
];

const BankAccountOffers = ({ darkMode, isExpanded, onToggle }) => {
  const [selectedBank, setSelectedBank] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showBankDetails, setShowBankDetails] = useState(false);

  // Filter banks based on search and type
  const filteredBanks = useMemo(() => {
    return INDIAN_BANKS.filter(bank => {
      const matchesSearch = bank.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || bank.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, filterType]);

  const handleBankSelect = (bank) => {
    setSelectedBank(bank);
    setShowBankDetails(true);
  };

  const closeDetails = () => {
    setShowBankDetails(false);
    setTimeout(() => setSelectedBank(null), 300);
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'Private': return '#D4AF37';
      case 'PSU': return '#3b82f6';
      case 'Small Finance': return '#10b981';
      default: return '#64748b';
    }
  };

  return (
    <div className={`bank-offers-wrapper ${darkMode ? 'dark' : 'light'}`}>
      {/* Collapsed Card View */}
      <div 
        className={`bank-offers-card ${isExpanded ? 'expanded' : ''}`}
        onClick={() => !isExpanded && onToggle()}
      >
        <div className="bank-card-header">
          <div className="bank-card-icon">
            <Building2 size={24} />
          </div>
          <div className="bank-card-content">
            <h3>Open Current Account</h3>
            <p>Compare offers from 20+ Indian banks</p>
          </div>
          <button className="expand-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {/* Quick Stats when collapsed */}
        {!isExpanded && (
          <div className="quick-stats">
            <div className="stat">
              <span className="stat-value">₹5K</span>
              <span className="stat-label">Min Balance</span>
            </div>
            <div className="stat">
              <span className="stat-value">20+</span>
              <span className="stat-label">Banks</span>
            </div>
            <div className="stat">
              <span className="stat-value">Same Day</span>
              <span className="stat-label">Opening</span>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="bank-offers-panel">
          {/* Search and Filter */}
          <div className="panel-controls">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search banks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-tabs">
              {['all', 'Private', 'PSU', 'Small Finance'].map(type => (
                <button
                  key={type}
                  className={`filter-tab ${filterType === type ? 'active' : ''}`}
                  onClick={() => setFilterType(type)}
                >
                  {type === 'all' ? 'All Banks' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Banks Grid */}
          <div className="banks-grid">
            {filteredBanks.map(bank => (
              <div 
                key={bank.id}
                className="bank-item"
                onClick={() => handleBankSelect(bank)}
              >
                <div className="bank-logo" style={{ background: `${bank.color}15` }}>
                  <Building2 size={24} style={{ color: bank.color }} />
                </div>
                <div className="bank-info">
                  <h4>{bank.name}</h4>
                  <span className="bank-type" style={{ background: `${getTypeColor(bank.type)}20`, color: getTypeColor(bank.type) }}>
                    {bank.type}
                  </span>
                </div>
                <div className="bank-highlight">
                  <span className="min-balance">₹{bank.currentAccountOffers[0].minBalance.toLocaleString()}</span>
                  <span className="balance-label">Min Balance</span>
                </div>
                <ExternalLink size={16} className="bank-arrow" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bank Details Modal */}
      {selectedBank && (
        <div className={`bank-details-overlay ${showBankDetails ? 'show' : ''}`} onClick={closeDetails}>
          <div className="bank-details-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={closeDetails}>
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div className="modal-header" style={{ background: `linear-gradient(135deg, ${selectedBank.color}20 0%, ${selectedBank.color}10 100%)` }}>
              <div className="modal-bank-logo" style={{ background: selectedBank.color }}>
                <Building2 size={32} color="white" />
              </div>
              <div className="modal-bank-info">
                <h2>{selectedBank.name}</h2>
                <div className="modal-meta">
                  <span className="bank-type-badge" style={{ background: getTypeColor(selectedBank.type), color: 'white' }}>
                    {selectedBank.type} Bank
                  </span>
                  <span className="rating">
                    <Star size={14} fill="#D4AF37" color="#D4AF37" />
                    {selectedBank.rating}
                  </span>
                  <span className="processing">
                    <Clock size={14} />
                    {selectedBank.processingTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Options */}
            <div className="modal-section">
              <h3><CreditCard size={18} /> Current Account Options</h3>
              <div className="account-options">
                {selectedBank.currentAccountOffers.map((offer, idx) => (
                  <div key={idx} className={`account-option ${offer.type}`}>
                    <div className="option-header">
                      <span className="option-type">
                        {offer.type === 'startup' && <Briefcase size={14} />}
                        {offer.type === 'regular' && <Users size={14} />}
                        {offer.type === 'premium' && <Star size={14} />}
                        {offer.type.charAt(0).toUpperCase() + offer.type.slice(1)}
                      </span>
                      <span className="option-balance">
                        <IndianRupee size={12} />
                        {offer.minBalance.toLocaleString()} MAB
                      </span>
                    </div>
                    <h4>{offer.name}</h4>
                    <ul className="option-features">
                      {offer.features.map((feature, i) => (
                        <li key={i}>
                          <CheckCircle size={14} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Offers */}
            <div className="modal-section">
              <h3><Gift size={18} /> Special Offers</h3>
              <div className="special-offers">
                {selectedBank.specialOffers.map((offer, idx) => (
                  <div key={idx} className="special-offer-item">
                    <Percent size={16} />
                    <span>{offer}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Charges */}
            <div className="modal-section">
              <h3><IndianRupee size={18} /> Charges & Fees</h3>
              <div className="charges-grid">
                <div className="charge-item">
                  <span className="charge-label">Cheque Book</span>
                  <span className="charge-value">{selectedBank.charges.chequebook}</span>
                </div>
                <div className="charge-item">
                  <span className="charge-label">DD Charges</span>
                  <span className="charge-value">{selectedBank.charges.ddCharges}</span>
                </div>
                <div className="charge-item">
                  <span className="charge-label">NEFT/RTGS</span>
                  <span className="charge-value">{selectedBank.charges.neftCharges}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="modal-cta">
              <a 
                href={selectedBank.registrationUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="open-account-btn"
                style={{ background: selectedBank.color }}
              >
                <span>Open Account on {selectedBank.name}</span>
                <ExternalLink size={18} />
              </a>
              <p className="cta-hint">
                <Shield size={14} />
                Secure link to official bank website
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccountOffers;
