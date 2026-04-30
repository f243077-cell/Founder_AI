# FounderAI

An AI-native operational assistant for early-stage startup founders. Built at GDG on Campus FAST NUCES CFD — Build with AI Hackathon 2026.

---

## The Problem

Early-stage startup founders lose 2.1 hours daily switching between 6 to 8 tools simultaneously. A typical founder manages investor relations, customer follow-ups, accelerator applications, lead tracking, and product decisions — all without support staff. Studies show that 60% of combined working hours in early-stage startups go toward operational overhead rather than building, selling, or talking to users.

FounderAI addresses this by acting as an AI-powered second brain that handles the cognitive load so founders can focus on what only they can do.

---

## Features

### Daily Briefing
Every time the founder logs in, the AI generates a personalized morning briefing based on their current tasks and leads. It shows pending tasks, overdue follow-ups, today's number one priority, and includes a ready-to-send draft email for the most urgent item.

### AI Chat Assistant
A real-time chat interface powered by Meta Llama 3.1. The founder can ask anything related to their startup — investor questions, product decisions, customer communication — and get concise, actionable responses.

### One-Click Email Drafts
Founders can generate professional emails with a single click:
- Investor update email with metrics, wins, and challenges
- Follow-up email for leads and prospects
- Customer welcome and onboarding email
- Accelerator application draft for YC and Techstars style programs

### Smart Task Manager
Tasks are saved to Firebase Firestore. The AI automatically assigns a priority score from 1 to 10 based on the task title and deadline. Overdue tasks are flagged in red and urgent tasks are highlighted so the founder always knows what to work on first.

### Lead Tracker
Founders can add leads with their name, company, and last contact date. The system automatically marks leads as cold if no contact has been made in three or more days and displays them in red. A single button generates a follow-up email for any lead.

### Weekly Summary
At the end of the week the AI reads all tasks and generates a summary including wins, still-pending items, and the top three priorities for the following week.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js + Express.js |
| Database | Firebase Firestore |
| Authentication | Firebase Google Login |
| AI Model | Meta Llama 3.1 8B via OpenRouter API |
| Deployment | Railway |

---

## AI Integration

Every feature in FounderAI is powered by the Meta Llama 3.1 8B Instruct model accessed through OpenRouter. The AI is not a supplementary feature — it is the core of the product. Without AI, none of the features function. The system uses a carefully crafted system prompt that positions the model as a startup operations expert, and each endpoint sends a structured prompt with real user data to generate personalized, contextual responses.

---

## Project Structure

```
Founder_AI/
├── public/
│   ├── index.html          # Landing and login page
│   ├── dashboard.html      # Main founder dashboard
│   └── chat.html           # AI chat interface
├── js/
│   ├── firebase.js         # Firebase configuration
│   ├── tasks.js            # Task management logic
│   └── auth.js             # Authentication handlers
├── server.js               # Express backend and AI API routes
├── Dockerfile              # Container configuration
├── package.json            # Dependencies
└── .env                    # Environment variables
```

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- An OpenRouter API key from openrouter.ai
- A Firebase project with Firestore and Authentication enabled

### Installation

```bash
git clone https://github.com/f243077-cell/Founder_AI.git
cd Founder_AI
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
OPENROUTER_API_KEY=your_openrouter_key_here
PORT=3000
```

### Running Locally

```bash
node server.js
```

The app will be available at `http://localhost:3000`.

---

## Deployment

The app is deployed on Railway. To deploy your own instance connect the GitHub repository to Railway and add the `OPENROUTER_API_KEY` environment variable. Railway will automatically detect the Node.js app and deploy it.

For Google Cloud Run deployment:

```bash
gcloud run deploy founder-ai \
  --source . \
  --region us-central1 \
  --project YOUR_PROJECT_ID \
  --allow-unauthenticated
```

---

## Author

| Member | Role |
|--------|------|
| Tanzeel Hussain | Full Stack + AI Integration + Frontend + Firebase  |

---

## Hackathon

- **Event:** Build with AI — GDG on Campus FAST NUCES CFD
- **Date:** April 27, 2026
- **Duration:** 24 Hours
- **Problem Statement:** The Founder's Stack
- **Tools Used:** Antigravity, Firebase, OpenRouter, Railway
