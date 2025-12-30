const express = require('express');
const router = express.Router();
const ChatSession = require('../models/ChatSession');
const PLStatement = require('../models/PLStatement');
const auth = require('../middleware/auth');
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * ELITE FINANCIAL ADVISOR SYSTEM PROMPT
 * Designed for surgical precision in financial guidance
 */
const getFinancialAdvisorPrompt = (userContext) => {
  return `You are an ELITE Financial Advisor AI for Indian entrepreneurs and businesses. You provide SURGICAL PRECISION answers that are:

## YOUR EXPERTISE:
- Indian Tax Laws (Income Tax, GST, TDS, Advance Tax)
- Business Structuring (Sole Prop, LLP, Pvt Ltd, OPC)
- Startup Funding (Angel, VC, Grants, Govt Schemes)
- Financial Planning & Cash Flow Management
- Investment Strategies for Business Owners
- Regulatory Compliance (RoC, MCA, FEMA)
- Banking & Credit (Business Loans, CC, OD)

## YOUR RESPONSE STYLE:
1. **Be PRECISE** - No fluff, every word matters
2. **Be ACTIONABLE** - Give specific steps, not vague advice
3. **Be CURRENT** - Use 2024-25 tax rates and latest regulations
4. **Be CONTEXTUAL** - Consider user's business data if available
5. **Use NUMBERS** - Always include calculations, percentages, amounts
6. **Cite SECTIONS** - Reference specific tax sections, rules, acts

## RESPONSE FORMAT:
- Start with a **direct answer** (1-2 sentences)
- Follow with **detailed explanation** with bullet points
- Include **specific numbers/calculations** when relevant
- End with **actionable next steps**
- Add **⚠️ Important** callouts for critical info
- Use ₹ for Indian Rupees

## USER'S FINANCIAL CONTEXT:
${userContext || 'No financial data available yet. Ask user for details if needed.'}

## CRITICAL RULES:
- NEVER give generic advice - be specific to Indian context
- ALWAYS mention if user should consult a CA for complex matters
- For tax questions, specify FY and AY
- For compliance, mention deadlines and penalties
- If unsure, say so clearly - don't guess on legal/tax matters

You are NOT a general chatbot. You are an EXPERT financial advisor. Every response should demonstrate deep expertise.`;
};

/**
 * Build user context from their financial data
 */
const buildUserContext = async (userId) => {
  try {
    const plStatement = await PLStatement.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    if (!plStatement) {
      return null;
    }

    const totalRevenue = 
      plStatement.analysis?.totalRevenue ||
      plStatement.profitLossStatement?.revenue?.totalRevenue ||
      plStatement.analysisMetrics?.totalRevenue || 0;

    const totalExpenses = 
      plStatement.analysis?.totalExpenses ||
      plStatement.profitLossStatement?.expenses?.totalExpenses ||
      plStatement.analysisMetrics?.totalExpenses || 0;

    const netIncome = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : 0;

    return `
**User's Business Financials (Latest Statement):**
- Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}
- Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}
- Net Income: ₹${netIncome.toLocaleString('en-IN')}
- Profit Margin: ${profitMargin}%
- Statement Period: ${plStatement.period || 'Monthly'}
- Last Updated: ${plStatement.createdAt ? new Date(plStatement.createdAt).toLocaleDateString('en-IN') : 'N/A'}
`;
  } catch (error) {
    console.error('Error building user context:', error);
    return null;
  }
};

/**
 * Generate chat title using AI
 */
const generateChatTitle = async (message) => {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'Generate a very short title (3-5 words max) for this financial query. Just return the title, nothing else.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 20,
      temperature: 0.3
    });
    return response.choices[0]?.message?.content?.trim() || 'Financial Query';
  } catch (error) {
    // Fallback: use first few words
    return message.substring(0, 30) + (message.length > 30 ? '...' : '');
  }
};

/**
 * @route   GET /api/financial-advisor/sessions
 * @desc    Get all chat sessions for user
 * @access  Private
 */
router.get('/sessions', auth, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ 
      userId: req.user.id,
      isArchived: false 
    })
    .select('_id title category lastMessageAt createdAt')
    .sort({ lastMessageAt: -1 })
    .limit(50)
    .lean();

    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions'
    });
  }
});

/**
 * @route   GET /api/financial-advisor/sessions/:id
 * @desc    Get a specific chat session with messages
 * @access  Private
 */
router.get('/sessions/:id', auth, async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session'
    });
  }
});

/**
 * @route   POST /api/financial-advisor/sessions
 * @desc    Create a new chat session
 * @access  Private
 */
router.post('/sessions', auth, async (req, res) => {
  try {
    const session = new ChatSession({
      userId: req.user.id,
      title: 'New Chat',
      messages: [],
      category: req.body.category || 'general'
    });

    await session.save();

    res.json({
      success: true,
      session: {
        _id: session._id,
        title: session.title,
        category: session.category,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create session'
    });
  }
});

/**
 * @route   POST /api/financial-advisor/chat
 * @desc    Send message and get AI response
 * @access  Private
 */
router.post('/chat', auth, async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Find or create session
    let session;
    if (sessionId) {
      session = await ChatSession.findOne({
        _id: sessionId,
        userId: req.user.id
      });
    }

    if (!session) {
      session = new ChatSession({
        userId: req.user.id,
        title: 'New Chat',
        messages: []
      });
    }

    // Add user message
    session.messages.push({
      role: 'user',
      content: message.trim()
    });

    // Generate title if first message
    if (session.messages.length === 1) {
      session.title = await generateChatTitle(message);
    }

    // Build user context from their financial data
    const userContext = await buildUserContext(req.user.id);

    // Prepare conversation history (last 10 messages for context)
    const conversationHistory = session.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    // Call Groq with elite financial advisor prompt
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // Best model for accuracy
      messages: [
        {
          role: 'system',
          content: getFinancialAdvisorPrompt(userContext)
        },
        ...conversationHistory
      ],
      max_tokens: 2000,
      temperature: 0.2, // Low temperature for precision
      top_p: 0.9
    });

    const aiResponse = response.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    // Add AI response to session
    session.messages.push({
      role: 'assistant',
      content: aiResponse
    });

    session.lastMessageAt = new Date();
    await session.save();

    res.json({
      success: true,
      response: aiResponse,
      session: {
        _id: session._id,
        title: session.title
      }
    });

  } catch (error) {
    console.error('Financial Advisor Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get response',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/financial-advisor/sessions/:id
 * @desc    Delete (archive) a chat session
 * @access  Private
 */
router.delete('/sessions/:id', auth, async (req, res) => {
  try {
    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isArchived: true },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session deleted'
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session'
    });
  }
});

/**
 * @route   PUT /api/financial-advisor/sessions/:id/title
 * @desc    Update session title
 * @access  Private
 */
router.put('/sessions/:id/title', auth, async (req, res) => {
  try {
    const { title } = req.body;

    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: {
        _id: session._id,
        title: session.title
      }
    });
  } catch (error) {
    console.error('Update title error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update title'
    });
  }
});

module.exports = router;
