// ──────────────────────────────────────────────
//  ai.js — FounderAI API Functions + Chat UI
// ──────────────────────────────────────────────

export async function askAI(message) {
    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.reply;
}

export async function generateInvestorUpdate(details) {
    const res = await fetch('/api/investor-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details })
    });
    const data = await res.json();
    return data.reply;
}

export async function generateFollowUpEmail(leadName) {
    const res = await fetch('/api/followup-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadName })
    });
    const data = await res.json();
    return data.reply;
}

export async function draftAcceleratorApp(companyDetails) {
    const res = await fetch('/api/accelerator-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyDetails })
    });
    const data = await res.json();
    return data.reply;
}

export async function getDailyBriefing(userName, metrics = {}) {
    const res = await fetch('/api/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userName,
            tasks: metrics.tasks || 0,
            leads: metrics.leads || 0,
            deadlines: metrics.deadlines || 0,
            overdue: metrics.overdue || 0,
            taskList: metrics.taskList || []
        })
    });
    const data = await res.json();
    return data.reply;
}

// ──────────────────────────────────────────────
//  Chat Page UI (only runs on chat.html)
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const voiceBtn = document.getElementById('voice-btn');
    const voiceLabel = document.getElementById('voice-label');

    if (!chatInput || !sendBtn || !chatMessages) return;

    const appendMessage = (text, type) => {
        const div = document.createElement('div');
        div.className = `message ${type}-message`;
        div.innerHTML = `<div class="message-content">${text.replace(/\n/g, '<br>')}</div>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const sendMessage = async () => {
        const text = chatInput.value.trim();
        if (!text) return;
        appendMessage(text, 'user');
        chatInput.value = '';
        chatInput.disabled = true;
        sendBtn.disabled = true;
        try {
            appendMessage(await askAI(text), 'ai');
        } catch (err) {
            appendMessage('Error communicating with FounderAI. Check your API key.', 'ai');
        } finally {
            chatInput.disabled = false;
            sendBtn.disabled = false;
            chatInput.focus();
        }
    };

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

    // Pre-fill from URL param
    const pre = new URLSearchParams(window.location.search).get('prompt');
    if (pre) { chatInput.value = pre; setTimeout(sendMessage, 400); }

    // ───────── Voice Input ─────────
    if (voiceBtn) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { voiceBtn.style.opacity = '0.4'; voiceBtn.style.cursor = 'not-allowed'; return; }

        const recognition = new SR();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        let recording = false;

        voiceBtn.addEventListener('click', () => {
            if (recording) { recognition.stop(); return; }
            recognition.start();
            recording = true;
            voiceBtn.classList.add('recording');
            if (voiceLabel) voiceLabel.textContent = 'Listening...';
        });

        recognition.onresult = e => {
            chatInput.value = e.results[0][0].transcript;
            setTimeout(sendMessage, 300);
        };
        recognition.onend = () => {
            recording = false;
            voiceBtn.classList.remove('recording');
            if (voiceLabel) voiceLabel.textContent = '';
        };
        recognition.onerror = e => {
            recording = false;
            voiceBtn.classList.remove('recording');
            if (voiceLabel) voiceLabel.textContent = '';
        };
    }
});
