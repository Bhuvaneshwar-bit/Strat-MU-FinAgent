const axios = require('axios');
const stockMarketAPI = require('./stockMarketAPI');

class GroqAIService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseURL = 'https://api.groq.com/openai/v1/chat/completions';
    
    if (!this.apiKey) {
      throw new Error('Groq API key is required');
    }
    
    console.log('✅ Groq AI service initialized successfully');
  }

  buildSystemPrompt(financialData) {
    let prompt = `You are Daddy, a friendly and chill AI buddy who also happens to be great with finances for Indian entrepreneurs.

## YOUR PERSONALITY:
- You're a FRIEND first, financial advisor second
- Be warm, casual, and conversational - like texting a smart friend
- Use casual language: "Hey!", "That's cool!", "No worries!", "Gotcha!"
- If someone says "hi", "yoo", "hello", "wassup" - just greet them back warmly! Don't jump into finance stuff
- Match the user's energy - if they're casual, be casual back
- Use emojis occasionally 😊💰📈
- You can joke around and be playful

## WHEN TO TALK FINANCE:
- Only dive into financial details when the user ASKS about money, revenue, expenses, taxes, etc.
- If they're just chatting casually, chat back! Be a friend.
- When they DO ask about finance, then be precise with the data.

## FINANCIAL EXPERTISE (use when asked):
- DATA-DRIVEN - Only state facts from the provided data
- PRECISE - Use exact numbers from the data
- INDIAN CONTEXT - Use ₹, reference GST/TDS when relevant
- If you don't have data, say so casually

## EXAMPLES OF GOOD RESPONSES:
- User: "yoo" → "Yoo! What's up? 😊 How's it going today?"
- User: "hello" → "Hey there! 👋 Good to see you! What can I help you with?"
- User: "how are you" → "I'm doing great! Thanks for asking 😄 How about you? Anything on your mind?"
- User: "what's my revenue" → "Let me check... [then give precise data]"
`;

    if (financialData && financialData.summary) {
      const data = financialData;
      const s = data.summary;
      
      prompt += `\n## USER'S ACTUAL FINANCIAL DATA:\n`;
      prompt += `**Period:** ${data.period || 'Current'}\n`;
      prompt += `**Total Revenue:** ₹${s.totalRevenue?.toLocaleString('en-IN') || '0'}\n`;
      prompt += `**Total Expenses:** ₹${s.totalExpenses?.toLocaleString('en-IN') || '0'}\n`;
      prompt += `**Net ${s.isProfit ? 'Profit' : 'Loss'}:** ₹${Math.abs(s.netIncome)?.toLocaleString('en-IN') || '0'}\n`;
      prompt += `**Profit Margin:** ${s.profitMargin}%\n`;
      prompt += `**Total Transactions:** ${s.transactionCount || 'N/A'}\n`;

      // Revenue breakdown
      if (data.revenueBreakdown && data.revenueBreakdown.length > 0) {
        prompt += `\n**REVENUE BY CATEGORY:**\n`;
        data.revenueBreakdown.forEach((r, i) => {
          if (i < 8) { // Top 8 categories
            prompt += `- ${r.category}: ₹${r.amount?.toLocaleString('en-IN')} (${r.percentage}%)\n`;
          }
        });
      }

      // Expense breakdown  
      if (data.expenseBreakdown && data.expenseBreakdown.length > 0) {
        prompt += `\n**EXPENSES BY CATEGORY:**\n`;
        data.expenseBreakdown.forEach((e, i) => {
          if (i < 8) { // Top 8 categories
            prompt += `- ${e.category}: ₹${e.amount?.toLocaleString('en-IN')} (${e.percentage}%)\n`;
          }
        });
      }

      // Key insights
      if (data.insights) {
        prompt += `\n**KEY INSIGHTS:**\n`;
        prompt += `- Highest expense category takes ${data.insights.highestExpenseRatio}% of total expenses\n`;
        prompt += `- Top revenue source contributes ${data.insights.revenueConcentration}% of total revenue\n`;
        prompt += `- ${data.insights.expenseCategories} expense categories, ${data.insights.revenueCategories} revenue categories\n`;
      }

      prompt += `\n## RESPONSE GUIDELINES:
- When asked about revenue: Quote exact figures from REVENUE BY CATEGORY
- When asked about expenses: Quote exact figures from EXPENSES BY CATEGORY  
- When asked about profit/loss: Use the Net Profit/Loss figure
- When asked for advice: Base it on the actual category breakdown
- If user asks about something not in this data: Say "That information isn't in your current statement"
`;
    } else {
      prompt += `\n## NO FINANCIAL DATA AVAILABLE:
The user hasn't uploaded any bank statements yet. 
- Encourage them to upload a bank statement for personalized insights
- You can answer general financial questions about Indian taxes, GST, business structure
- Don't make up any numbers - be clear you need their data first
`;
    }

    return prompt;
  }

  async generateChatResponse(message, conversationHistory = [], financialData = null, stockContext = null) {
    try {
      console.log('🚀 Generating Groq AI response');
      console.log('📊 Financial data available:', !!financialData);
      console.log('📈 Stock data available:', !!stockContext);

      const messages = [];
      
      // Build data-focused system prompt
      let systemPrompt = this.buildSystemPrompt(financialData);
      
      // Add stock market data if available
      if (stockContext) {
        systemPrompt += stockMarketAPI.formatStockContext(stockContext);
        
        // Add investment advice guidelines
        systemPrompt += `
## INVESTMENT ADVICE GUIDELINES:
When user asks about investing in a stock:
1. **Quote the EXACT current price** from the real-time data above
2. **Calculate how many shares** they can buy with their amount
3. **Compare to their financial situation** - can they afford the risk?
4. **Mention the 52-week range** to show if it's near high or low
5. **Give a clear recommendation** based on their P&L data
6. **Warn about risks** - never guarantee returns
7. **Suggest diversification** if they're putting too much in one stock

Example calculation:
- User wants to invest ₹1,00,000 in a stock priced at ₹500
- They can buy: 1,00,000 ÷ 500 = 200 shares
- If their monthly income is ₹50,000, this is 2 months' worth - HIGH RISK

Always use the REAL price data provided, not made-up numbers!
`;
      }
      
      messages.push({
        role: 'system',
        content: systemPrompt
      });

      // Add conversation history (last 6 messages)
      if (conversationHistory && conversationHistory.length > 0) {
        conversationHistory.slice(-6).forEach(msg => {
          const role = msg.role || (msg.type === 'user' ? 'user' : 'assistant');
          const content = msg.content || msg.text;
          messages.push({ role, content });
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
          model: 'llama-3.3-70b-versatile', // Best model for accuracy
          messages: messages,
          max_tokens: 1000,
          temperature: 0.3, // Lower = more precise
          top_p: 0.9,
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

      if (response.data?.choices?.[0]?.message?.content) {
        const aiResponse = response.data.choices[0].message.content.trim();
        console.log('✅ Groq AI response generated');
        return aiResponse;
      } else {
        throw new Error('Invalid response from Groq API');
      }

    } catch (error) {
      console.error('❌ Groq AI error:', error.message);
      
      if (error.response?.status === 401) {
        return "Authentication issue with AI service. Please contact support.";
      } else if (error.response?.status === 429) {
        return "I'm experiencing high demand. Please try again in a moment.";
      }
      
      return "I'm having trouble processing your request. Please try again.";
    }
  }
}

const groqAI = new GroqAIService();
module.exports = groqAI;