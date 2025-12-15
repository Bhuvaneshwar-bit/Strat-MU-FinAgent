import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2 } from 'lucide-react';
import { buildApiUrl } from '../config/api';
import '../styles/AIChatbot.css';

const AIChatbot = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: `Hi ${user?.firstName || 'there'}! 👋 I'm your AI CFO assistant. How can I help you with your finances today?`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(buildApiUrl('/api/chat/message'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.text,
          conversationHistory: messages.map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.text
          }))
        })
      });

      const data = await response.json();

      if (data.success) {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          text: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: "I'm sorry, I couldn't process your request right now. Please try again later.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const minimizeChat = () => {
    setIsMinimized(true);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Use portal to render chatbot at document body level
  return ReactDOM.createPortal(
    <div className="ai-chatbot-container">
      {/* Chat Window */}
      {isOpen && (
        <div className={`chat-window ${isMinimized ? 'minimized' : ''}`}>
          {/* Chat Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">
                <Bot />
              </div>
              <div className="chat-title">
                <h4>AI CFO Assistant</h4>
                <span className="online-status">
                  <span className="status-dot"></span>
                  Online
                </span>
              </div>
            </div>
            <div className="chat-header-actions">
              <button className="header-btn" onClick={minimizeChat}>
                <Minimize2 />
              </button>
              <button className="header-btn close-btn" onClick={() => setIsOpen(false)}>
                <X />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          {!isMinimized && (
            <>
              <div className="chat-messages">
                {messages.map((message) => (
                  <div key={message.id} className={`message ${message.type}`}>
                    <div className="message-avatar">
                      {message.type === 'bot' ? <Bot /> : <User />}
                    </div>
                    <div className="message-content">
                      <p>{message.text}</p>
                      <span className="message-time">{formatTime(message.timestamp)}</span>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="message bot">
                    <div className="message-avatar">
                      <Bot />
                    </div>
                    <div className="message-content typing">
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

              {/* Chat Input */}
              <div className="chat-input-container">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask me anything about your finances..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                />
                <button 
                  className="send-btn"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                >
                  {isLoading ? <Loader2 className="spinning" /> : <Send />}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button className={`chat-fab ${isOpen ? 'open' : ''}`} onClick={toggleChat}>
        {isOpen ? <X /> : <MessageCircle />}
        {!isOpen && <span className="fab-pulse"></span>}
      </button>
    </div>,
    document.body
  );
};

export default AIChatbot;