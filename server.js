const express = require('express');
const cors = require('cors');
const path = require('path');

// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 3000;

const SYSTEM_PROMPT = `You are FounderAI, an assistant for startup founders. 
Help with investor updates, follow-ups, task management and accelerator applications. 
Be concise and actionable.`;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// ─── OpenRouter AI Function ───
async function callAI(prompt) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    console.log("API Key exists:", !!apiKey);

    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY not set in environment!");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://founderai.up.railway.app",
            "X-Title": "FounderAI"
        },
        body: JSON.stringify({
            model: "meta-llama/llama-3.1-8b-instruct:free",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ]
        })
    });

    const data = await response.json();
    console.log("OpenRouter response status:", response.status);

    if (!response.ok) {
        throw new Error(data.error?.message || "OpenRouter API error");
    }

    return data.choices[0].message.content;
}

// ─── Health Check ───
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        aiReady: !!process.env.OPENROUTER_API_KEY,
        timestamp: new Date().toISOString()
    });
});

// ─── Daily Briefing ───
app.post('/api/daily-briefing', async (req, res) => {
    try {
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

Your #1 priority today: [Pick the most urgent item and explain why. Be specific.]

Here's a draft email ready to send:

Subject: [relevant subject]
Hi [realistic name],
[3-4 sentence professional email body]
Best,
${userName || 'Founder'}

RULES:
- Use the REAL task names and numbers provided
- Keep the entire briefing under 250 words`;

        const reply = await callAI(prompt);
        res.json({ reply });
    } catch (error) {
        console.error("Daily briefing error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── General Chat ───
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }
        const reply = await callAI(prompt);
        res.json({ reply });
    } catch (error) {
        console.error("Chat error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── Investor Update ───
app.post('/api/investor-update', async (req, res) => {
    try {
        const { details } = req.body;
        const prompt = `Generate a professional monthly investor update email.
Details: ${details || "MRR: $XX, Growth: XX%, Runway: XX months"}

Format as ready-to-send email with:
- Subject line
- Key Metrics (MRR, growth, runway)
- Highlights / Wins
- Challenges & solutions
- Asks from investors
- Sign off`;

        const reply = await callAI(prompt);
        res.json({ reply });
    } catch (error) {
        console.error("Investor update error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── Follow-up Email ───
app.post('/api/followup-email', async (req, res) => {
    try {
        const { leadName } = req.body;
        const prompt = `Write a professional follow-up email to ${leadName || "a potential lead"} after an initial meeting.

Requirements:
- Reference recent meeting
- Recap key points briefly
- Propose clear next steps
- Warm but professional tone
- Under 150 words
- Include subject line`;

        const reply = await callAI(prompt);
        res.json({ reply });
    } catch (error) {
        console.error("Follow-up email error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── Accelerator Application ───
app.post('/api/accelerator-app', async (req, res) => {
    try {
        const { companyDetails } = req.body;
        const prompt = `Draft a Y Combinator style accelerator application.
Company details: ${companyDetails || "Company: [Name], Industry: [Industry], Stage: [Stage]"}

Answer these sections concisely:
1. What does your company do?
2. Why this idea?
3. What progress have you made?
4. What is the market size?
5. Why now?
6. Your unfair advantage?
7. Business model?
8. Competitors and differentiation?
9. How will you acquire users?`;

        const reply = await callAI(prompt);
        res.json({ reply });
    } catch (error) {
        console.error("Accelerator app error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── Summarize Week ───
app.post('/api/summarize-week', async (req, res) => {
    try {
        const { taskList, userName } = req.body;
        const tasks = taskList && taskList.length > 0
            ? taskList.join('\n- ')
            : 'No tasks found.';

        const prompt = `Summarize the week for founder ${userName || 'Founder'}.

Tasks this week:
- ${tasks}

Generate summary with:
1. 🏆 Wins This Week
2. ⏳ Still Pending
3. 🎯 Top 3 Priorities for Next Week

Keep under 200 words. Use bullet points.`;

        const reply = await callAI(prompt);
        res.json({ reply });
    } catch (error) {
        console.error("Summarize week error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── Fallback routing ───
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`🔑 OpenRouter Key set: ${!!process.env.OPENROUTER_API_KEY}`);
});