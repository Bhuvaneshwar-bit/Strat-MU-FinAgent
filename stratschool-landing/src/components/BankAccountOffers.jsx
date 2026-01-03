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
  Filter,
  AlertCircle,
  Phone,
  Globe,
  Info
} from 'lucide-react';
import '../styles/BankAccountOffers.css';
import bankData from '../data/bankCurrentAccountOffers.json';

// Process the JSON data into a flat array
const processedBanks = [
  ...bankData.banks.privateBanks.map(bank => ({ ...bank, type: 'Private' })),
  ...bankData.banks.psuBanks.map(bank => ({ ...bank, type: 'PSU' })),
  ...bankData.banks.smallFinanceBanks.map(bank => ({ ...bank, type: 'Small Finance' })),
  ...bankData.banks.neoBanks.map(bank => ({ ...bank, type: 'Neo Bank' }))
];

// Bank colors for UI
const bankColors = {
  'HDFC Bank': '#004C8F',
  'ICICI Bank': '#F37021',
  'Axis Bank': '#97144D',
  'Kotak Mahindra Bank': '#ED1C24',
  'Yes Bank': '#00518F',
  'IndusInd Bank': '#8B1538',
  'IDFC First Bank': '#9C1D26',
  'RBL Bank': '#E31837',
  'Federal Bank': '#003366',
  'Karur Vysya Bank (KVB)': '#006B3F',
  'South Indian Bank': '#0066B3',
  'City Union Bank': '#003399',
  'DCB Bank': '#ED1C24',
  'Bandhan Bank': '#F47920',
  'State Bank of India': '#2D4A9D',
  'Punjab National Bank': '#ED1C24',
  'Bank of Baroda': '#F7931E',
  'Canara Bank': '#FFD700',
  'Union Bank of India': '#003F72',
  'Bank of India': '#0066B3',
  'Indian Bank': '#0052A4',
  'Central Bank of India': '#E31E24',
  'Bank of Maharashtra': '#1E4620',
  'Indian Overseas Bank': '#8B0000',
  'AU Small Finance Bank': '#E31E25',
  'Equitas Small Finance Bank': '#00A859',
  'Ujjivan Small Finance Bank': '#00AEEF',
  'RazorpayX': '#0066FF',
  'Open': '#5865F2'
};

const BankAccountOffers = ({ darkMode, isExpanded, onToggle }) => {
  const [selectedBank, setSelectedBank] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showBankDetails, setShowBankDetails] = useState(false);

  // Filter banks based on search and type
  const filteredBanks = useMemo(() => {
    return processedBanks.filter(bank => {
      const matchesSearch = bank.bankName.toLowerCase().includes(searchQuery.toLowerCase());
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
      case 'Neo Bank': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  const getBankColor = (bankName) => {
    return bankColors[bankName] || '#64748b';
  };

  const formatMinBalance = (account) => {
    if (!account.minBalance) return 'Contact Bank';
    const bal = account.minBalance;
    if (typeof bal.amount === 'number') {
      if (bal.amount >= 100000) {
        return `₹${(bal.amount / 100000).toFixed(bal.amount % 100000 === 0 ? 0 : 1)}L`;
      }
      return `₹${bal.amount.toLocaleString('en-IN')}`;
    }
    return bal.amount || 'Contact Bank';
  };

  const getFirstAccountBalance = (bank) => {
    if (!bank.accountTypes || bank.accountTypes.length === 0) return 'Contact Bank';
    return formatMinBalance(bank.accountTypes[0]);
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
            <p>Compare real offers from 25+ Indian banks</p>
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
              <span className="stat-label">Lowest MAB</span>
            </div>
            <div className="stat">
              <span className="stat-value">{processedBanks.length}+</span>
              <span className="stat-label">Banks</span>
            </div>
            <div className="stat">
              <span className="stat-value">Real Data</span>
              <span className="stat-label">Verified</span>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="bank-offers-panel">
          {/* Disclaimer */}
          <div className="data-disclaimer">
            <Info size={14} />
            <span>Data from official bank websites as of {bankData.lastUpdated}. Verify with bank before applying.</span>
          </div>

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
              {['all', 'Private', 'PSU', 'Small Finance', 'Neo Bank'].map(type => (
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
            {filteredBanks.map((bank, idx) => (
              <div 
                key={idx}
                className="bank-item"
                onClick={() => handleBankSelect(bank)}
              >
                <div className="bank-logo" style={{ background: `${getBankColor(bank.bankName)}15` }}>
                  <Building2 size={24} style={{ color: getBankColor(bank.bankName) }} />
                </div>
                <div className="bank-info">
                  <h4>{bank.bankName}</h4>
                  <span className="bank-type" style={{ background: `${getTypeColor(bank.type)}20`, color: getTypeColor(bank.type) }}>
                    {bank.type}
                  </span>
                </div>
                <div className="bank-highlight">
                  <span className="min-balance">{getFirstAccountBalance(bank)}</span>
                  <span className="balance-label">From</span>
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
            <div className="modal-header" style={{ background: `linear-gradient(135deg, ${getBankColor(selectedBank.bankName)}20 0%, ${getBankColor(selectedBank.bankName)}10 100%)` }}>
              <div className="modal-bank-logo" style={{ background: getBankColor(selectedBank.bankName) }}>
                <Building2 size={32} color="white" />
              </div>
              <div className="modal-bank-info">
                <h2>{selectedBank.bankName}</h2>
                <div className="modal-meta">
                  <span className="bank-type-badge" style={{ background: getTypeColor(selectedBank.type), color: 'white' }}>
                    {selectedBank.type} Bank
                  </span>
                  {selectedBank.customerCare && (
                    <span className="customer-care">
                      <Phone size={14} />
                      {selectedBank.customerCare}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Discontinued Notice if applicable */}
            {selectedBank.discontinuedAccounts && selectedBank.discontinuedAccounts.length > 0 && (
              <div className="discontinued-notice">
                <AlertCircle size={16} />
                <div>
                  <strong>Note:</strong> {selectedBank.note || 'Some account types have been discontinued.'}
                </div>
              </div>
            )}

            {/* Account Options */}
            <div className="modal-section">
              <h3><CreditCard size={18} /> Current Account Options</h3>
              <div className="account-options">
                {selectedBank.accountTypes && selectedBank.accountTypes.map((account, idx) => (
                  <div key={idx} className="account-option">
                    <div className="option-header">
                      <span className="option-type">
                        {account.minBalance?.type || 'MAB'}
                      </span>
                      <span className="option-balance">
                        {formatMinBalance(account)}
                      </span>
                    </div>
                    <h4>{account.name}</h4>
                    {account.minBalance?.note && (
                      <p className="balance-note">{account.minBalance.note}</p>
                    )}
                    <ul className="option-features">
                      {account.features && account.features.slice(0, 5).map((feature, i) => (
                        <li key={i}>
                          <CheckCircle size={14} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {account.bestFor && (
                      <div className="best-for">
                        <Users size={12} />
                        <span>Best for: {account.bestFor}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Special Offers / Programs */}
            {(selectedBank.programs || selectedBank.additionalBenefits) && (
              <div className="modal-section">
                <h3><Gift size={18} /> Additional Benefits</h3>
                <div className="special-offers">
                  {selectedBank.additionalBenefits && selectedBank.additionalBenefits.map((benefit, idx) => (
                    <div key={idx} className="special-offer-item">
                      <Percent size={16} />
                      <span>{benefit}</span>
                    </div>
                  ))}
                  {selectedBank.programs && selectedBank.programs.map((prog, idx) => (
                    <div key={idx} className="special-offer-item">
                      <Star size={16} />
                      <span>{prog.name}: {prog.features?.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Neo Bank Partner Banks */}
            {selectedBank.partnerBanks && selectedBank.partnerBanks.length > 0 && (
              <div className="modal-section">
                <h3><Building2 size={18} /> Partner Banks</h3>
                <div className="partner-banks">
                  {selectedBank.partnerBanks.map((partner, idx) => (
                    <span key={idx} className="partner-chip">{partner}</span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="modal-cta">
              <a 
                href={selectedBank.applyUrl || selectedBank.officialUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="open-account-btn"
                style={{ background: getBankColor(selectedBank.bankName) }}
              >
                <span>Visit {selectedBank.bankName} Website</span>
                <ExternalLink size={18} />
              </a>
              <p className="cta-hint">
                <Shield size={14} />
                Opens official bank website in new tab
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccountOffers;
