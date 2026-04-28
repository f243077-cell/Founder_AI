import { auth, db, isDemoMode, signOut, onAuthStateChanged, collection, getDocs, addDoc } from './firebase.js';
import { askGemini, generateInvestorUpdate, generateFollowUpEmail, draftAcceleratorApp, getDailyBriefing } from './gemini.js';

// ═══════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════

function getTimeGreeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function showToast(message, type = 'info') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: '✅', info: 'ℹ️', warning: '⚠️' };
    t.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3200);
}

function showResult(el, text) {
    el.innerHTML = `<button class="copy-btn">Copy</button>${text.replace(/\n/g, '<br>')}`;
    el.classList.add('visible');
    el.querySelector('.copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(text).then(() => {
            const btn = el.querySelector('.copy-btn');
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            showToast('Copied to clipboard!', 'success');
            setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
        });
    });
}

function getLeadStatus(date) {
    if (!date) return { label: 'NEW', cls: 'warm' };
    const days = Math.floor((new Date() - new Date(date)) / 86400000);
    if (days >= 7) return { label: 'AT RISK', cls: 'at-risk' };
    if (days >= 3) return { label: 'COLD', cls: 'cold' };
    if (days >= 1) return { label: 'WARM', cls: 'warm' };
    return { label: 'HOT', cls: 'hot' };
}

// ═══════════════════════════════════════════════
//  CONFETTI ANIMATION
// ═══════════════════════════════════════════════

function fireConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#4285f4', '#34d399', '#fbbf24', '#f87171', '#7c4dff', '#ff6b9d'];
    const particles = Array.from({ length: 100 }, () => ({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * -14 - 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        life: 1,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 10
    }));
    (function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        particles.forEach(p => {
            if (p.life <= 0) return;
            alive = true;
            p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life -= 0.012; p.rot += p.rotV;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot * Math.PI / 180);
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
        });
        if (alive) requestAnimationFrame(draw);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    })();
}

// ═══════════════════════════════════════════════
//  FOUNDER SCORE
// ═══════════════════════════════════════════════

function calcScore(tasks, leads) {
    let s = 50;
    const total = tasks.length || 1;
    s += Math.round((tasks.filter(t => t.status === 'done').length / total) * 25);
    s -= tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length * 5;
    s += Math.min(leads.length * 2, 15);
    s += tasks.length >= 3 ? 10 : 0;
    return Math.max(0, Math.min(100, s));
}

function updateScoreUI(score) {
    const el = document.getElementById('founder-score-value');
    const ring = document.getElementById('score-ring-fill');
    if (!el || !ring) return;
    let cur = parseInt(el.textContent) || 0;
    const step = score > cur ? 1 : -1;
    const timer = setInterval(() => { cur += step; el.textContent = cur; if (cur === score) clearInterval(timer); }, 15);
    ring.style.strokeDashoffset = 213.6 - (213.6 * score / 100);
    ring.classList.remove('high', 'mid', 'low');
    ring.classList.add(score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low');
}

// ═══════════════════════════════════════════════
//  STREAK + THEME
// ═══════════════════════════════════════════════

function updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    const last = localStorage.getItem('fai_login');
    let streak = parseInt(localStorage.getItem('fai_streak') || '0');
    if (last !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        streak = last === yesterday ? streak + 1 : 1;
        localStorage.setItem('fai_login', today);
        localStorage.setItem('fai_streak', streak);
    }
    const el = document.getElementById('streak-value');
    const icon = document.getElementById('streak-icon');
    const card = document.getElementById('metric-streak');
    if (el) el.textContent = streak;
    if (streak >= 3 && icon) { icon.textContent = '🔥'; if (card) card.classList.add('streak-fire'); }
}

function initTheme() {
    const saved = localStorage.getItem('fai_theme') || 'dark';
    if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.textContent = saved === 'light' ? '☀️' : '🌙';
    btn.addEventListener('click', () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (isLight) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('fai_theme', 'dark');
            btn.textContent = '🌙';
            showToast('Dark mode', 'info');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('fai_theme', 'light');
            btn.textContent = '☀️';
            showToast('Light mode', 'info');
        }
    });
}

// ═══════════════════════════════════════════════
//  MAIN — DOMContentLoaded
// ═══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateStreak();

    // DOM refs
    const briefingBody = document.getElementById('briefing-body');
    const refreshBtn = document.getElementById('refresh-briefing');
    const userNameEl = document.getElementById('user-name');
    const greetingEl = document.getElementById('greeting-text');
    const avatarEl = document.getElementById('avatar-letter');
    const modalOverlay = document.getElementById('modal-overlay');
    const taskListEl = document.getElementById('task-list');
    const leadsTbody = document.getElementById('leads-tbody');
    const leadsWrap = document.querySelector('.leads-table-wrap');

    let currentUid = null;
    let cachedTasks = [];
    let cachedLeads = [];

    // ───────── Modal System ─────────
    const openModal = id => { modalOverlay?.classList.add('active'); document.getElementById(id)?.classList.add('active'); };
    const closeModals = () => { modalOverlay?.classList.remove('active'); document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active')); };
    document.querySelectorAll('[data-modal]').forEach(b => b.addEventListener('click', () => openModal(b.dataset.modal)));
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModals));
    modalOverlay?.addEventListener('click', e => { if (e.target === modalOverlay) closeModals(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModals(); });

    // ═══════════════════════════════════════════
    //  TASKS
    // ═══════════════════════════════════════════

    function getDemoTasks() {
        return [
            { id: 'demo1', title: 'Finalise pitch deck v3', deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0], status: 'pending', score: 9, label: 'URGENT', level: 'urgent' },
            { id: 'demo2', title: 'Schedule call with Sequoia partner', deadline: new Date(Date.now() + 259200000).toISOString().split('T')[0], status: 'in-progress', score: 7, label: 'MEDIUM', level: 'medium' },
            { id: 'demo3', title: 'Review Q2 financial model', deadline: new Date(Date.now() + 604800000).toISOString().split('T')[0], status: 'pending', score: 4, label: 'LOW', level: 'low' },
            { id: 'demo4', title: 'Submit YC application', deadline: new Date(Date.now() + 172800000).toISOString().split('T')[0], status: 'pending', score: 8, label: 'URGENT', level: 'urgent' },
            { id: 'demo5', title: 'Organize team standup notes', deadline: new Date(Date.now() + 432000000).toISOString().split('T')[0], status: 'done', score: 2, label: 'LOW', level: 'low' }
        ];
    }

    function getDemoLeads() {
        return [
            { id: 'ld1', name: 'Sarah Chen', company: 'Acme Ventures', lastContact: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
            { id: 'ld2', name: 'James Park', company: 'Sequoia Capital', lastContact: new Date(Date.now() - 432000000).toISOString().split('T')[0] },
            { id: 'ld3', name: 'Lisa Wang', company: 'Techstars', lastContact: new Date(Date.now() - 864000000).toISOString().split('T')[0] }
        ];
    }

    async function fetchTasks(uid) {
        let tasks = [];
        if (isDemoMode) {
            tasks = getDemoTasks();
        } else {
            try {
                const snap = await getDocs(collection(db, 'users', uid, 'tasks'));
                snap.forEach(d => tasks.push({ id: d.id, ...d.data() }));
            } catch (e) { console.warn('Firestore tasks:', e.message); }
        }
        tasks.sort((a, b) => (b.score || 0) - (a.score || 0));
        cachedTasks = tasks;
        return tasks;
    }

    function renderTasks(tasks) {
        if (!taskListEl) return;
        if (!tasks.length) {
            taskListEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:1.5rem;">No tasks yet. Add one above!</p>';
            return;
        }
        taskListEl.innerHTML = tasks.map(t => `
            <div class="task-card" data-id="${t.id}" data-status="${t.status || 'pending'}">
                <div class="task-status ${t.status === 'done' ? 'done' : t.level === 'urgent' ? 'pending' : 'in-progress'}"></div>
                <div class="task-info">
                    <span class="task-title">${t.title}</span>
                    <span class="task-meta">${t.status === 'done' ? '✅ Completed' : (t.deadline ? 'Due ' + t.deadline : 'No deadline')}</span>
                </div>
                <span class="priority-badge ${t.level || 'medium'}">${t.label || 'MEDIUM'}</span>
                <span class="task-score">${t.score || '?'}/10</span>
            </div>`).join('');

        // Click to complete
        taskListEl.querySelectorAll('.task-card').forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                const task = cachedTasks.find(t => t.id === card.dataset.id);
                if (!task || task.status === 'done') return;
                task.status = 'done';
                card.style.opacity = '0.5';
                card.querySelector('.task-meta').textContent = '✅ Completed';
                card.querySelector('.task-status').className = 'task-status done';
                showToast('Task completed! 🎉', 'success');
                fireConfetti();
                updateScoreUI(calcScore(cachedTasks, cachedLeads));
            });
        });
    }

    // Add Task
    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) addTaskBtn.addEventListener('click', async () => {
        const titleIn = document.getElementById('new-task-title');
        const dateIn = document.getElementById('new-task-deadline');
        const title = titleIn?.value.trim();
        if (!title) { showToast('Enter a task title', 'warning'); return; }
        const deadline = dateIn?.value || '';
        addTaskBtn.disabled = true; addTaskBtn.textContent = 'Scoring...';
        try {
            const r = await fetch('/api/score-task', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, deadline }) });
            const { score, label, level } = await r.json();
            const task = { id: Date.now().toString(), title, deadline, status: 'pending', score, label, level };
            if (!isDemoMode && currentUid) {
                try { await addDoc(collection(db, 'users', currentUid, 'tasks'), task); } catch (e) { /* silent */ }
            }
            cachedTasks.push(task);
            cachedTasks.sort((a, b) => (b.score || 0) - (a.score || 0));
            renderTasks(cachedTasks);
            const tv = document.getElementById('metric-tasks-value');
            if (tv) tv.textContent = cachedTasks.filter(t => t.status !== 'done').length;
            updateScoreUI(calcScore(cachedTasks, cachedLeads));
            showToast(`Task added! Priority: ${label} (${score}/10)`, score >= 8 ? 'warning' : 'success');
            titleIn.value = ''; dateIn.value = '';
        } catch (e) { showToast('Failed to add task', 'warning'); }
        finally { addTaskBtn.disabled = false; addTaskBtn.textContent = 'Add Task'; }
    });

    // ═══════════════════════════════════════════
    //  LEADS
    // ═══════════════════════════════════════════

    async function fetchLeads(uid) {
        let leads = [];
        if (isDemoMode) {
            leads = getDemoLeads();
        } else {
            try {
                const snap = await getDocs(collection(db, 'users', uid, 'leads'));
                snap.forEach(d => leads.push({ id: d.id, ...d.data() }));
            } catch (e) { console.warn('Firestore leads:', e.message); }
        }
        cachedLeads = leads;
        return leads;
    }

    function renderLeads(leads) {
        if (!leadsTbody || !leadsWrap) return;
        if (!leads.length) { leadsWrap.classList.add('empty'); return; }
        leadsWrap.classList.remove('empty');
        leadsTbody.innerHTML = leads.map(l => {
            const st = getLeadStatus(l.lastContact);
            return `<tr>
                <td>${l.name}</td><td>${l.company}</td><td>${l.lastContact || '—'}</td>
                <td><span class="lead-status ${st.cls}">${st.label}</span></td>
                <td><button class="lead-action-btn" data-name="${l.name}" data-co="${l.company}">Follow Up</button></td>
            </tr>`;
        }).join('');

        leadsTbody.querySelectorAll('.lead-action-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true; btn.textContent = 'Generating...';
                try {
                    const reply = await generateFollowUpEmail(`${btn.dataset.name} from ${btn.dataset.co}`);
                    openModal('modal-followup');
                    showResult(document.getElementById('result-followup'), reply);
                } catch (e) { showToast('Error generating email', 'warning'); }
                finally { btn.disabled = false; btn.textContent = 'Follow Up'; }
            });
        });
        const lv = document.getElementById('metric-leads-value');
        if (lv) lv.textContent = leads.length;
    }

    // Add Lead
    const addLeadBtn = document.getElementById('add-lead-btn');
    if (addLeadBtn) addLeadBtn.addEventListener('click', async () => {
        const nameIn = document.getElementById('new-lead-name');
        const coIn = document.getElementById('new-lead-company');
        const dateIn = document.getElementById('new-lead-date');
        const name = nameIn?.value.trim();
        const company = coIn?.value.trim();
        if (!name || !company) { showToast('Enter name and company', 'warning'); return; }
        const lastContact = dateIn?.value || new Date().toISOString().split('T')[0];
        const lead = { id: Date.now().toString(), name, company, lastContact };
        if (!isDemoMode && currentUid) {
            try { await addDoc(collection(db, 'users', currentUid, 'leads'), lead); } catch (e) { /* silent */ }
        }
        cachedLeads.push(lead);
        renderLeads(cachedLeads);
        updateScoreUI(calcScore(cachedTasks, cachedLeads));
        showToast(`Lead "${name}" added!`, 'success');
        nameIn.value = ''; coIn.value = ''; dateIn.value = '';
    });

    // ═══════════════════════════════════════════
    //  BRIEFING + AUTH
    // ═══════════════════════════════════════════

    async function loadData(uid) {
        const tasks = await fetchTasks(uid);
        const leads = await fetchLeads(uid);
        renderTasks(tasks);
        renderLeads(leads);
        const now = new Date();
        let overdue = 0, deadlines = 0;
        tasks.forEach(t => {
            if (t.deadline && new Date(t.deadline) < now && t.status !== 'done') overdue++;
            if (t.deadline) { const d = (new Date(t.deadline) - now) / 3600000; if (d > 0 && d < 24) deadlines++; }
        });
        const tv = document.getElementById('metric-tasks-value');
        const lv = document.getElementById('metric-leads-value');
        const dv = document.getElementById('metric-deadlines-value');
        if (tv) tv.textContent = tasks.filter(t => t.status !== 'done').length;
        if (lv) lv.textContent = leads.length;
        if (dv) dv.textContent = deadlines;
        updateScoreUI(calcScore(tasks, leads));
        return { tasks: tasks.length, leads: leads.length, deadlines, overdue, taskList: tasks };
    }

    async function loadBriefing(name, uid) {
        if (!briefingBody) return;
        briefingBody.innerHTML = '<div class="briefing-skeleton"><div class="skeleton-line w80"></div><div class="skeleton-line w60"></div><div class="skeleton-line w90"></div><div class="skeleton-line w70"></div></div>';
        try {
            const m = await loadData(uid);
            const reply = await getDailyBriefing(name, { tasks: m.tasks, leads: m.leads, deadlines: m.deadlines, overdue: m.overdue, taskList: m.taskList.map(t => t.title).filter(Boolean).slice(0, 5) });
            briefingBody.innerHTML = `<div class="briefing-text">${reply.replace(/\n/g, '<br>')}</div>`;
        } catch (e) {
            briefingBody.innerHTML = '<div class="briefing-text" style="color:var(--text-muted)">Unable to load briefing. Click ↻ to retry.</div>';
        }
    }

    function initDashboard(name, uid) {
        if (userNameEl) userNameEl.textContent = name;
        if (greetingEl) greetingEl.textContent = `${getTimeGreeting()},`;
        if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
        currentUid = uid;
        loadBriefing(name, uid);
        showToast(`Welcome back, ${name}!`, 'info');
    }

    // Auth
    if (isDemoMode) {
        initDashboard('Founder', 'demo');
    } else {
        onAuthStateChanged(auth, user => {
            if (!user) { window.location.href = '/index.html'; return; }
            initDashboard(user.displayName?.split(' ')[0] || 'Founder', user.uid);
        });
    }

    if (refreshBtn) refreshBtn.addEventListener('click', () => loadBriefing(userNameEl?.textContent || 'Founder', currentUid));

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        try { await signOut(auth); } catch (e) { /* ok */ }
        localStorage.removeItem('fai_login');
        localStorage.removeItem('fai_streak');
        window.location.href = '/index.html';
    });

    // ───────── Inline Chat ─────────
    const dci = document.getElementById('dash-chat-input');
    const dcb = document.getElementById('dash-send-btn');
    const dcm = document.getElementById('dash-chat-messages');
    const addMsg = (t, type) => { if (!dcm) return; const d = document.createElement('div'); d.className = `message ${type}-message`; d.innerHTML = `<div class="message-content">${t.replace(/\n/g, '<br>')}</div>`; dcm.appendChild(d); dcm.scrollTop = dcm.scrollHeight; };
    const sendDash = async () => { if (!dci) return; const t = dci.value.trim(); if (!t) return; addMsg(t, 'user'); dci.value = ''; try { addMsg(await askGemini(t), 'ai'); } catch (e) { addMsg('Error.', 'ai'); } };
    dcb?.addEventListener('click', sendDash);
    dci?.addEventListener('keypress', e => { if (e.key === 'Enter') sendDash(); });

    // ───────── Modal Actions ─────────
    const bind = (btnId, fn) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', fn);
    };

    bind('gen-followup', async () => {
        const n = document.getElementById('input-lead-name')?.value.trim();
        if (!n) { showToast('Enter a lead name', 'warning'); return; }
        const btn = document.getElementById('gen-followup');
        btn.disabled = true; btn.textContent = 'Generating...';
        try { showResult(document.getElementById('result-followup'), await generateFollowUpEmail(n)); }
        finally { btn.disabled = false; btn.textContent = 'Generate Email'; }
    });

    bind('gen-investor', async () => {
        const mrr = document.getElementById('input-mrr')?.value.trim();
        if (!mrr) { showToast('Enter your MRR', 'warning'); return; }
        const win = document.getElementById('input-win')?.value.trim();
        const btn = document.getElementById('gen-investor');
        btn.disabled = true; btn.textContent = 'Generating...';
        try { showResult(document.getElementById('result-investor'), await generateInvestorUpdate(`MRR: ${mrr}, Key win: ${win || 'N/A'}`)); }
        finally { btn.disabled = false; btn.textContent = 'Generate Update'; }
    });

    bind('gen-accelerator', async () => {
        const co = document.getElementById('input-company')?.value.trim();
        if (!co) { showToast('Enter company name', 'warning'); return; }
        const pr = document.getElementById('input-problem')?.value.trim();
        const btn = document.getElementById('gen-accelerator');
        btn.disabled = true; btn.textContent = 'Drafting...';
        try { showResult(document.getElementById('result-accelerator'), await draftAcceleratorApp(`Company: ${co}, Problem: ${pr || 'N/A'}`)); }
        finally { btn.disabled = false; btn.textContent = 'Draft Application'; }
    });

    bind('gen-summarize', async () => {
        const btn = document.getElementById('gen-summarize');
        btn.disabled = true; btn.textContent = 'Summarizing...';
        try {
            const names = cachedTasks.map(t => `${t.title} (${t.status || 'pending'})`);
            const r = await fetch('/api/summarize-week', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskList: names, userName: userNameEl?.textContent || 'Founder' }) });
            const data = await r.json();
            showResult(document.getElementById('result-summarize'), data.reply || 'No summary.');
        } finally { btn.disabled = false; btn.textContent = 'Summarize My Week'; }
    });
});
