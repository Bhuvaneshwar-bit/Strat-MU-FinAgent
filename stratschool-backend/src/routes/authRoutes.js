const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Use existing User model
const router = express.Router();

// Sign Up Route
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    console.log('🔐 Signup attempt for:', email);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.json({ success: false, message: 'User already exists with this email' });
    }
    
    // Create new user (password will be automatically hashed by pre-save middleware)
    const user = new User({ 
      firstName, 
      lastName, 
      email: email.toLowerCase(), 
      password 
    });
    
    await user.save();
    
    // Generate JWT token for the new user (so they don't inherit old user's token)
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'stratschool_jwt_secret_key_2025_super_secure_random_string',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    console.log('✅ User registered successfully:', email);
    res.json({ 
      success: true, 
      message: 'User registered successfully',
      token,
      user: { 
        firstName: user.firstName, 
        lastName: user.lastName, 
        email: user.email 
      }
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.json({ success: false, message: error.message });
  }
});

// Sign In Route  
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Signin attempt for:', email);
    
    // Use the existing findForAuth method
    const user = await User.findForAuth(email.toLowerCase());
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.json({ success: false, message: 'Invalid credentials' });
    }
    
    // Use the existing comparePassword method
    const isValidPassword = await user.comparePassword(password);
    
    if (isValidPassword) {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'stratschool_jwt_secret_key_2025_super_secure_random_string',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      
      console.log('✅ Login successful for:', email);
      res.json({ 
        success: true, 
        message: 'Login successful', 
        token,
        user: { 
          firstName: user.firstName, 
          lastName: user.lastName, 
          email: user.email 
        } 
      });
    } else {
      console.log('❌ Invalid password for:', email);
      res.json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('❌ Signin error:', error);
    res.json({ success: false, message: error.message });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Authentication API is working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;