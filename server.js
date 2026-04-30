const express = require('express');
const cors = require('cors');
const path = require('path');

// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 3000;

const SYSTEM_PROMPT = `You are FounderAI, an assistant for startup founders. Help with investor updates, follow-ups, task management and accelerator applications. Be concise and actionable.`;

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Helper function to call OpenRouter
async function callOpenRouter(prompt) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is missing.');
    }

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
            'X-Title': process.env.OPENROUTER_APP_NAME || 'FounderAI'
        },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1200
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
        throw new Error('No response content returned from OpenRouter.');
    }

    return reply;
}

// ─── Health Check ───
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        aiReady: !!process.env.OPENROUTER_API_KEY,
        apiKeySet: !!process.env.OPENROUTER_API_KEY,
        model: OPENROUTER_MODEL,
        timestamp: new Date().toISOString()
    });
});

// ─── Daily Briefing ───
app.post('/api/daily-briefing', async (req, res) => {
    try {
        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(503).json({
                error: 'AI not ready. OPENROUTER_API_KEY is missing in the environment.'
            });
        }

        const { userName, tasks, leads, deadlines, overdue, taskList } = req.body;
        const now = new Date();
        const hour = now.getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

        const taskContext = taskList && taskList.length > 0
            ? `Active task names: ${taskList.join(', ')}`
            : 'No specific tasks available — invent realistic startup tasks.';

        const prompt = `Generate a personalized morning briefing for a startup founder.

Founder name: ${userName || 'Founder'}
Current time: ${now.toLocaleString()}

Real data from their dashboard:
- Total pending tasks: ${tasks || 0}
- Overdue follow-ups: ${overdue || 0}
- Upcoming deadlines today: ${deadlines || 0}
- Active leads: ${leads || 0}
- ${taskContext}

Generate a briefing in EXACTLY this format:

${greeting} ${userName || 'Founder'}. You have:
- ${overdue || 2} overdue follow-ups
- [Specific upcoming event based on tasks] in [timeframe]
- [Most urgent deadline] due [day]
- $[X,XXX] monthly burn rate

Your #1 priority today: [Pick the most urgent item from the task list above and explain why it's the priority. Be specific.]

Here's a draft email ready to send:

Subject: [relevant subject based on the #1 priority]
Hi [realistic name],
[3-4 sentence professional email body that directly addresses the priority action]
Best,
${userName || 'Founder'}

RULES:
- Use the REAL task names and numbers provided above
- Make it feel personal and specific to THIS founder
- The draft email must be ready to copy-paste and send
- Keep the entire briefing under 250 words`;

        const reply = await callOpenRouter(prompt);
        res.json({ reply });
    } catch (error) {
        console.error('Daily briefing error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── General Chat ───
app.post('/api/chat', async (req, res) => {
    try {
        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(503).json({
                error: 'AI not ready. OPENROUTER_API_KEY is missing in the environment.'
            });
        }

        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const reply = await callOpenRouter(prompt);
        res.json({ reply });
    } catch (error) {
        console.error('Chat error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── Investor Update ───
app.post('/api/investor-update', async (req, res) => {
    try {
        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(503).json({ error: 'AI not ready.' });
        }

        const { details } = req.body;
        const prompt = `Generate a professional monthly investor update email for a startup founder.
Use the following details:
${details || 'MRR: $XX, Growth: XX%, Runway: XX months, Key wins: [list wins], Challenges: [list challenges]'}

Format it as a ready-to-send email with:
- Subject line
- Greeting
- Key Metrics section (MRR, growth, runway)
- Highlights / Wins
- Challenges & how we're addressing them
- Asks / how investors can help
- Sign off`;

        const reply = await callOpenRouter(prompt);
        res.json({ reply });
    } catch (error) {
        console.error('Investor update error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── Follow-up Email ───
app.post('/api/followup-email', async (req, res) => {
    try {
        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(503).json({ error: 'AI not ready.' });
        }

        const { leadName } = req.body;
        const prompt = `Write a professional follow-up email to ${leadName || 'a potential lead/investor'} after an initial meeting.

The email should:
- Reference a recent meeting/call
- Recap key discussion points briefly
- Propose clear next steps
- Be warm but professional
- Be concise (under 150 words)
- Include a subject line`;

        const reply = await callOpenRouter(prompt);
        res.json({ reply });
    } catch (error) {
        console.error('Follow-up email error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── Accelerator Application ───
app.post('/api/accelerator-app', async (req, res) => {
    try {
        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(503).json({ error: 'AI not ready.' });
        }

        const { companyDetails } = req.body;
        const prompt = `Draft answers for a Y Combinator / Techstars-style accelerator application.
Use the following company details:
${companyDetails || 'Company: [Name], Industry: [Industry], Stage: [Stage], Traction: [Traction details]'}

Generate compelling answers for these sections:
1. What does your company do? (1-2 sentences)
2. Why did you pick this idea to work on?
3. What progress have you made?
4. What is the market size?
5. Why now? What has changed?
6. What is your unfair advantage?
7. What is your business model?
8. Who are your competitors and what makes you different?
9. How will you acquire users/customers?

Keep each answer concise, data-driven, and compelling.`;

        const reply = await callOpenRouter(prompt);
        res.json({ reply });
    } catch (error) {
        console.error('Accelerator app error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── Summarize Week ───
app.post('/api/summarize-week', async (req, res) => {
    try {
        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(503).json({ error: 'AI not ready.' });
        }

        const { taskList, userName } = req.body;
        const tasks = taskList && taskList.length > 0
            ? taskList.join('\n- ')
            : 'No tasks found — generate a sample weekly summary for a startup founder.';

        const prompt = `Summarize the week for startup founder ${userName || 'Founder'}.

Their tasks this week:
- ${tasks}

Generate a weekly summary with these sections:
1. 🏆 Wins This Week (completed or progressed items)
2. ⏳ Still Pending (items needing attention)
3. 🎯 Top Priorities for Next Week (3 actionable items)

Be concise. Use bullet points. Keep under 200 words.`;

        const reply = await callOpenRouter(prompt);
        res.json({ reply });
    } catch (error) {
        console.error('Summarize week error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Fallback routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`🔑 OPENROUTER_API_KEY set: ${!!process.env.OPENROUTER_API_KEY}`);
    console.log(`🤖 Model: ${OPENROUTER_MODEL}`);
});
