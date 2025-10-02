import React, { useState } from 'react';
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

  const handleSignInSuccess = (userData) => {
    setUser(userData);
    setIsOnboardingOpen(true);
  };

  const handleOnboardingComplete = (data) => {
    console.log('Onboarding completed:', data);
    setOnboardingData(data);
    setIsOnboardingOpen(false);
    setShowDashboard(true);
  };

  const handleLogout = () => {
    setUser(null);
    setShowDashboard(false);
  };

  // Show Dashboard if user completed onboarding
  if (showDashboard && user) {
    return <Dashboard 
      user={user} 
      onLogout={handleLogout}
      onboardingData={onboardingData}
    />;
  }

  return (
    <div className="App">
      <Header 
        onBookDemo={handleBookDemo}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
      />
      
      <main>
        <Hero onBookDemo={handleBookDemo} />
        <Features />
        <About />
        <Pricing onBookDemo={handleBookDemo} />
      </main>
      
      <Footer onBookDemo={handleBookDemo} />

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
      />

      <OnboardingQuestionnaire
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}export default App;
