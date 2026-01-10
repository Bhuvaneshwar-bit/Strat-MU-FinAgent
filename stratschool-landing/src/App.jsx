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
import { API_BASE_URL } from './config/api';
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

  // Helper function to clear all legacy/other user cache keys
  const clearLegacyCache = (currentUserId) => {
    // Clear global legacy keys
    localStorage.removeItem('plData');
    localStorage.removeItem('plData_temp');
    
    // Clear any other user's plData keys (prevent cross-user data leaks)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('plData_') && key !== `plData_${currentUserId}`) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      console.log(`🗑️ Removing other user cache: ${key}`);
      localStorage.removeItem(key);
    });
  };

  // Check for existing user session on app load
  useEffect(() => {
    const restoreSession = async () => {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          console.log('🔄 Restoring user session for:', userData.email);
          setUser(userData);
          
          // Load P&L data - ONLY from user-specific key
          const userId = userData._id || userData.id || userData.email;
          const userPlDataKey = getUserPlDataKey(userId);
          
          // Clear any legacy/other user cache to prevent data leaks
          clearLegacyCache(userId);
          
          let savedPlData = localStorage.getItem(userPlDataKey);
          let localPlData = null;
          
          if (savedPlData) {
            console.log('📊 Found P&L data in localStorage (cache)');
            localPlData = JSON.parse(savedPlData);
            setOnboardingData({ plData: localPlData });
          }
          
          // Check if localStorage has good data (non-zero values)
          const localHasGoodData = localPlData && (
            (localPlData.analysisMetrics?.totalRevenue > 0 || localPlData.analysisMetrics?.totalExpenses > 0) ||
            (localPlData.plStatement?.revenue?.totalRevenue > 0 || localPlData.plStatement?.expenses?.totalExpenses > 0)
          );
          
          // Only fetch from database if localStorage is empty or has incomplete data
          if (token && !localHasGoodData) {
            console.log('🌐 Fetching P&L data from database (localStorage empty or incomplete)...');
            try {
              const response = await fetch(`${API_BASE_URL}/api/pl-statements/my-data`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.hasData) {
                  console.log('✅ Found P&L data in database, syncing...');
                  setOnboardingData({ plData: data.plData });
                  // Update localStorage cache
                  localStorage.setItem(userPlDataKey, JSON.stringify(data.plData));
                } else if (!savedPlData) {
                  console.log('📊 No P&L data found in database or localStorage');
                }
              }
            } catch (fetchError) {
              console.error('⚠️ Failed to fetch P&L from database, using localStorage cache');
            }
          } else if (localHasGoodData) {
            console.log('📊 Using localStorage cache (has good data)');
          }
          
          setShowDashboard(true);
        } catch (e) {
          console.error('Failed to restore user session');
          localStorage.removeItem('user');
        }
      }
    };
    
    restoreSession();
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
  const handleSignInSuccess = async (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData)); // Persist user
    setIsAuthModalOpen(false);
    
    // Clear any legacy/other user cache to prevent data leaks
    const userId = userData._id || userData.id || userData.email;
    clearLegacyCache(userId);
    
    // Load user-specific P&L data
    const userPlDataKey = getUserPlDataKey(userId);
    let savedPlData = localStorage.getItem(userPlDataKey);
    let localPlData = null;
    
    // Show dashboard immediately (will show loading or empty state)
    setShowDashboard(true);
    
    if (savedPlData) {
      try {
        console.log('📊 Loading P&L data from localStorage cache');
        localPlData = JSON.parse(savedPlData);
        setOnboardingData({ plData: localPlData });
      } catch (e) {
        console.error('Failed to load saved P&L data');
      }
    }
    
    // Only fetch from database if localStorage is empty or has incomplete data
    const token = localStorage.getItem('token');
    const localHasGoodData = localPlData && (
      (localPlData.analysisMetrics?.totalRevenue > 0 || localPlData.analysisMetrics?.totalExpenses > 0) ||
      (localPlData.plStatement?.revenue?.totalRevenue > 0 || localPlData.plStatement?.expenses?.totalExpenses > 0)
    );
    
    if (token && !localHasGoodData) {
      console.log('🌐 Fetching P&L data from database (localStorage empty or incomplete)...');
      try {
        const response = await fetch(`${API_BASE_URL}/api/pl-statements/my-data`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📥 Database response:', data);
          if (data.success && data.hasData) {
            console.log('✅ Found P&L data in database, syncing...');
            setOnboardingData({ plData: data.plData });
            // Update localStorage cache
            localStorage.setItem(userPlDataKey, JSON.stringify(data.plData));
          } else {
            console.log('📊 No P&L data found in database for this user');
            if (!savedPlData) {
              setOnboardingData(null);
            }
          }
        } else {
          console.log('⚠️ Failed to fetch from database, status:', response.status);
        }
      } catch (fetchError) {
        console.error('⚠️ Failed to fetch P&L from database:', fetchError);
      }
    }
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
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

export default App;
