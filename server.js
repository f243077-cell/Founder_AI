const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const SYSTEM_PROMPT = `You are FounderAI, an assistant for startup founders. Help with investor updates, follow-ups, task management and accelerator applications. Be concise and actionable.`;

app.use(cors());
app.use(express.json());

// Serve static files from 'public' and 'js' directories
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Dynamic import for Gemini SDK (ES Module)
let genAI;
let model;

async function initGemini() {
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: SYSTEM_PROMPT
        });
        console.log("Gemini AI initialized (gemini-2.0-flash)");
    } catch (err) {
        console.error("Error initializing Gemini:", err.message);
    }
}
initGemini();

// Helper: send a prompt to Gemini and return the text
async function callGemini(prompt) {
    if (!model) throw new Error("AI model not initialized");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

// ───────── Daily Briefing ─────────
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

        const reply = await callGemini(prompt);
        res.json({ reply });
    } catch (error) {
        console.error("Daily briefing error:", error.message);
        res.status(500).json({ error: "Failed to generate daily briefing" });
    }
});

// ───────── General Chat ─────────
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        const reply = await callGemini(prompt);
        res.json({ reply });
    } catch (error) {
        console.error("Chat error:", error.message);
        res.status(500).json({ error: "Failed to generate AI response" });
    }
});

// ───────── Generate Investor Update ─────────
app.post('/api/investor-update', async (req, res) => {
    try {
        const { details } = req.body;
        const prompt = `Generate a professional monthly investor update email for a startup founder.
Use the following details:
${details || "MRR: $XX, Growth: XX%, Runway: XX months, Key wins: [list wins], Challenges: [list challenges]"}

Format it as a ready-to-send email with:
- Subject line
- Greeting
- Key Metrics section (MRR, growth, runway)
- Highlights / Wins
- Challenges & how we're addressing them
- Asks / how investors can help
- Sign off`;

        const reply = await callGemini(prompt);
        res.json({ reply });
    } catch (error) {
        console.error("Investor update error:", error.message);
        res.status(500).json({ error: "Failed to generate investor update" });
    }
});

// ───────── Generate Follow-up Email ─────────
app.post('/api/followup-email', async (req, res) => {
    try {
        const { leadName } = req.body;
        const prompt = `Write a professional follow-up email to ${leadName || "a potential lead/investor"} after an initial meeting.

The email should:
- Reference a recent meeting/call
- Recap key discussion points briefly
- Propose clear next steps
- Be warm but professional
- Be concise (under 150 words)
- Include a subject line`;

        const reply = await callGemini(prompt);
        res.json({ reply });
    } catch (error) {
        console.error("Follow-up email error:", error.message);
        res.status(500).json({ error: "Failed to generate follow-up email" });
    }
});

// ───────── Draft Accelerator Application ─────────
app.post('/api/accelerator-app', async (req, res) => {
    try {
        const { companyDetails } = req.body;
        const prompt = `Draft answers for a Y Combinator / Techstars-style accelerator application.
Use the following company details:
${companyDetails || "Company: [Name], Industry: [Industry], Stage: [Stage], Traction: [Traction details]"}

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

        const reply = await callGemini(prompt);
        res.json({ reply });
    } catch (error) {
        console.error("Accelerator app error:", error.message);
        res.status(500).json({ error: "Failed to draft accelerator application" });
    }
});

// ───────── Summarize Week ─────────
app.post('/api/summarize-week', async (req, res) => {
    try {
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

        const reply = await callGemini(prompt);
        res.json({ reply });
    } catch (error) {
        console.error("Summarize week error:", error.message);
        res.status(500).json({ error: "Failed to summarize week" });
    }
});

// Fallback routing
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
