import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Shield,
  Bell,
  Palette,
  Globe,
  Download,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Save,
  Edit3,
  Check,
  X,
  ChevronRight,
  Sun,
  Moon,
  AlertTriangle,
  FileText,
  CreditCard,
  Calendar,
  Hash,
  Briefcase,
  Lock,
  LogOut,
  HelpCircle,
  ExternalLink,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { buildApiUrl } from '../config/api';
import '../styles/SettingsPanel.css';

const SettingsPanel = ({ darkMode, setDarkMode, user, onLogout }) => {
  const [activeSection, setActiveSection] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    companyName: '',
    businessType: 'Sole Proprietorship',
    gstNumber: '',
    panNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    financialYearStart: 'April'
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailReports: true,
    weeklyDigest: true,
    paymentReminders: true,
    taxDeadlines: true,
    productUpdates: false,
    marketingEmails: false
  });

  // Load saved settings from localStorage
  useEffect(() => {
    const savedProfile = localStorage.getItem('nebulaa-user-profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfileData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Error loading profile:', e);
      }
    }

    const savedNotifications = localStorage.getItem('nebulaa-notifications');
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications));
      } catch (e) {
        console.error('Error loading notifications:', e);
      }
    }
  }, []);

  // Update profile data when user prop changes
  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        email: user.email || prev.email
      }));
    }
  }, [user]);

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage for now (can integrate with backend later)
      localStorage.setItem('nebulaa-user-profile', JSON.stringify(profileData));
      
      setSaveMessage({ type: 'success', text: 'Profile saved successfully!' });
      setIsEditing(false);
      
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/api/auth/change-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setPasswordSuccess('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordError(data.message || 'Failed to change password');
      }
    } catch (error) {
      setPasswordError('Failed to change password. Please try again.');
    }
  };

  const handleNotificationChange = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    localStorage.setItem('nebulaa-notifications', JSON.stringify(updated));
  };

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem('token');
      // Get P&L data
      const plData = localStorage.getItem('nebulaa-pl-data');
      const profile = localStorage.getItem('nebulaa-user-profile');
      
      const exportData = {
        profile: profile ? JSON.parse(profile) : {},
        financialData: plData ? JSON.parse(plData) : {},
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nebulaa-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'data', label: 'Data & Privacy', icon: FileText }
  ];

  const businessTypes = [
    'Sole Proprietorship',
    'Partnership',
    'LLP (Limited Liability Partnership)',
    'Private Limited Company',
    'One Person Company (OPC)',
    'Public Limited Company',
    'Hindu Undivided Family (HUF)'
  ];

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh'
  ];

  return (
    <div className={`settings-panel ${darkMode ? 'dark' : 'light'}`}>
      {/* Settings Header */}
      <div className="settings-header">
        <h2>Settings</h2>
        <p>Manage your account, preferences, and privacy settings</p>
      </div>

      <div className="settings-layout">
        {/* Settings Navigation */}
        <nav className="settings-nav">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <Icon size={20} />
                <span>{section.label}</span>
                <ChevronRight size={16} className="chevron" />
              </button>
            );
          })}
        </nav>

        {/* Settings Content */}
        <div className="settings-content">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="settings-section">
              <div className="section-header">
                <div>
                  <h3>Personal Information</h3>
                  <p>Update your personal details</p>
                </div>
                {!isEditing ? (
                  <button className="edit-btn" onClick={() => setIsEditing(true)}>
                    <Edit3 size={16} />
                    Edit
                  </button>
                ) : (
                  <div className="edit-actions">
                    <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                      <X size={16} />
                      Cancel
                    </button>
                    <button className="save-btn" onClick={handleSaveProfile} disabled={isSaving}>
                      <Save size={16} />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {saveMessage && (
                <div className={`save-message ${saveMessage.type}`}>
                  {saveMessage.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {saveMessage.text}
                </div>
              )}

              {/* Profile Avatar */}
              <div className="profile-avatar-section">
                <div className="avatar-large">
                  {profileData.firstName?.charAt(0)}{profileData.lastName?.charAt(0)}
                </div>
                <div className="avatar-info">
                  <h4>{profileData.firstName} {profileData.lastName}</h4>
                  <p>{profileData.email}</p>
                  <span className="user-badge">Entrepreneur</span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="form-grid">
                <div className="form-group">
                  <label><User size={14} /> First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => handleProfileChange('firstName', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label><User size={14} /> Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => handleProfileChange('lastName', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="form-group">
                  <label><Mail size={14} /> Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="disabled-field"
                  />
                  <span className="field-hint">Email cannot be changed</span>
                </div>
                <div className="form-group">
                  <label><Phone size={14} /> Phone Number</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    disabled={!isEditing}
                    placeholder="+91 99999 99999"
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="subsection">
                <h4><MapPin size={16} /> Address</h4>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Street Address</label>
                    <input
                      type="text"
                      value={profileData.address}
                      onChange={(e) => handleProfileChange('address', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter your address"
                    />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={profileData.city}
                      onChange={(e) => handleProfileChange('city', e.target.value)}
                      disabled={!isEditing}
                      placeholder="City"
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <select
                      value={profileData.state}
                      onChange={(e) => handleProfileChange('state', e.target.value)}
                      disabled={!isEditing}
                    >
                      <option value="">Select State</option>
                      {indianStates.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>PIN Code</label>
                    <input
                      type="text"
                      value={profileData.pincode}
                      onChange={(e) => handleProfileChange('pincode', e.target.value)}
                      disabled={!isEditing}
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Business Section */}
          {activeSection === 'business' && (
            <div className="settings-section">
              <div className="section-header">
                <div>
                  <h3>Business Information</h3>
                  <p>Your business and tax details</p>
                </div>
                {!isEditing ? (
                  <button className="edit-btn" onClick={() => setIsEditing(true)}>
                    <Edit3 size={16} />
                    Edit
                  </button>
                ) : (
                  <div className="edit-actions">
                    <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                      <X size={16} />
                      Cancel
                    </button>
                    <button className="save-btn" onClick={handleSaveProfile} disabled={isSaving}>
                      <Save size={16} />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label><Building2 size={14} /> Company / Business Name</label>
                  <input
                    type="text"
                    value={profileData.companyName}
                    onChange={(e) => handleProfileChange('companyName', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Your business name"
                  />
                </div>
                <div className="form-group">
                  <label><Briefcase size={14} /> Business Type</label>
                  <select
                    value={profileData.businessType}
                    onChange={(e) => handleProfileChange('businessType', e.target.value)}
                    disabled={!isEditing}
                  >
                    {businessTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label><Calendar size={14} /> Financial Year Starts</label>
                  <select
                    value={profileData.financialYearStart}
                    onChange={(e) => handleProfileChange('financialYearStart', e.target.value)}
                    disabled={!isEditing}
                  >
                    <option value="April">April (India Standard)</option>
                    <option value="January">January (Calendar Year)</option>
                  </select>
                </div>
              </div>

              {/* Tax Information */}
              <div className="subsection">
                <h4><Hash size={16} /> Tax Information</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>GSTIN (GST Number)</label>
                    <input
                      type="text"
                      value={profileData.gstNumber}
                      onChange={(e) => handleProfileChange('gstNumber', e.target.value.toUpperCase())}
                      disabled={!isEditing}
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                    />
                    <span className="field-hint">15-character GST Identification Number</span>
                  </div>
                  <div className="form-group">
                    <label>PAN Number</label>
                    <input
                      type="text"
                      value={profileData.panNumber}
                      onChange={(e) => handleProfileChange('panNumber', e.target.value.toUpperCase())}
                      disabled={!isEditing}
                      placeholder="AAAAA0000A"
                      maxLength={10}
                    />
                    <span className="field-hint">10-character Permanent Account Number</span>
                  </div>
                </div>
              </div>

              {/* Compliance Status */}
              <div className="subsection">
                <h4><Shield size={16} /> Compliance Status</h4>
                <div className="compliance-cards">
                  <div className={`compliance-card ${profileData.gstNumber ? 'verified' : 'pending'}`}>
                    <div className="compliance-icon">
                      {profileData.gstNumber ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div className="compliance-info">
                      <span className="compliance-label">GST Registration</span>
                      <span className="compliance-status">
                        {profileData.gstNumber ? 'Registered' : 'Not Registered'}
                      </span>
                    </div>
                  </div>
                  <div className={`compliance-card ${profileData.panNumber ? 'verified' : 'pending'}`}>
                    <div className="compliance-icon">
                      {profileData.panNumber ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div className="compliance-info">
                      <span className="compliance-label">PAN Verification</span>
                      <span className="compliance-status">
                        {profileData.panNumber ? 'Verified' : 'Not Added'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="settings-section">
              <div className="section-header">
                <div>
                  <h3>Security Settings</h3>
                  <p>Manage your password and security preferences</p>
                </div>
              </div>

              {/* Change Password */}
              <div className="subsection">
                <h4><Key size={16} /> Change Password</h4>
                
                {passwordError && (
                  <div className="message error">
                    <XCircle size={16} />
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="message success">
                    <CheckCircle size={16} />
                    {passwordSuccess}
                  </div>
                )}

                <div className="form-grid single-column">
                  <div className="form-group">
                    <label>Current Password</label>
                    <div className="password-input">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      >
                        {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <div className="password-input">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      >
                        {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <span className="field-hint">Minimum 8 characters</span>
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <div className="password-input">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      >
                        {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button className="primary-action-btn" onClick={handleChangePassword}>
                    <Lock size={16} />
                    Update Password
                  </button>
                </div>
              </div>

              {/* Session Info */}
              <div className="subsection">
                <h4><Shield size={16} /> Account Security</h4>
                <div className="security-info">
                  <div className="security-item">
                    <div className="security-label">Last Login</div>
                    <div className="security-value">
                      {user?.lastLogin ? new Date(user.lastLogin).toLocaleString('en-IN') : 'Current session'}
                    </div>
                  </div>
                  <div className="security-item">
                    <div className="security-label">Account Created</div>
                    <div className="security-value">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                    </div>
                  </div>
                  <div className="security-item">
                    <div className="security-label">Account Status</div>
                    <div className="security-value status-active">
                      <CheckCircle size={14} /> Active
                    </div>
                  </div>
                </div>
              </div>

              {/* Logout */}
              <div className="subsection">
                <button className="danger-btn" onClick={onLogout}>
                  <LogOut size={16} />
                  Sign Out of All Devices
                </button>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="settings-section">
              <div className="section-header">
                <div>
                  <h3>Notification Preferences</h3>
                  <p>Choose what notifications you want to receive</p>
                </div>
              </div>

              <div className="notification-list">
                <div className="notification-item">
                  <div className="notification-info">
                    <h4>Email Reports</h4>
                    <p>Receive monthly financial summary via email</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.emailReports}
                      onChange={() => handleNotificationChange('emailReports')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="notification-item">
                  <div className="notification-info">
                    <h4>Weekly Digest</h4>
                    <p>Get a weekly summary of your transactions</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.weeklyDigest}
                      onChange={() => handleNotificationChange('weeklyDigest')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="notification-item">
                  <div className="notification-info">
                    <h4>Payment Reminders</h4>
                    <p>Get notified about upcoming payments and dues</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.paymentReminders}
                      onChange={() => handleNotificationChange('paymentReminders')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="notification-item">
                  <div className="notification-info">
                    <h4>Tax Deadline Alerts</h4>
                    <p>Never miss GST filing and tax payment deadlines</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.taxDeadlines}
                      onChange={() => handleNotificationChange('taxDeadlines')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="notification-divider"></div>

                <div className="notification-item">
                  <div className="notification-info">
                    <h4>Product Updates</h4>
                    <p>Learn about new features and improvements</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.productUpdates}
                      onChange={() => handleNotificationChange('productUpdates')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="notification-item">
                  <div className="notification-info">
                    <h4>Marketing Emails</h4>
                    <p>Promotional offers and partner deals</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.marketingEmails}
                      onChange={() => handleNotificationChange('marketingEmails')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="settings-section">
              <div className="section-header">
                <div>
                  <h3>Appearance</h3>
                  <p>Customize how InFINity looks</p>
                </div>
              </div>

              <div className="appearance-options">
                <div className="theme-selector">
                  <h4>Theme</h4>
                  <div className="theme-options">
                    <button
                      className={`theme-option ${darkMode ? '' : 'active'}`}
                      onClick={() => setDarkMode(false)}
                    >
                      <div className="theme-preview light-preview">
                        <Sun size={24} />
                      </div>
                      <span>Light</span>
                    </button>
                    <button
                      className={`theme-option ${darkMode ? 'active' : ''}`}
                      onClick={() => setDarkMode(true)}
                    >
                      <div className="theme-preview dark-preview">
                        <Moon size={24} />
                      </div>
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <h4><Globe size={16} /> Currency Format</h4>
                    <p>Indian Rupee (₹)</p>
                  </div>
                  <span className="preference-value">₹ 1,00,000.00</span>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <h4><Calendar size={16} /> Date Format</h4>
                    <p>DD/MM/YYYY (Indian Standard)</p>
                  </div>
                  <span className="preference-value">08/01/2026</span>
                </div>
              </div>
            </div>
          )}

          {/* Data & Privacy Section */}
          {activeSection === 'data' && (
            <div className="settings-section">
              <div className="section-header">
                <div>
                  <h3>Data & Privacy</h3>
                  <p>Manage your data and privacy settings</p>
                </div>
              </div>

              <div className="data-actions">
                <div className="data-action-card">
                  <div className="data-action-icon">
                    <Download size={24} />
                  </div>
                  <div className="data-action-info">
                    <h4>Export Your Data</h4>
                    <p>Download all your financial data and account information in JSON format</p>
                  </div>
                  <button className="secondary-action-btn" onClick={handleExportData}>
                    <Download size={16} />
                    Export Data
                  </button>
                </div>

                <div className="data-action-card danger">
                  <div className="data-action-icon">
                    <Trash2 size={24} />
                  </div>
                  <div className="data-action-info">
                    <h4>Delete Account</h4>
                    <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
                  </div>
                  <button className="danger-action-btn">
                    <Trash2 size={16} />
                    Delete Account
                  </button>
                </div>
              </div>

              {/* Help & Support */}
              <div className="subsection">
                <h4><HelpCircle size={16} /> Help & Support</h4>
                <div className="help-links">
                  <a href="https://nebulaa.com/help" target="_blank" rel="noopener noreferrer" className="help-link">
                    <HelpCircle size={18} />
                    <span>Help Center</span>
                    <ExternalLink size={14} />
                  </a>
                  <a href="mailto:support@nebulaa.com" className="help-link">
                    <Mail size={18} />
                    <span>Contact Support</span>
                    <ExternalLink size={14} />
                  </a>
                  <a href="https://nebulaa.com/privacy" target="_blank" rel="noopener noreferrer" className="help-link">
                    <Shield size={18} />
                    <span>Privacy Policy</span>
                    <ExternalLink size={14} />
                  </a>
                  <a href="https://nebulaa.com/terms" target="_blank" rel="noopener noreferrer" className="help-link">
                    <FileText size={18} />
                    <span>Terms of Service</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {/* App Info */}
              <div className="app-info">
                <p>Nebulaa InFINity v1.0.0</p>
                <p>© 2026 Nebulaa Technologies. All rights reserved.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
