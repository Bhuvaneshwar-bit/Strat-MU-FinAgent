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
  Loader2,
  Copy,
  CheckCheck,
  PanelLeftClose,
  PanelLeft,
  Bot,
  TrendingUp,
  Calculator,
  FileText,
  Building2
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
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

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
    textareaRef.current?.focus();
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message immediately
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      const response = await fetch(buildApiUrl('/api/financial-advisor/chat'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: userMessage,
          sessionId: activeSession?._id
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessages([...newMessages, { role: 'assistant', content: data.response }]);
        
        if (data.session) {
          setActiveSession(data.session);
          fetchSessions();
        }
      } else {
        setMessages([...newMessages, { 
          role: 'assistant', 
          content: '⚠️ Sorry, I encountered an error. Please try again.',
          isError: true 
        }]);
      }
    } catch (error) {
      console.error('Send message error:', error);
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: '⚠️ Connection error. Please check your internet and try again.',
        isError: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await fetch(buildApiUrl(`/api/financial-advisor/sessions/${sessionId}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      setSessions(sessions.filter(s => s._id !== sessionId));
      if (activeSession?._id === sessionId) {
        createNewChat();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const saveEditTitle = async (sessionId) => {
    if (!editTitle.trim()) return;
    try {
      await fetch(buildApiUrl(`/api/financial-advisor/sessions/${sessionId}/title`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: editTitle.trim() })
      });
      setSessions(sessions.map(s => 
        s._id === sessionId ? { ...s, title: editTitle.trim() } : s
      ));
      setEditingId(null);
    } catch (error) {
      console.error('Save title error:', error);
    }
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
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

  // Format AI response with proper styling
  const formatResponse = (text) => {
    if (!text) return '';
    
    return text
      .replace(/^### (.*$)/gim, '<h4 class="response-h4">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 class="response-h3">$1</h3>')
      .replace(/^# (.*$)/gim, '<h2 class="response-h2">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/```([\s\S]*?)```/g, '<pre class="code-block">$1</pre>')
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      .replace(/^[-•] (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
  };

  const filteredSessions = sessions.filter(s => 
    s.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const suggestionChips = [
    { icon: Calculator, text: "How to reduce my tax liability legally?", color: "#D4AF37" },
    { icon: FileText, text: "GST registration requirements for my business", color: "#3b82f6" },
    { icon: TrendingUp, text: "Best investment options for business surplus", color: "#10b981" },
    { icon: Building2, text: "LLP vs Pvt Ltd - which is better for me?", color: "#8b5cf6" }
  ];

  return (
    <div className={`financial-advisor ${darkMode ? 'dark' : 'light'}`}>
      {/* Sidebar */}
      <aside className={`fa-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-content">
          <button className="new-chat-btn" onClick={createNewChat}>
            <Plus size={18} />
            {sidebarOpen && <span>New Chat</span>}
          </button>

          {sidebarOpen && (
            <>
              <div className="sidebar-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="sessions-container">
                {sessionsLoading ? (
                  <div className="sessions-loading">
                    <Loader2 className="spin" size={24} />
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="no-sessions">
                    <MessageSquare size={32} />
                    <p>No conversations yet</p>
                    <span>Start a new chat to get expert financial advice</span>
                  </div>
                ) : (
                  <div className="sessions-list">
                    {filteredSessions.map(session => (
                      <div
                        key={session._id}
                        className={`session-item ${activeSession?._id === session._id ? 'active' : ''}`}
                        onClick={() => loadSession(session._id)}
                      >
                        {editingId === session._id ? (
                          <div className="edit-form">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditTitle(session._id)}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button onClick={() => saveEditTitle(session._id)} className="save-btn">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="cancel-btn">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <MessageSquare size={16} className="session-icon" />
                            <div className="session-details">
                              <span className="session-title">{session.title || 'New Chat'}</span>
                              <span className="session-date">{formatDate(session.lastMessageAt || session.createdAt)}</span>
                            </div>
                            <div className="session-actions">
                              <button onClick={(e) => { e.stopPropagation(); setEditingId(session._id); setEditTitle(session.title); }}>
                                <Edit3 size={14} />
                              </button>
                              <button onClick={(e) => deleteSession(session._id, e)} className="delete-btn">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
        </button>
      </aside>

      {/* Main Chat Area */}
      <main className="fa-main">
        <header className="fa-header">
          <div className="header-title">
            <Sparkles size={24} className="header-icon" />
            <div>
              <h1>Financial Advisor</h1>
              <span>Elite AI-powered guidance for Indian businesses</span>
            </div>
          </div>
        </header>

        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="welcome-container">
              <div className="welcome-content">
                <div className="welcome-icon">
                  <Sparkles size={48} />
                </div>
                <h2>Welcome to Financial Advisor</h2>
                <p>Get expert guidance on taxes, GST, business structure, investments, and compliance — tailored for Indian entrepreneurs.</p>
                
                <div className="suggestions">
                  <p className="suggestions-label">Try asking:</p>
                  <div className="suggestion-grid">
                    {suggestionChips.map((chip, idx) => (
                      <button
                        key={idx}
                        className="suggestion-chip"
                        onClick={() => setInput(chip.text)}
                        style={{ '--chip-color': chip.color }}
                      >
                        <chip.icon size={18} />
                        <span>{chip.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="messages-wrapper">
              <div className="messages-list">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`message ${msg.role} ${msg.isError ? 'error' : ''}`}>
                    <div className="message-avatar">
                      {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                    </div>
                    <div className="message-body">
                      <div className="message-header">
                        <span className="message-sender">
                          {msg.role === 'user' ? (user?.firstName || 'You') : 'Financial Advisor'}
                        </span>
                      </div>
                      <div 
                        className="message-content"
                        dangerouslySetInnerHTML={{ __html: formatResponse(msg.content) }}
                      />
                      {msg.role === 'assistant' && !msg.isError && (
                        <button 
                          className="copy-btn"
                          onClick={() => copyToClipboard(msg.content, idx)}
                        >
                          {copiedId === idx ? <CheckCheck size={14} /> : <Copy size={14} />}
                          {copiedId === idx ? 'Copied!' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="message assistant loading">
                    <div className="message-avatar">
                      <Bot size={18} />
                    </div>
                    <div className="message-body">
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
            </div>
          )}
        </div>

        <div className="input-area">
          <div className="input-container">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about taxes, GST, compliance, investments..."
              rows={1}
              disabled={isLoading}
            />
            <button 
              className="send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? <Loader2 className="spin" size={20} /> : <Send size={20} />}
            </button>
          </div>
          <p className="input-hint">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </main>
    </div>
  );
};

export default FinancialAdvisor;
