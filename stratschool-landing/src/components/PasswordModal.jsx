import React, { useState } from 'react';
import { Lock, FileText, Upload, AlertCircle } from 'lucide-react';
import '../styles/PasswordModal.css';

const PasswordModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  fileName, 
  isProcessing = false,
  error = null 
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password);
    }
  };

  const handleClose = () => {
    setPassword('');
    setShowPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="password-modal-overlay">
      <div className="password-modal">
        <div className="password-modal-header">
          <div className="password-modal-icon">
            <Lock size={24} />
          </div>
          <h2>Password Protected Document</h2>
          <button 
            className="password-modal-close"
            onClick={handleClose}
            disabled={isProcessing}
          >
            ×
          </button>
        </div>

        <div className="password-modal-content">
          <div className="password-modal-file-info">
            <FileText size={20} />
            <span>{fileName}</span>
          </div>

          <p className="password-modal-description">
            This PDF is password protected. Please enter the password to unlock and process your bank statement.
          </p>

          {error && (
            <div className="password-modal-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="password-modal-form">
            <div className="password-input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter document password"
                className="password-input"
                disabled={isProcessing}
                autoFocus
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isProcessing}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            <div className="password-modal-actions">
              <button
                type="button"
                className="password-modal-button cancel"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="password-modal-button submit"
                disabled={!password.trim() || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="spinner"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Unlock & Process
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="password-modal-info">
            <div className="info-item">
              <span className="info-icon">🔒</span>
              <span>Your password is processed securely and not stored</span>
            </div>
            <div className="info-item">
              <span className="info-icon">🤖</span>
              <span>AI will automatically analyze and create bookkeeping entries</span>
            </div>
            <div className="info-item">
              <span className="info-icon">⚡</span>
              <span>Complete P&L analysis and journal entries in seconds</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;