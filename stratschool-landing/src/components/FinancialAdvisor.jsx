import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Send, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  User, 
  Sparkles,
  Clock,
  Loader2,
  Copy,
  CheckCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { buildApiUrl } from '../config/api';
import '../styles/FinancialAdvisor.css';

const FinancialAdvisor = ({ darkMode, user }) => {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchSessions();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const response = await fetch(buildApiUrl('/api/financial-advisor/sessions'), {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const response = await fetch(buildApiUrl(`/api/financial-advisor/sessions/${sessionId}`), {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setActiveSession(data.session);
        setMessages(data.session.messages || []);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const createNewChat = () => {
    setActiveSession(null);
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message immediately
    const newUserMessage = { role: 'user', content: userMessage, timestamp: new Date() };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(buildApiUrl('/api/financial-advisor/chat'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sessionId: activeSession?._id,
          message: userMessage
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const aiMessage = { role: 'assistant', content: data.response, timestamp: new Date() };
        setMessages(prev => [...prev, aiMessage]);
        
        // Update session info
        if (data.session) {
          setActiveSession(prev => ({
            ...prev,
            _id: data.session._id,
            title: data.session.title
          }));
          fetchSessions();
        }
      } else {
        setMessages(prev => [...prev, { 
          role: 'error', 
          content: 'Failed to get response. Please try again.',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Send message error:', error);
      setMessages(prev => [...prev, { 
        role: 'error', 
        content: 'Network error. Please check your connection.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      const response = await fetch(buildApiUrl(`/api/financial-advisor/sessions/${sessionId}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        setSessions(prev => prev.filter(s => s._id !== sessionId));
        if (activeSession?._id === sessionId) {
          createNewChat();
        }
      }
    } catch (error) {
      console.error('Delete session error:', error);
    }
  };

  const updateTitle = async (sessionId) => {
    if (!editTitle.trim()) return;
    
    try {
      const response = await fetch(buildApiUrl(`/api/financial-advisor/sessions/${sessionId}/title`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: editTitle.trim() })
      });
      
      if (response.ok) {
        setSessions(prev => prev.map(s => 
          s._id === sessionId ? { ...s, title: editTitle.trim() } : s
        ));
        setEditingId(null);
        setEditTitle('');
      }
    } catch (error) {
      console.error('Update title error:', error);
    }
  };

  const copyMessage = (content, id) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const filteredSessions = sessions.filter(s => 
    s.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const suggestions = [
    "How can I save tax as a freelancer?",
    "GST registration process for startups",
    "LLP vs Pvt Ltd - which is better?",
    "How to calculate advance tax?"
  ];

  return (
    <div className={`fa-container ${darkMode ? 'dark' : 'light'}`}>
      {/* Sidebar */}
      <aside className={`fa-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="fa-sidebar-header">
          <button className="fa-new-chat" onClick={createNewChat}>
            <Plus size={18} />
            <span>New Chat</span>
          </button>
          <button className="fa-toggle-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {sidebarOpen && (
          <>
            <div className="fa-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="fa-sessions">
              {sessionsLoading ? (
                <div className="fa-loading">
                  <Loader2 size={20} className="spin" />
                  <span>Loading...</span>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="fa-empty">
                  <MessageSquare size={24} />
                  <p>No conversations yet</p>
                </div>
              ) : (
                filteredSessions.map(session => (
                  <div
                    key={session._id}
                    className={`fa-session ${activeSession?._id === session._id ? 'active' : ''}`}
                    onClick={() => loadSession(session._id)}
                  >
                    {editingId === session._id ? (
                      <div className="fa-edit-title" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && updateTitle(session._id)}
                        />
                        <button onClick={() => updateTitle(session._id)}><Check size={14} /></button>
                        <button onClick={() => { setEditingId(null); setEditTitle(''); }}><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <MessageSquare size={16} />
                        <div className="fa-session-info">
                          <span className="fa-session-title">{session.title}</span>
                          <span className="fa-session-date">{formatDate(session.lastMessageAt || session.createdAt)}</span>
                        </div>
                        <div className="fa-session-actions">
                          <button onClick={(e) => { e.stopPropagation(); setEditingId(session._id); setEditTitle(session.title); }}>
                            <Edit3 size={14} />
                          </button>
                          <button onClick={(e) => deleteSession(session._id, e)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </aside>

      {/* Main Chat */}
      <main className="fa-main">
        <header className="fa-header">
          {!sidebarOpen && (
            <button className="fa-toggle-sidebar-mobile" onClick={() => setSidebarOpen(true)}>
              <ChevronRight size={20} />
            </button>
          )}
          <div className="fa-header-title">
            <Sparkles size={24} />
            <div>
              <h1>Financial Advisor</h1>
              <span>Elite AI-powered guidance for Indian businesses</span>
            </div>
          </div>
        </header>

        <div className="fa-messages">
          {messages.length === 0 ? (
            <div className="fa-welcome">
              <div className="fa-welcome-icon">
                <Sparkles size={48} />
              </div>
              <h2>How can I help you today?</h2>
              <p>Ask me anything about taxes, GST, business structuring, funding, and more.</p>
              
              <div className="fa-suggestions">
                {suggestions.map((text, i) => (
                  <button key={i} onClick={() => { setInput(text); inputRef.current?.focus(); }}>
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="fa-messages-list">
              {messages.map((msg, idx) => (
                <div key={idx} className={`fa-message ${msg.role}`}>
                  <div className="fa-message-avatar">
                    {msg.role === 'user' ? (
                      <User size={18} />
                    ) : (
                      <Sparkles size={18} />
                    )}
                  </div>
                  <div className="fa-message-content">
                    <div className="fa-message-header">
                      <span className="fa-message-role">
                        {msg.role === 'user' ? 'You' : 'Financial Advisor'}
                      </span>
                      <span className="fa-message-time">
                        {msg.timestamp && formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div className="fa-message-text">
                      {msg.content.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i < msg.content.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                    {msg.role === 'assistant' && (
                      <button 
                        className="fa-copy-btn"
                        onClick={() => copyMessage(msg.content, idx)}
                      >
                        {copiedId === idx ? <CheckCheck size={14} /> : <Copy size={14} />}
                        {copiedId === idx ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="fa-message assistant">
                  <div className="fa-message-avatar">
                    <Sparkles size={18} />
                  </div>
                  <div className="fa-message-content">
                    <div className="fa-typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="fa-input-area">
          <div className="fa-input-wrapper">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about taxes, GST, business setup..."
              rows={1}
              disabled={isLoading}
            />
            <button 
              className="fa-send-btn" 
              onClick={sendMessage} 
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
            </button>
          </div>
          <p className="fa-disclaimer">AI can make mistakes. Verify important information with a CA.</p>
        </div>
      </main>
    </div>
  );
};

export default FinancialAdvisor;
