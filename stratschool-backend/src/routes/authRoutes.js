const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Simple User Schema (matching simple-server.js)
const User = mongoose.model('User', {
  firstName: String,
  lastName: String, 
  email: { type: String, unique: true },
  password: String
});

// Sign Up Route
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    console.log('🔐 Signup attempt for:', email);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: 'User already exists with this email' });
    }
    
    // Hash password for security
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = new User({ 
      firstName, 
      lastName, 
      email, 
      password: hashedPassword 
    });
    
    await user.save();
    
    console.log('✅ User registered successfully:', email);
    res.json({ success: true, message: 'User registered successfully' });
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
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.json({ success: false, message: 'Invalid credentials' });
    }
    
    // For backward compatibility, check both hashed and plain passwords
    let isValidPassword = false;
    
    if (user.password.startsWith('$2')) {
      // Hashed password
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      // Plain text password (legacy)
      isValidPassword = password === user.password;
    }
    
    if (isValidPassword) {
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