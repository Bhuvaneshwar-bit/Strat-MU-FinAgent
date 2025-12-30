const express = require('express');
const router = express.Router();
const ChatSession = require('../models/ChatSession');
const PLStatement = require('../models/PLStatement');
const auth = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini with Pro model for maximum accuracy
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash',
  generationConfig: {
    temperature: 0.3,
    topP: 0.9,
    maxOutputTokens: 4096
  }
});

/**
 * ELITE FINANCIAL ADVISOR SYSTEM PROMPT
 */
const getFinancialAdvisorPrompt = (userContext) => {
  return `You are an ELITE Financial Advisor AI for Indian entrepreneurs and businesses. You provide SURGICAL PRECISION answers.

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
3. **Be CURRENT** - Use FY 2024-25 tax rates and latest regulations
4. **Be CONTEXTUAL** - Consider user's business data if available
5. **Use NUMBERS** - Always include calculations, percentages, amounts
6. **Cite SECTIONS** - Reference specific tax sections, rules, acts

## RESPONSE FORMAT:
- Start with a **direct answer** (1-2 sentences)
- Follow with **detailed explanation** with bullet points
- Include **specific numbers/calculations** when relevant
- End with **actionable next steps**
- Use ₹ for Indian Rupees

## USER'S FINANCIAL CONTEXT:
${userContext || 'No financial data available yet.'}

## CRITICAL RULES:
- NEVER give generic advice - be specific to Indian context
- ALWAYS mention if user should consult a CA for complex matters
- For tax questions, specify FY and AY
- For compliance, mention deadlines and penalties
- If unsure, say so clearly - don't guess on legal/tax matters`;
};

/**
 * Build user context from their financial data
 */
const buildUserContext = async (userId) => {
  try {
    const plStatement = await PLStatement.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    if (!plStatement) return null;

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
**User's Business Financials:**
- Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}
- Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}
- Net Income: ₹${netIncome.toLocaleString('en-IN')}
- Profit Margin: ${profitMargin}%
`;
  } catch (error) {
    console.error('Error building user context:', error);
    return null;
  }
};

/**
 * Generate chat title
 */
const generateChatTitle = async (message) => {
  try {
    const result = await model.generateContent(`Generate a very short title (3-5 words max) for this financial query. Just return the title, nothing else: "${message}"`);
    return result.response.text().trim().replace(/"/g, '') || 'Financial Query';
  } catch (error) {
    return message.substring(0, 30) + (message.length > 30 ? '...' : '');
  }
};

/**
 * @route   GET /api/financial-advisor/sessions
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

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
});

/**
 * @route   GET /api/financial-advisor/sessions/:id
 */
router.get('/sessions/:id', auth, async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).lean();

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch session' });
  }
});

/**
 * @route   POST /api/financial-advisor/sessions
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
    res.status(500).json({ success: false, message: 'Failed to create session' });
  }
});

/**
 * @route   POST /api/financial-advisor/chat
 */
router.post('/chat', auth, async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Find or create session
    let session;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, userId: req.user.id });
    }

    if (!session) {
      session = new ChatSession({
        userId: req.user.id,
        title: 'New Chat',
        messages: []
      });
    }

    // Add user message
    session.messages.push({ role: 'user', content: message.trim() });

    // Generate title if first message
    if (session.messages.length === 1) {
      session.title = await generateChatTitle(message);
    }

    // Build user context
    const userContext = await buildUserContext(req.user.id);

    // Prepare conversation for Gemini
    const conversationHistory = session.messages.slice(-10).map(m => 
      `${m.role === 'user' ? 'User' : 'Advisor'}: ${m.content}`
    ).join('\n\n');

    const fullPrompt = `${getFinancialAdvisorPrompt(userContext)}

## CONVERSATION:
${conversationHistory}

Respond as the Elite Financial Advisor:`;

    // Call Gemini Pro
    console.log('Calling Gemini Pro for Financial Advisor...');
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const aiResponse = response.text() || 'I apologize, but I could not generate a response. Please try again.';

    // Add AI response
    session.messages.push({ role: 'assistant', content: aiResponse });
    session.lastMessageAt = new Date();
    await session.save();

    res.json({
      success: true,
      response: aiResponse,
      session: { _id: session._id, title: session.title }
    });

  } catch (error) {
    console.error('Financial Advisor Chat Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get response', error: error.message });
  }
});

/**
 * @route   DELETE /api/financial-advisor/sessions/:id
 */
router.delete('/sessions/:id', auth, async (req, res) => {
  try {
    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isArchived: true },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete session' });
  }
});

/**
 * @route   PUT /api/financial-advisor/sessions/:id/title
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
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({ success: true, session: { _id: session._id, title: session.title } });
  } catch (error) {
    console.error('Update title error:', error);
    res.status(500).json({ success: false, message: 'Failed to update title' });
  }
});

module.exports = router;
