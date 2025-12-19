import React, { useState, useEffect } from 'react';
import './styles/globals.css';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import About from './components/About';
import Pricing from './components/Pricing';
import Footer from './components/Footer';
import BookDemoModal from './components/BookDemoModal';
import AuthModal from './components/AuthModal';
import OnboardingQuestionnaire from './components/OnboardingQuestionnaire';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [authModalType, setAuthModalType] = useState('signin'); // 'signin' or 'signup'
  const [user, setUser] = useState(null);
  const [onboardingData, setOnboardingData] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('landingDarkMode');
    return saved ? JSON.parse(saved) : true; // Default to dark mode
  });

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('landingDarkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Helper function to get user-specific localStorage key
  const getUserPlDataKey = (userId) => `plData_${userId}`;

  // Check for existing user session on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        console.log('🔄 Restoring user session for:', userData.email);
        setUser(userData);
        
        // Load P&L data - check user-specific key first, then temp, then global
        const userId = userData._id || userData.id || userData.email;
        const userPlDataKey = getUserPlDataKey(userId);
        
        let savedPlData = localStorage.getItem(userPlDataKey);
        
        // Fallback to temp key
        if (!savedPlData) {
          savedPlData = localStorage.getItem('plData_temp');
          if (savedPlData) {
            console.log('📦 Migrating temp plData to user key');
            localStorage.setItem(userPlDataKey, savedPlData);
          }
        }
        
        // Fallback to global key (legacy)
        if (!savedPlData) {
          savedPlData = localStorage.getItem('plData');
          if (savedPlData) {
            console.log('📦 Migrating global plData to user key');
            localStorage.setItem(userPlDataKey, savedPlData);
            localStorage.removeItem('plData');
          }
        }
        
        if (savedPlData) {
          console.log('📊 Found P&L data for user');
          setOnboardingData({ plData: JSON.parse(savedPlData) });
        } else {
          console.log('📊 No P&L data found for this user');
        }
        
        setShowDashboard(true);
      } catch (e) {
        console.error('Failed to restore user session');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleBookDemo = () => {
    setIsDemoModalOpen(true);
  };

  const handleSignIn = () => {
    setAuthModalType('signin');
    setIsAuthModalOpen(true);
  };

  const handleSignUp = () => {
    setAuthModalType('signup');
    setIsAuthModalOpen(true);
  };

  const handleAuthModalClose = () => {
    setIsAuthModalOpen(false);
  };

  const handleAuthModalSwitch = () => {
    setAuthModalType(authModalType === 'signin' ? 'signup' : 'signin');
  };

  // Called after successful sign IN (existing user) - go directly to dashboard
  const handleSignInSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData)); // Persist user
    setIsAuthModalOpen(false);
    
    // Load user-specific P&L data
    const userPlDataKey = getUserPlDataKey(userData._id || userData.id || userData.email);
    let savedPlData = localStorage.getItem(userPlDataKey);
    
    // Check for temp plData (saved during signup when user was null)
    if (!savedPlData) {
      const tempPlData = localStorage.getItem('plData_temp');
      if (tempPlData) {
        console.log('📦 Found temp plData, migrating to user key:', userPlDataKey);
        localStorage.setItem(userPlDataKey, tempPlData);
        localStorage.removeItem('plData_temp');
        savedPlData = tempPlData;
      }
    }
    
    if (savedPlData) {
      try {
        setOnboardingData({ plData: JSON.parse(savedPlData) });
      } catch (e) {
        console.error('Failed to load saved P&L data');
      }
    } else {
      // No saved data for this user - clear any previous data
      setOnboardingData(null);
    }
    setShowDashboard(true); // Go directly to dashboard for existing users
  };

  // Called after successful sign UP (new user) - show questionnaire
  const handleSignUpSuccess = (userData) => {
    console.log('🆕 handleSignUpSuccess called with user:', userData);
    console.log('🆕 User ID:', userData?._id || userData?.id);
    console.log('🆕 User email:', userData?.email);
    
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData)); // Persist user
    
    // Verify it was saved
    const savedUser = localStorage.getItem('user');
    console.log('🆕 Verified localStorage user:', savedUser ? 'SAVED' : 'NOT SAVED');
    
    setIsAuthModalOpen(false);
    setOnboardingData(null); // Clear any previous user's data
    setIsOnboardingOpen(true); // Show questionnaire for new users
  };

  const handleOnboardingComplete = (data) => {
    console.log('🎯 handleOnboardingComplete called with:', data);
    console.log('🎯 User from data:', data?.user);
    console.log('🎯 Current user state:', user);
    console.log('🎯 Has plData:', !!data?.plData);
    
    // Get user from data (passed from questionnaire), OR state, OR localStorage
    let currentUser = data?.user || user;
    if (!currentUser) {
      console.log('⚠️ User not in data or state, trying localStorage...');
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          currentUser = JSON.parse(savedUser);
          console.log('✅ Restored user from localStorage:', currentUser.email);
        } catch (e) {
          console.error('❌ Failed to restore user from localStorage');
        }
      }
    }
    
    // Make sure user is saved to state and localStorage
    if (currentUser) {
      console.log('✅ Setting user:', currentUser.email);
      setUser(currentUser);
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
    
    setOnboardingData(data);
    setIsOnboardingOpen(false);
    
    // Save user-specific P&L data immediately
    if (data?.plData && currentUser) {
      const userPlDataKey = getUserPlDataKey(currentUser._id || currentUser.id || currentUser.email);
      console.log('🎯 Saving plData to localStorage with key:', userPlDataKey);
      localStorage.setItem(userPlDataKey, JSON.stringify(data.plData));
    } else if (data?.plData) {
      // Fallback: save with a temporary key if no user found
      console.log('⚠️ No user found, saving plData with temp key');
      localStorage.setItem('plData_temp', JSON.stringify(data.plData));
    }
    
    console.log('🎯 Setting showDashboard to true');
    setShowDashboard(true);
  };

  const handleLogout = () => {
    // DON'T delete plData on logout - user should see their data when they sign back in
    // Only clear the session, not the data
    setUser(null);
    setOnboardingData(null);
    localStorage.removeItem('user');
    setShowDashboard(false);
  };

  // Compute the current user - from state or localStorage
  const getCurrentUser = () => {
    if (user) return user;
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const currentUser = getCurrentUser();

  // Show Dashboard if showDashboard is true and we have either a user OR onboarding data
  // This ensures we show the dashboard after signup even if user state is lost
  if (showDashboard && (currentUser || onboardingData?.plData)) {
    // Create a fallback user if needed
    const dashboardUser = currentUser || { 
      email: 'user@stratschool.com', 
      firstName: 'User',
      _id: 'temp_' + Date.now()
    };
    
    return <Dashboard 
      user={dashboardUser} 
      onLogout={handleLogout}
      onboardingData={onboardingData}
    />;
  }

  return (
    <div className={`App ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <Header 
        onBookDemo={handleBookDemo}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
      
      <main>
        <Hero onBookDemo={handleBookDemo} darkMode={darkMode} />
        <Features darkMode={darkMode} />
        <About darkMode={darkMode} />
        <Pricing onBookDemo={handleBookDemo} darkMode={darkMode} />
      </main>
      
      <Footer onBookDemo={handleBookDemo} darkMode={darkMode} />

      {/* Modals */}
      <BookDemoModal 
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
      
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleAuthModalClose}
        type={authModalType}
        onSwitchType={handleAuthModalSwitch}
        onSignInSuccess={handleSignInSuccess}
        onSignUpSuccess={handleSignUpSuccess}
        darkMode={darkMode}
      />

      {/* Only render questionnaire when open - ensures fresh mount with current user */}
      {isOnboardingOpen && (
        <OnboardingQuestionnaire
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onComplete={handleOnboardingComplete}
          user={user}
        />
      )}
    </div>
  );
}

export default App;
