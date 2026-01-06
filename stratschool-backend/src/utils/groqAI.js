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

  buildSystemPrompt(financialData) {
    let prompt = `You are Daddy, an elite AI financial analyst for Indian entrepreneurs. Your responses must be:

## CORE PRINCIPLES:
1. **DATA-DRIVEN ONLY** - Only state facts from the provided data. Never assume or hallucinate numbers.
2. **SURGICAL PRECISION** - Every number you mention must come from the data below.
3. **CONCISE** - 2-4 sentences max. Use bullet points sparingly.
4. **ACTIONABLE** - Give specific, practical advice based on the data.
5. **INDIAN CONTEXT** - Use ₹, reference GST/TDS/Income Tax when relevant.

## CRITICAL RULES:
- If asked about data you don't have, say "I don't have that data in your uploaded statements."
- Never make up numbers, percentages, or amounts.
- Always round to 2 decimal places for percentages.
- Format amounts in Indian style (₹8,11,833.98 not ₹811833.98).
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

  async generateChatResponse(message, conversationHistory = [], financialData = null) {
    try {
      console.log('🚀 Generating Groq AI response');
      console.log('📊 Financial data available:', !!financialData);

      const messages = [];
      
      // Build data-focused system prompt
      messages.push({
        role: 'system',
        content: this.buildSystemPrompt(financialData)
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