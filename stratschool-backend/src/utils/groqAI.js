const axios = require('axios');

class GroqAIService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseURL = 'https://api.groq.com/openai/v1/chat/completions';
    
    if (!this.apiKey) {
      throw new Error('Groq API key is required');
    }
    
    console.log('✅ Groq AI service initialized successfully');
  }

  async generateChatResponse(message, conversationHistory = [], plData = null) {
    try {
      console.log('🚀 Generating Groq AI response for:', message);

      // Build context from conversation history
      let messages = [];
      
      // Add system message for context
      let systemMessage = `You are Daddy, a concise AI financial advisor for StratSchool. 

CRITICAL RULES:
1. Keep ALL responses to 2-3 sentences MAX
2. Be direct and to the point - no lengthy explanations
3. Use bullet points only if absolutely necessary (max 3 bullets)
4. All amounts are in Indian Rupees (₹) - never use $
5. Reference the actual data provided below
6. Don't repeat what the user already knows
7. Give ONE actionable insight per response

Example good response: "Your net loss is ₹42,921. Focus on reducing your highest expense category to improve margins."
Example bad response: Long paragraphs with multiple observations and detailed breakdowns.`;
      
      if (plData) {
        systemMessage += `\n\n=== FINANCIAL DATA ===`;
        
        // Basic P&L Information
        if (plData.totalRevenue || plData.totalExpenses) {
          systemMessage += `\nRevenue: ₹${plData.totalRevenue?.toLocaleString('en-IN') || 'N/A'} | Expenses: ₹${plData.totalExpenses?.toLocaleString('en-IN') || 'N/A'} | Net: ₹${plData.netIncome?.toLocaleString('en-IN') || 'N/A'} | Margin: ${plData.profitMargin || 'N/A'}%`;
        }

        // Revenue Categories (simplified)
        if (plData.revenueBreakdown && plData.revenueBreakdown.length > 0) {
          const topRevenue = plData.revenueBreakdown.slice(0, 3).map(r => `${r.category}: ₹${r.amount?.toLocaleString('en-IN')}`).join(' | ');
          systemMessage += `\nTop Revenue: ${topRevenue}`;
        }

        // Expense Categories (simplified)
        if (plData.expenseBreakdown && plData.expenseBreakdown.length > 0) {
          const topExpenses = plData.expenseBreakdown.slice(0, 3).map(e => `${e.category}: ₹${e.amount?.toLocaleString('en-IN')}`).join(' | ');
          systemMessage += `\nTop Expenses: ${topExpenses}`;
        }

        systemMessage += `\n\nRemember: Keep responses to 2-3 sentences. Be concise and actionable.`;
      }

      messages.push({
        role: 'system',
        content: systemMessage
      });

      // Add conversation history (keep last 8 messages for context)
      if (conversationHistory && conversationHistory.length > 0) {
        conversationHistory.slice(-8).forEach(msg => {
          // Handle both formats: {type, text} or {role, content}
          const role = msg.role || (msg.type === 'user' ? 'user' : 'assistant');
          const content = msg.content || msg.text;
          messages.push({
            role: role,
            content: content
          });
        });
      }

      // Add current message
      messages.push({
        role: 'user',
        content: message
      });

      const response = await axios.post(
        this.baseURL,
        {
          model: 'llama-3.1-8b-instant', // Updated to current model
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7,
          top_p: 1,
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const aiResponse = response.data.choices[0].message.content.trim();
        console.log('✅ Groq AI response generated successfully');
        console.log('📊 Token usage:', response.data.usage);
        return aiResponse;
      } else {
        throw new Error('Invalid response format from Groq API');
      }

    } catch (error) {
      console.error('❌ Groq AI response generation failed:', error.message);
      
      if (error.response) {
        console.error('API Error Status:', error.response.status);
        console.error('API Error Data:', error.response.data);
        
        // Handle specific Groq API errors
        if (error.response.status === 401) {
          return "I apologize, but there's an authentication issue with the AI service. Please check the API key configuration.";
        } else if (error.response.status === 429) {
          return "I'm currently experiencing high demand. Please try again in a moment. In the meantime, I can see your P&L data looks good!";
        }
      }
      
      // Return a helpful fallback message
      return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or feel free to ask me about your P&L analysis or any financial questions you might have.";
    }
  }
}

// Create and export a singleton instance
const groqAI = new GroqAIService();
module.exports = groqAI;