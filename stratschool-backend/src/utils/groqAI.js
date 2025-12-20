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
      let systemMessage = `You are a helpful AI financial advisor for StratSchool, a financial analysis platform for Indian businesses. You help users understand their P&L statements, analyze uploaded financial data, and provide actionable business insights. Be friendly, professional, and give specific, data-driven recommendations. IMPORTANT: All amounts are in Indian Rupees (INR/₹). Always display currency as ₹ (Rupees), never use $ (dollars).`;
      
      if (plData) {
        systemMessage += `\n\n=== CURRENT FINANCIAL DATA CONTEXT ===`;
        
        // Basic P&L Information
        if (plData.totalRevenue || plData.totalExpenses) {
          systemMessage += `\n\n📊 P&L Summary:
- Total Revenue: ₹${plData.totalRevenue?.toLocaleString('en-IN') || 'N/A'}
- Total Expenses: ₹${plData.totalExpenses?.toLocaleString('en-IN') || 'N/A'}  
- Net Income: ₹${plData.netIncome?.toLocaleString('en-IN') || 'N/A'}
- Profit Margin: ${plData.profitMargin || 'N/A'}%
- Period: ${plData.period || 'Current Period'}
- Transaction Count: ${plData.transactionCount || 'N/A'}`;
        }

        // Revenue Breakdown
        if (plData.revenueBreakdown && plData.revenueBreakdown.length > 0) {
          systemMessage += `\n\n💰 Revenue Categories:`;
          plData.revenueBreakdown.forEach(rev => {
            systemMessage += `\n- ${rev.category}: ₹${rev.amount?.toLocaleString('en-IN')} (${rev.transactionCount} transactions)`;
            if (rev.sampleTransactions && rev.sampleTransactions.length > 0) {
              systemMessage += `\n  Sample: ${rev.sampleTransactions.map(t => t.description || t.particulars || 'Transaction').join(', ')}`;
            }
          });
        }

        // Expense Breakdown  
        if (plData.expenseBreakdown && plData.expenseBreakdown.length > 0) {
          systemMessage += `\n\n💸 Expense Categories:`;
          plData.expenseBreakdown.forEach(exp => {
            systemMessage += `\n- ${exp.category}: ₹${exp.amount?.toLocaleString('en-IN')} (${exp.transactionCount} transactions)`;
            if (exp.sampleTransactions && exp.sampleTransactions.length > 0) {
              systemMessage += `\n  Sample: ${exp.sampleTransactions.map(t => t.description || t.particulars || 'Transaction').join(', ')}`;
            }
          });
        }

        // Uploaded File Context
        if (plData.uploadedFile) {
          systemMessage += `\n\n📄 Data Source:
- File: ${plData.uploadedFile.fileName}
- Upload Date: ${new Date(plData.uploadedFile.uploadDate).toLocaleDateString()}
- Transactions Processed: ${plData.uploadedFile.transactionCount}`;
        }

        systemMessage += `\n\n=== END CONTEXT ===
        
Use this detailed financial data to provide specific, actionable insights. Reference actual numbers, categories, and transactions when giving advice. Help the user understand trends, identify opportunities, and make informed business decisions.`;
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