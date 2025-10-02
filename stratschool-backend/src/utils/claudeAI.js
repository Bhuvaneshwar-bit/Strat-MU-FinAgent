const axios = require('axios');

class ClaudeAIService {
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY;
    this.baseURL = 'https://api.anthropic.com/v1/messages';
    
    if (!this.apiKey) {
      throw new Error('Claude API key is required');
    }
    
    console.log('✅ Claude AI service initialized successfully');
  }

  async generateChatResponse(message, conversationHistory = [], plData = null) {
    try {
      console.log('🤖 Generating Claude AI response for:', message);

      // Build context from conversation history
      let contextMessages = [];
      
      // Add system message for context
      let systemMessage = `You are a helpful AI assistant for StratSchool, a financial analysis platform. You help users understand their P&L statements and provide business insights.`;
      
      if (plData) {
        systemMessage += `\n\nCurrent P&L Data Context:
- Revenue: $${plData.revenue || 'N/A'}
- Expenses: $${plData.expenses || 'N/A'}
- Net Profit: $${plData.netProfit || 'N/A'}
- Analysis: ${plData.analysis || 'No analysis available'}`;
      }

      // Add conversation history
      if (conversationHistory && conversationHistory.length > 0) {
        conversationHistory.slice(-10).forEach(msg => { // Keep last 10 messages for context
          contextMessages.push({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.text
          });
        });
      }

      // Add current message
      contextMessages.push({
        role: 'user',
        content: message
      });

      const response = await axios.post(
        this.baseURL,
        {
          model: 'claude-3-haiku-20240307', // Using fastest Claude model
          max_tokens: 1000,
          system: systemMessage,
          messages: contextMessages
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.content && response.data.content.length > 0) {
        const aiResponse = response.data.content[0].text.trim();
        console.log('✅ Claude AI response generated successfully');
        return aiResponse;
      } else {
        throw new Error('Invalid response format from Claude API');
      }

    } catch (error) {
      console.error('❌ Claude AI response generation failed:', error.message);
      
      if (error.response) {
        console.error('API Error Status:', error.response.status);
        console.error('API Error Data:', error.response.data);
      }
      
      // Return a helpful fallback message
      return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or feel free to ask me about your P&L analysis or any financial questions you might have.";
    }
  }
}

// Create and export a singleton instance
const claudeAI = new ClaudeAIService();
module.exports = claudeAI;