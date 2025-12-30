import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
  Bot,
  User,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Search,
  MoreVertical,
  Copy,
  CheckCircle
} from 'lucide-react';
import { buildApiUrl } from '../config/api';
import '../styles/FinancialAdvisor.css';

const FinancialAdvisor = ({ darkMode, user }) => {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [editingTitle, setEditingTitle] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Get auth token
  const getToken = () => localStorage.getItem('token');

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const response = await fetch(buildApiUrl('/api/financial-advisor/sessions'), {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const response = await fetch(buildApiUrl(`/api/financial-advisor/sessions/${sessionId}`), {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
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

  const createNewSession = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/financial-advisor/sessions'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const data = await response.json();
      if (data.success) {
        setSessions(prev => [data.session, ...prev]);
        setActiveSession(data.session);
        setMessages([]);
        inputRef.current?.focus();
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await fetch(buildApiUrl(`/api/financial-advisor/sessions/${sessionId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      if (activeSession?._id === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const updateSessionTitle = async (sessionId) => {
    try {
      await fetch(buildApiUrl(`/api/financial-advisor/sessions/${sessionId}/title`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });
      setSessions(prev => prev.map(s => 
        s._id === sessionId ? { ...s, title: newTitle } : s
      ));
      if (activeSession?._id === sessionId) {
        setActiveSession(prev => ({ ...prev, title: newTitle }));
      }
      setEditingTitle(null);
      setNewTitle('');
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message to UI immediately
    const tempUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const response = await fetch(buildApiUrl('/api/financial-advisor/chat'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: activeSession?._id,
          message: userMessage
        })
      });

      const data = await response.json();

      if (data.success) {
        // Add AI response
        const aiMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);

        // Update session info
        if (data.session) {
          setActiveSession(prev => ({
            ...prev,
            _id: data.session._id,
            title: data.session.title
          }));

          // Update sessions list
          setSessions(prev => {
            const exists = prev.find(s => s._id === data.session._id);
            if (exists) {
              return prev.map(s => 
                s._id === data.session._id 
                  ? { ...s, title: data.session.title, lastMessageAt: new Date().toISOString() }
                  : s
              );
            } else {
              return [{ _id: data.session._id, title: data.session.title, lastMessageAt: new Date().toISOString() }, ...prev];
            }
          });
        }
      } else {
        // Error response
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
          isError: true
        }]);
      }
    } catch (error) {
      console.error('Send message error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Connection error. Please check your internet and try again.',
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = async (text, messageIndex) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageIndex);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render markdown-like formatting
  const renderMessageContent = (content) => {
    // Split by code blocks first
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Code block
        const code = part.slice(3, -3);
        return (
          <pre key={index} className="code-block">
            <code>{code}</code>
          </pre>
        );
      }
      
      // Process other formatting
      let formatted = part
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Headers
        .replace(/^### (.*$)/gim, '<h4>$1</h4>')
        .replace(/^## (.*$)/gim, '<h3>$1</h3>')
        // Bullet points
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/^• (.*$)/gim, '<li>$1</li>')
        // Line breaks
        .replace(/\n/g, '<br/>');

      return (
        <span 
          key={index} 
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  };

  return (
    <div className={`financial-advisor-container ${darkMode ? 'dark' : 'light'}`}>
      {/* Sidebar */}
      <div className={`advisor-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h3><Sparkles className="header-icon" /> Advisor</h3>
          <button className="toggle-sidebar" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
          </button>
        </div>

        {isSidebarOpen && (
          <>
            <button className="new-chat-btn" onClick={createNewSession}>
              <Plus /> New Chat
            </button>

            <div className="search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="sessions-list">
              {isLoadingSessions ? (
                <div className="loading-sessions">
                  <Loader2 className="spin" />
                  <span>Loading chats...</span>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="no-sessions">
                  <MessageSquare />
                  <p>No chats yet</p>
                  <span>Start a new conversation</span>
                </div>
              ) : (
                filteredSessions.map(session => (
                  <div
                    key={session._id}
                    className={`session-item ${activeSession?._id === session._id ? 'active' : ''}`}
                    onClick={() => loadSession(session._id)}
                  >
                    {editingTitle === session._id ? (
                      <div className="edit-title-form">
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        <button onClick={() => updateSessionTitle(session._id)}>
                          <Check size={14} />
                        </button>
                        <button onClick={() => { setEditingTitle(null); setNewTitle(''); }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <MessageSquare className="session-icon" />
                        <div className="session-info">
                          <span className="session-title">{session.title}</span>
                          <span className="session-date">
                            <Clock size={10} /> {formatDate(session.lastMessageAt || session.createdAt)}
                          </span>
                        </div>
                        <div className="session-actions">
                          <button onClick={(e) => { e.stopPropagation(); setEditingTitle(session._id); setNewTitle(session.title); }}>
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
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {/* Chat Header */}
        <div className="chat-header">
          {!isSidebarOpen && (
            <button className="toggle-sidebar-mobile" onClick={() => setIsSidebarOpen(true)}>
              <ChevronRight />
            </button>
          )}
          <div className="chat-title">
            <Sparkles className="title-icon" />
            <div>
              <h2>Financial Advisor</h2>
              <span>Elite AI-powered financial guidance</span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-icon">
                <Sparkles />
              </div>
              <h2>Welcome to Financial Advisor</h2>
              <p>Get expert financial guidance tailored to Indian businesses</p>
              
              <div className="suggestion-chips">
                <button onClick={() => setInputMessage('What tax deductions can I claim as a startup?')}>
                  💰 Tax Deductions for Startups
                </button>
                <button onClick={() => setInputMessage('How do I register for GST?')}>
                  📋 GST Registration Process
                </button>
                <button onClick={() => setInputMessage('Should I choose LLP or Pvt Ltd?')}>
                  🏢 LLP vs Pvt Ltd Comparison
                </button>
                <button onClick={() => setInputMessage('How to reduce my tax liability legally?')}>
                  📊 Legal Tax Saving Strategies
                </button>
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`message ${message.role} ${message.isError ? 'error' : ''}`}
                >
                  <div className="message-avatar">
                    {message.role === 'user' ? (
                      <User />
                    ) : (
                      <Bot />
                    )}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-role">
                        {message.role === 'user' ? 'You' : 'Financial Advisor'}
                      </span>
                      <span className="message-time">{formatTime(message.timestamp)}</span>
                    </div>
                    <div className="message-text">
                      {renderMessageContent(message.content)}
                    </div>
                    {message.role === 'assistant' && !message.isError && (
                      <button 
                        className="copy-btn"
                        onClick={() => copyToClipboard(message.content, index)}
                      >
                        {copiedMessageId === index ? (
                          <><CheckCircle size={14} /> Copied!</>
                        ) : (
                          <><Copy size={14} /> Copy</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="message assistant loading">
                  <div className="message-avatar">
                    <Bot />
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
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

        {/* Input Area */}
        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything about finances, taxes, compliance..."
              rows={1}
              disabled={isLoading}
            />
            <button 
              className="send-btn"
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
            >
              {isLoading ? <Loader2 className="spin" /> : <Send />}
            </button>
          </div>
          <p className="input-hint">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinancialAdvisor;
