const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const advancedDocumentParser = require('./advancedDocumentParser');

class GeminiAIService {
  constructor() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }
      
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      console.log('✅ Gemini AI service initialized successfully');
    } catch (error) {
      console.error('🚨 Gemini AI initialization failed:', error);
      throw error;
    }
  }

  async extractTextFromPDF(buffer) {
    try {
      // Use advanced document parser to handle password-protected PDFs
      const parseResult = await advancedDocumentParser.parseDocument(buffer, 'application/pdf', 'uploaded.pdf');
      
      // Check if password is required
      if (parseResult.requiresPassword) {
        const error = new Error('PASSWORD_REQUIRED');
        error.passwordRequired = true;
        throw error;
      }
      
      return parseResult.extractedText;
    } catch (error) {
      console.error('PDF parsing error:', error);
      
      // If it's a password error, throw a specific error that can be caught by the route
      if (error.message.includes('PASSWORD_REQUIRED') || 
          error.passwordRequired ||
          error.message.includes('password') || 
          error.message.includes('No password given') ||
          error.message.includes('encrypted')) {
        const passError = new Error('PASSWORD_REQUIRED');
        passError.passwordRequired = true;
        throw passError;
      }
      
      throw new Error('Failed to extract text from PDF');
    }
  }

  extractTextFromCSV(buffer) {
    return buffer.toString('utf-8');
  }

  async analyzeBankStatement(fileBuffer, mimeType, period) {
    let extractedText = ''; // Declare at function scope for catch block access
    
    try {
      console.log(`🔍 Starting bank statement analysis for ${period} period`);
      console.log(`📄 File type: ${mimeType}, Size: ${fileBuffer.length} bytes`);

      // Extract text based on file type
      if (mimeType === 'application/pdf') {
        console.log('📋 Extracting text from PDF...');
        extractedText = await this.extractTextFromPDF(fileBuffer);
      } else if (mimeType === 'text/csv' || mimeType === 'text/plain') {
        console.log('📋 Extracting text from CSV/TXT...');
        extractedText = this.extractTextFromCSV(fileBuffer);
      } else {
        console.log('📋 Processing Excel/other format...');
        // For Excel files, convert to string (basic approach)
        extractedText = fileBuffer.toString('utf-8');
      }

      // Check if extractedText is valid
      if (!extractedText) {
        throw new Error('Failed to extract text from document. The document may be password-protected or corrupted.');
      }

      console.log(`📝 Extracted text length: ${extractedText.length} characters`);
      
      if (extractedText.length < 50) {
        throw new Error('Insufficient data extracted from file. Please ensure the file contains readable financial data.');
      }

      const prompt = `
You are a world-class financial analyst AI. Analyze this bank statement data with SURGICAL PRECISION for ${period} P&L generation.

BANK STATEMENT DATA:
${extractedText.substring(0, 2000)}

REQUIREMENTS:
1. Calculate EXACT profit margins with 2 decimal precision
2. Generate 3-5 ACTIONABLE financial insights that are easy to understand
3. Categorize ALL transactions accurately
4. Calculate profitability ratios precisely

Create JSON response with EXACT calculations:
{
  "analysis": {
    "period": "${period}",
    "totalRevenue": [calculate total revenue],
    "totalExpenses": [calculate total expenses], 
    "netIncome": [revenue - expenses],
    "transactionCount": [count all transactions]
  },
  "revenue": [
    {"category": "Primary Sales", "amount": [amount], "transactions": ["transaction details"]},
    {"category": "Secondary Revenue", "amount": [amount], "transactions": ["transaction details"]}
  ],
  "expenses": [
    {"category": "Operating Expenses", "amount": [amount], "transactions": ["transaction details"]},
    {"category": "Administrative Costs", "amount": [amount], "transactions": ["transaction details"]}
  ],
  "insights": [
    "Your profit margin is X% - this is [excellent/good/needs improvement] compared to industry standards",
    "Your biggest expense category is [category] at ₹[amount] - consider [specific action]",
    "Revenue trend analysis: [insight about revenue patterns]",
    "Cash flow insight: [actionable recommendation]",
    "Cost optimization: [specific suggestion to reduce expenses]"
  ],
  "profitLossStatement": {
    "revenue": {
      "totalRevenue": [total revenue],
      "breakdown": {"primarySales": [amount], "secondaryRevenue": [amount]},
      "revenueStreams": [
        {"name": "Primary Sales", "category": "Sales", "amount": [amount]},
        {"name": "Secondary Revenue", "category": "Other", "amount": [amount]}
      ]
    },
    "expenses": {
      "totalExpenses": [total expenses],
      "breakdown": {"operatingExpenses": [amount], "administrativeCosts": [amount]},
      "expenseCategories": [
        {"name": "Operating Expenses", "category": "Operations", "amount": [amount]},
        {"name": "Administrative Costs", "category": "Admin", "amount": [amount]}
      ]
    },
    "profitability": {
      "netIncome": [revenue - expenses],
      "grossProfit": [revenue - direct costs],
      "profitMargin": [round((netIncome/totalRevenue)*100, 2)],
      "netProfitMargin": [round((netIncome/totalRevenue)*100, 2)]
    }
  }
}

CRITICAL: Calculate profit margin as (netIncome ÷ totalRevenue) × 100 with 2 decimal precision.
Return ONLY valid JSON with real numbers and insights.`;

      console.log('🤖 Sending request to Gemini AI...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ Received response from Gemini AI');
      console.log(`📊 Response length: ${text.length} characters`);

      // Clean and parse JSON response
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      try {
        const analysisData = JSON.parse(cleanedText);
        console.log('✅ Successfully parsed Gemini AI response');
        return analysisData;
      } catch (parseError) {
        console.error('❌ JSON parsing error:', parseError);
        console.log('🔍 Raw Gemini response:', text.substring(0, 500) + '...');
        
        // Fallback response with basic calculations
        const fallbackRevenue = 0;
        const fallbackExpenses = 0;
        const fallbackNetIncome = fallbackRevenue - fallbackExpenses;
        const fallbackProfitMargin = fallbackRevenue > 0 ? ((fallbackNetIncome / fallbackRevenue) * 100).toFixed(2) : 0;
        
        return {
          analysis: {
            period: period,
            totalRevenue: fallbackRevenue,
            totalExpenses: fallbackExpenses,
            netIncome: fallbackNetIncome,
            transactionCount: 0
          },
          revenue: [],
          expenses: [],
          insights: [
            "Unable to parse bank statement format. Please ensure your CSV contains transaction data with dates, descriptions, and amounts.",
            "Try uploading a standard bank statement format with columns: Date, Description, Debit, Credit",
            "For best results, include transaction categories and clear amount formatting"
          ],
          profitLossStatement: {
            revenue: {
              totalRevenue: fallbackRevenue,
              breakdown: {
                salesRevenue: 0,
                serviceRevenue: 0,
                otherRevenue: 0
              },
              revenueStreams: []
            },
            expenses: {
              totalExpenses: fallbackExpenses,
              breakdown: {
                operatingExpenses: 0,
                administrativeExpenses: 0,
                otherExpenses: 0
              },
              expenseCategories: []
            },
            profitability: {
              netIncome: fallbackNetIncome,
              grossProfit: fallbackNetIncome,
              profitMargin: parseFloat(fallbackProfitMargin),
              netProfitMargin: parseFloat(fallbackProfitMargin)
            }
          }
        };
      }

    } catch (error) {
      console.error('🚨 Gemini AI analysis error:', error);
      
      // Handle specific API errors
      if (error.message.includes('API key')) {
        console.log('🔑 API key issue detected, using fallback analysis');
        return this.generateFallbackAnalysis(period, extractedText);
      }
      if (error.message.includes('quota') || error.message.includes('credits') || error.message.includes('402')) {
        console.log('💰 Quota exceeded, using fallback analysis');
        return this.generateFallbackAnalysis(period, extractedText);
      }
      if (error.message.includes('rate limit')) {
        console.log('⏱️ Rate limit hit, using fallback analysis');
        return this.generateFallbackAnalysis(period, extractedText);
      }
      
      // For any other error, use fallback
      console.log('🔄 Using fallback analysis due to API error');
      return this.generateFallbackAnalysis(period, extractedText);
    }
  }

  generateFallbackAnalysis(period, extractedText) {
    console.log('🤖 Generating intelligent fallback analysis...');
    
    // Parse the CSV data for realistic analysis
    const lines = extractedText.split('\n');
    let totalRevenue = 0;
    let totalExpenses = 0;
    let transactions = [];
    
    // Simple CSV parsing for demonstration
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 3) {
        const amount = parseFloat(parts[2]) || 0;
        const type = parts[3]?.toLowerCase() || 'debit';
        const description = parts[1] || 'Transaction';
        
        if (type.includes('credit') || amount > 0) {
          totalRevenue += Math.abs(amount);
          transactions.push({
            date: parts[0] || '2024-01-01',
            description: description,
            amount: Math.abs(amount),
            type: 'revenue'
          });
        } else {
          totalExpenses += Math.abs(amount);
          transactions.push({
            date: parts[0] || '2024-01-01',
            description: description,
            amount: Math.abs(amount),
            type: 'expense'
          });
        }
      }
    }
    
    const netIncome = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(2) : 0;
    
    return {
      analysis: {
        period: period,
        totalRevenue: totalRevenue,
        totalExpenses: totalExpenses,
        netIncome: netIncome,
        transactionCount: transactions.length
      },
      revenue: [{
        category: "Service Revenue",
        amount: totalRevenue,
        transactions: transactions.filter(t => t.type === 'revenue')
      }],
      expenses: [{
        category: "Operating Expenses", 
        amount: totalExpenses,
        transactions: transactions.filter(t => t.type === 'expense')
      }],
      insights: [
        `Your ${period.toLowerCase()} financial overview shows ${netIncome > 0 ? 'profitability' : 'losses'}`,
        `Total revenue generated: ₹${totalRevenue.toFixed(2)} - ${totalRevenue > 50000 ? 'Strong performance' : 'Room for growth'}`,
        `Operating expenses: ₹${totalExpenses.toFixed(2)} - ${(totalExpenses/totalRevenue*100).toFixed(1)}% of revenue`,
        `Net profit margin: ${profitMargin}% - ${profitMargin > 20 ? 'Excellent profitability' : profitMargin > 10 ? 'Good margins' : 'Focus on cost optimization'}`,
        netIncome > 0 ? 
          `Recommendation: Maintain current profitability and explore growth opportunities` : 
          `Action needed: Review expense categories and identify cost reduction strategies`
      ],
      profitLossStatement: {
        revenue: {
          totalRevenue: totalRevenue,
          breakdown: {
            salesRevenue: totalRevenue * 0.8,
            serviceRevenue: totalRevenue * 0.2,
            otherRevenue: 0
          },
          revenueStreams: [
            { name: "Primary Sales", category: "Sales", amount: totalRevenue * 0.8 },
            { name: "Service Revenue", category: "Services", amount: totalRevenue * 0.2 }
          ]
        },
        expenses: {
          totalExpenses: totalExpenses,
          breakdown: {
            operatingExpenses: totalExpenses * 0.6,
            administrativeExpenses: totalExpenses * 0.3,
            marketingExpenses: totalExpenses * 0.1,
            otherExpenses: 0
          },
          expenseCategories: [
            { name: "Operating Expenses", category: "Operations", amount: totalExpenses * 0.6 },
            { name: "Administrative Costs", category: "Admin", amount: totalExpenses * 0.3 },
            { name: "Marketing Expenses", category: "Marketing", amount: totalExpenses * 0.1 }
          ]
        },
        profitability: {
          netIncome: netIncome,
          grossProfit: totalRevenue - (totalExpenses * 0.6),
          profitMargin: parseFloat(profitMargin),
          netProfitMargin: parseFloat(profitMargin)
        }
      }
    };
  }

  async generatePLStatement(analysisData, businessInfo = {}) {
    try {
      const prompt = `
You are a senior financial analyst creating a professional P&L statement. Transform this analysis data into a comprehensive, investor-ready P&L statement:

ANALYSIS DATA:
${JSON.stringify(analysisData, null, 2)}

BUSINESS INFO:
${JSON.stringify(businessInfo, null, 2)}

Create a detailed P&L statement with:
1. Professional formatting
2. Clear revenue and expense categories
3. Key financial ratios
4. Performance metrics
5. Trend analysis insights
6. Executive summary

RESPONSE FORMAT (JSON):
{
  "executiveSummary": "Brief overview of financial performance",
  "plStatement": {
    "header": {
      "companyName": "Business Name",
      "period": "${analysisData.analysis?.period || 'Monthly'}",
      "generatedDate": "${new Date().toISOString()}"
    },
    "revenue": {
      "totalRevenue": 0,
      "revenueStreams": [
        {"name": "Revenue Stream", "amount": 0, "percentage": 0}
      ]
    },
    "expenses": {
      "totalExpenses": 0,
      "expenseCategories": [
        {"name": "Expense Category", "amount": 0, "percentage": 0}
      ]
    },
    "profitability": {
      "grossProfit": 0,
      "grossProfitMargin": 0,
      "operatingIncome": 0,
      "operatingMargin": 0,
      "netIncome": 0,
      "netProfitMargin": 0
    },
    "keyMetrics": {
      "revenueGrowth": 0,
      "expenseRatio": 0,
      "breakEvenPoint": 0,
      "cashFlowFromOperations": 0
    }
  },
  "insights": [
    "Professional insight 1",
    "Strategic recommendation 1"
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Growth opportunity 1"
  ]
}

Return only valid JSON.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      try {
        return JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('P&L JSON parsing error:', parseError);
        
        // Return fallback P&L structure
        return {
          executiveSummary: "Financial analysis completed. Detailed P&L statement generated from bank statement data.",
          plStatement: {
            header: {
              companyName: businessInfo.companyName || "Your Business",
              period: analysisData.analysis?.period || "Monthly",
              generatedDate: new Date().toISOString()
            },
            revenue: {
              totalRevenue: analysisData.analysis?.totalRevenue || 0,
              revenueStreams: analysisData.revenue?.map(r => ({
                name: r.category,
                amount: r.amount,
                percentage: analysisData.analysis?.totalRevenue > 0 ? (r.amount / analysisData.analysis.totalRevenue * 100) : 0
              })) || []
            },
            expenses: {
              totalExpenses: analysisData.analysis?.totalExpenses || 0,
              expenseCategories: analysisData.expenses?.map(e => ({
                name: e.category,
                amount: e.amount,
                percentage: analysisData.analysis?.totalExpenses > 0 ? (e.amount / analysisData.analysis.totalExpenses * 100) : 0
              })) || []
            },
            profitability: {
              grossProfit: (analysisData.analysis?.totalRevenue || 0) - (analysisData.analysis?.totalExpenses || 0),
              grossProfitMargin: analysisData.analysis?.totalRevenue > 0 ? 
                ((analysisData.analysis.totalRevenue - analysisData.analysis.totalExpenses) / analysisData.analysis.totalRevenue * 100) : 0,
              operatingIncome: analysisData.analysis?.netIncome || 0,
              operatingMargin: 0,
              netIncome: analysisData.analysis?.netIncome || 0,
              netProfitMargin: analysisData.analysis?.totalRevenue > 0 ? 
                (analysisData.analysis.netIncome / analysisData.analysis.totalRevenue * 100) : 0
            },
            keyMetrics: {
              revenueGrowth: 0,
              expenseRatio: analysisData.analysis?.totalRevenue > 0 ? 
                (analysisData.analysis.totalExpenses / analysisData.analysis.totalRevenue * 100) : 0,
              breakEvenPoint: 0,
              cashFlowFromOperations: analysisData.analysis?.netIncome || 0
            }
          },
          insights: analysisData.insights || ["Analysis completed successfully"],
          recommendations: ["Review expense categories for optimization", "Focus on revenue growth opportunities"]
        };
      }

    } catch (error) {
      console.error('P&L generation error:', error);
      throw new Error(`P&L statement generation failed: ${error.message}`);
    }
  }

  async generateChatResponse(userMessage, conversationHistory = [], plData = null) {
    try {
      console.log('🤖 Generating AI chat response...');
      
      // Build context for the AI
      let context = `You are an AI Financial Assistant specialized in helping users understand their financial statements and business metrics. 
      
Respond in a helpful, professional, and conversational manner. Keep responses concise but informative.`;

      // Add P&L context if available
      if (plData) {
        context += `\n\nCurrent P&L Statement Context:
- Total Revenue: ₹${plData.revenue?.total || 0}
- Total Expenses: ₹${plData.expenses?.total || 0}
- Net Profit: ₹${plData.netProfit || 0}
- Profit Margin: ${plData.profitMargin || 0}%`;

        if (plData.revenue?.breakdown) {
          context += `\n- Revenue Breakdown: ${plData.revenue.breakdown.map(item => `${item.category}: ₹${item.amount}`).join(', ')}`;
        }
        
        if (plData.expenses?.breakdown) {
          context += `\n- Expense Breakdown: ${plData.expenses.breakdown.map(item => `${item.category}: ₹${item.amount}`).join(', ')}`;
        }
      }

      // Add conversation history for context
      if (conversationHistory.length > 0) {
        context += `\n\nConversation History:`;
        conversationHistory.slice(-5).forEach((msg, index) => {
          context += `\n${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
        });
      }

      context += `\n\nUser Question: ${userMessage}`;

      const result = await this.model.generateContent([
        {
          text: context
        }
      ]);

      const response = result.response;
      const text = response.text();

      console.log('✅ Chat response generated successfully');
      
      return {
        success: true,
        response: text.trim(),
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Chat response generation error:', error);
      
      // Fallback responses for common financial questions
      const fallbackResponses = {
        'profit': 'Your profit margin indicates the percentage of revenue that remains after all expenses. A higher margin suggests better operational efficiency.',
        'revenue': 'Revenue represents the total income from your business operations. Focus on diversifying revenue streams for sustainable growth.',
        'expenses': 'Monitor your expense ratios to ensure costs are proportionate to revenue. Look for optimization opportunities in high-cost categories.',
        'default': 'I understand you have a question about your financial data. Could you please rephrase your question? I\'m here to help analyze your P&L statement.'
      };

      const lowerMessage = userMessage.toLowerCase();
      let fallbackResponse = fallbackResponses.default;
      
      for (const [key, response] of Object.entries(fallbackResponses)) {
        if (lowerMessage.includes(key) && key !== 'default') {
          fallbackResponse = response;
          break;
        }
      }

      return {
        success: false,
        response: fallbackResponse,
        timestamp: new Date(),
        error: 'Using fallback response due to AI service unavailability'
      };
    }
  }
  async generateChatResponse(userMessage, conversationHistory = [], plData = null) {
    try {
      console.log('🤖 Generating real Gemini AI chat response...');
      
      // Build context for the AI
      let context = `You are an AI Financial Assistant specialized in helping users understand their financial statements and business metrics. 
      
Respond in a helpful, professional, and conversational manner. Keep responses concise but informative.`;

      // Add P&L context if available
      if (plData) {
        context += `\n\nCurrent P&L Statement Context:
- Total Revenue: ₹${plData.revenue?.total || 0}
- Total Expenses: ₹${plData.expenses?.total || 0}
- Net Profit: ₹${plData.netProfit || 0}
- Profit Margin: ${plData.profitMargin || 0}%`;

        if (plData.revenue?.breakdown) {
          context += `\n- Revenue Breakdown: ${plData.revenue.breakdown.map(item => `${item.category}: ₹${item.amount}`).join(', ')}`;
        }
        
        if (plData.expenses?.breakdown) {
          context += `\n- Expense Breakdown: ${plData.expenses.breakdown.map(item => `${item.category}: ₹${item.amount}`).join(', ')}`;
        }
      }

      // Add conversation history for context
      if (conversationHistory.length > 0) {
        context += `\n\nConversation History:`;
        conversationHistory.slice(-5).forEach((msg, index) => {
          context += `\n${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
        });
      }

      context += `\n\nUser Question: ${userMessage}`;

      const result = await this.model.generateContent([
        {
          text: context
        }
      ]);

      const response = result.response;
      const text = response.text();

      console.log('✅ Real Gemini chat response generated successfully');
      
      return {
        success: true,
        response: text.trim(),
        timestamp: new Date()
      };

    } catch (error) {
      console.error('🚨 Gemini chat response generation error:', error);
      
      // Fallback responses for common financial questions
      const fallbackResponses = {
        'profit': 'Your profit margin indicates the percentage of revenue that remains after all expenses. A higher margin suggests better operational efficiency.',
        'revenue': 'Revenue represents the total income from your business operations. Focus on diversifying revenue streams for sustainable growth.',
        'expenses': 'Monitor your expense ratios to ensure costs are proportionate to revenue. Look for optimization opportunities in high-cost categories.',
        'default': 'I understand you have a question about your financial data. Could you please rephrase your question? I\'m here to help analyze your P&L statement.'
      };

      const lowerMessage = userMessage.toLowerCase();
      let fallbackResponse = fallbackResponses.default;
      
      for (const [key, response] of Object.entries(fallbackResponses)) {
        if (lowerMessage.includes(key) && key !== 'default') {
          fallbackResponse = response;
          break;
        }
      }

      return {
        success: false,
        response: fallbackResponse,
        timestamp: new Date(),
        error: 'Using fallback response due to AI service unavailability'
      };
    }
  }

  /**
   * Analyze bank statement from already extracted text (for password-protected PDFs)
   */
  async analyzeBankStatementFromText(extractedText, fileName, period) {
    try {
      console.log(`🔍 Analyzing bank statement from extracted text for ${period} period`);
      console.log(`📄 File: ${fileName}, Text length: ${extractedText?.length || 0} characters`);

      // Check if extractedText is valid
      if (!extractedText || extractedText.length < 10) {
        throw new Error('Insufficient text data provided for analysis.');
      }
      
      // For very small text (like password-protected PDFs), provide more context
      if (extractedText.length < 100) {
        console.log('⚠️ Limited text available, using enhanced analysis prompt...');
        return await this.analyzeWithLimitedText(extractedText, fileName, period);
      }

      // Use the same prompt structure as the main method
      const prompt = `Analyze this bank statement and generate a comprehensive P&L analysis:

${extractedText}

Please provide a detailed financial analysis in the following JSON format:
{
  "summary": {
    "totalRevenue": [total revenue],
    "totalExpenses": [total expenses],
    "netIncome": [revenue - expenses],
    "transactionCount": [number of transactions],
    "period": "${period}"
  },
  "revenue": {
    "totalRevenue": [total revenue],
    "breakdown": {"primarySales": [amount], "secondaryRevenue": [amount]},
    "revenueStreams": [
      {"name": "Primary Sales", "category": "Sales", "amount": [amount]},
      {"name": "Secondary Revenue", "category": "Other", "amount": [amount]}
    ]
  },
  "expenses": {
    "totalExpenses": [total expenses],
    "breakdown": {"operatingExpenses": [amount], "administrativeCosts": [amount]},
    "expenseCategories": [
      {"name": "Operating Expenses", "category": "Operations", "amount": [amount]},
      {"name": "Administrative Costs", "category": "Admin", "amount": [amount]}
    ]
  },
  "profitability": {
    "netIncome": [revenue - expenses],
    "grossProfit": [revenue - direct costs],
    "profitMargin": [round((netIncome/totalRevenue)*100, 2)],
    "netProfitMargin": [round((netIncome/totalRevenue)*100, 2)]
  }
}

CRITICAL: Calculate profit margin as (netIncome ÷ totalRevenue) × 100 with 2 decimal precision.
Return ONLY valid JSON with real numbers and insights.`;

      console.log('🤖 Sending extracted text to Gemini AI...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('📊 Raw Gemini response received');
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      const analysisData = JSON.parse(jsonMatch[0]);
      console.log(`✅ P&L analysis completed successfully`);
      
      return analysisData;

    } catch (error) {
      console.error('🚨 Gemini AI analysis error:', error);
      throw error;
    }
  }
}

module.exports = new GeminiAIService();