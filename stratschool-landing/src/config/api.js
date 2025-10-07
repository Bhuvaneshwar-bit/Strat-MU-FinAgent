// API Configuration for StratSchool FinAgent
const getApiUrl = () => {
  // In production (deployed), use the current domain
  if (window.location.hostname !== 'localhost') {
    return window.location.origin;
  }
  
  // In development, use localhost
  return 'http://localhost:5001';
};

export const API_BASE_URL = getApiUrl();

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  SIGNIN: '/api/signin',
  SIGNUP: '/api/signup',
  
  // P&L Statements
  PL_ANALYZE: '/api/pl-statements/analyze',
  PL_SAVE: '/api/pl/save-statement',
  PL_STATEMENTS: '/api/pl/statements',
  
  // Password Protected Documents
  CHECK_PASSWORD: '/api/password-protected/check-password',
  PROCESS_WITH_PASSWORD: '/api/password-protected/process-with-password',
  
  // Bookkeeping
  BOOKKEEPING_PROCESS: '/api/bookkeeping/process-document',
  BOOKKEEPING_ENTRIES: '/api/bookkeeping/entries',
  
  // Overview Dashboard
  OVERVIEW_DASHBOARD: '/api/overview/dashboard-overview',
  
  // Chat
  CHAT: '/api/chat',
  
  // Health Check
  HEALTH: '/api/health'
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function for API calls with default options
export const apiCall = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, defaultOptions);
    console.log(`✅ API Response: ${response.status} ${response.statusText}`);
    return response;
  } catch (error) {
    console.error(`❌ API Error: ${error.message}`);
    throw error;
  }
};

export default { API_BASE_URL, API_ENDPOINTS, buildApiUrl, apiCall };