import React, { useState } from 'react';
import { X, Calendar, Clock, User, Mail, Phone, Building, MessageSquare } from 'lucide-react';
import '../styles/BookDemoModal.css';

const BookDemoModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    companySize: '',
    currentSolution: '',
    challenges: '',
    preferredDate: '',
    preferredTime: '',
    message: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const companySizes = [
    'Solo Entrepreneur',
    '2-5 employees',
    '6-10 employees',
    '11-25 employees',
    '26-50 employees',
    '50+ employees'
  ];

  const timeSlots = [
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.company.trim()) {
      newErrors.company = 'Company name is required';
    }

    if (!formData.companySize) {
      newErrors.companySize = 'Please select company size';
    }

    if (!formData.preferredDate) {
      newErrors.preferredDate = 'Please select a date';
    }

    if (!formData.preferredTime) {
      newErrors.preferredTime = 'Please select a time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Demo booking submitted:', formData);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      companySize: '',
      currentSolution: '',
      challenges: '',
      preferredDate: '',
      preferredTime: '',
      message: ''
    });
    setErrors({});
    setIsSubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Book a Demo</h2>
            <p className="modal-subtitle">
              See how StratSchool AI CFO can transform your financial management
            </p>
          </div>
          <button className="modal-close" onClick={handleClose}>
            <X />
          </button>
        </div>

        {isSubmitted ? (
          <div className="success-message">
            <div className="success-icon">
              <Calendar />
            </div>
            <h3>Demo Scheduled Successfully!</h3>
            <p>
              Thank you for booking a demo. We'll send you a calendar invite and 
              preparation guide shortly. Our team will contact you within 24 hours 
              to confirm the details.
            </p>
            <button className="success-button" onClick={handleClose}>
              Close
            </button>
          </div>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="form-section">
              <h3 className="section-title">
                <User className="section-icon" />
                Personal Information
              </h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={errors.firstName ? 'error' : ''}
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={errors.lastName ? 'error' : ''}
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={errors.email ? 'error' : ''}
                    placeholder="your@email.com"
                  />
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={errors.phone ? 'error' : ''}
                    placeholder="+91 98765 43210"
                  />
                  {errors.phone && <span className="error-message">{errors.phone}</span>}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">
                <Building className="section-icon" />
                Company Information
              </h3>
              <div className="form-group">
                <label htmlFor="company">Company Name *</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className={errors.company ? 'error' : ''}
                  placeholder="Your company name"
                />
                {errors.company && <span className="error-message">{errors.company}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="companySize">Company Size *</label>
                <select
                  id="companySize"
                  name="companySize"
                  value={formData.companySize}
                  onChange={handleInputChange}
                  className={errors.companySize ? 'error' : ''}
                >
                  <option value="">Select company size</option>
                  {companySizes.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                {errors.companySize && <span className="error-message">{errors.companySize}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="currentSolution">Current Financial Solution</label>
                <input
                  type="text"
                  id="currentSolution"
                  name="currentSolution"
                  value={formData.currentSolution}
                  onChange={handleInputChange}
                  placeholder="Excel, QuickBooks, Manual tracking, etc."
                />
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">
                <Calendar className="section-icon" />
                Preferred Demo Time
              </h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="preferredDate">Preferred Date *</label>
                  <input
                    type="date"
                    id="preferredDate"
                    name="preferredDate"
                    value={formData.preferredDate}
                    onChange={handleInputChange}
                    className={errors.preferredDate ? 'error' : ''}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.preferredDate && <span className="error-message">{errors.preferredDate}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="preferredTime">Preferred Time *</label>
                  <select
                    id="preferredTime"
                    name="preferredTime"
                    value={formData.preferredTime}
                    onChange={handleInputChange}
                    className={errors.preferredTime ? 'error' : ''}
                  >
                    <option value="">Select time slot</option>
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  {errors.preferredTime && <span className="error-message">{errors.preferredTime}</span>}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">
                <MessageSquare className="section-icon" />
                Additional Information
              </h3>
              <div className="form-group">
                <label htmlFor="challenges">Current Financial Challenges</label>
                <textarea
                  id="challenges"
                  name="challenges"
                  value={formData.challenges}
                  onChange={handleInputChange}
                  placeholder="What financial challenges are you facing? What would you like to see in the demo?"
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="message">Additional Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Any specific questions or requirements?"
                  rows="2"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="cancel-button" onClick={handleClose}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner"></div>
                    Scheduling Demo...
                  </>
                ) : (
                  <>
                    <Calendar className="button-icon" />
                    Schedule Demo
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BookDemoModal;