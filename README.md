# RepoAtlas AI 🔭

**See your codebase. Not just search it.**

RepoAtlas AI is an intelligent code analysis platform that uses multi-agent AI to explore, trace, and visualize your GitHub repositories. Paste a GitHub URL and instantly get architecture diagrams, dependency graphs, security analysis, and git execution flow traces — all explained in plain English.

---

## 🌐 Live Deployments

| Service | URL |
|---------|-----|
| 🖥️ **Frontend (Vercel)** | [https://repoatlas-opal.vercel.app](https://repoatlas-opal.vercel.app) |
| ⚙️ **Backend API (Render)** | [https://repoatlas.onrender.com](https://repoatlas.onrender.com) |
| 📖 **API Docs (Swagger)** | [https://repoatlas.onrender.com/docs](https://repoatlas.onrender.com/docs) |
| 🗄️ **Database (Supabase)** | [https://rddkgfgzrzrkwxlijmnd.supabase.co](https://rddkgfgzrzrkwxlijmnd.supabase.co) |

---

## ✨ Features

- 🔍 **Explorer Agent** — Deep repository structure analysis with file tree & code snippets
- 📊 **Trace Agent** — Git history timeline, contributor stats & branch analysis
- 🔒 **Security Agent** — Vulnerability scanning, secret detection & risk assessment
- 📈 **Visualization Agent** — Interactive architecture, dependency graphs & commit heatmaps
- 🎯 **Manager Agent** — Orchestrates all agents in parallel and generates executive summaries
- 💬 **Persistent Chat History** — Per-user chat threads saved to Supabase
- 🔐 **Supabase Auth** — Google OAuth sign-in with session management
- 🔄 **API Key Rotation** — Auto-rotates across multiple Groq API keys on failure

---

## 🧠 AI Models (Updated August 2026)

RepoAtlas uses the latest active Groq models with automatic fallback rotation:

| Priority | Model | Use |
|----------|-------|-----|
| 1st | `openai/gpt-oss-20b` | Fast, low-latency responses |
| 2nd | `openai/gpt-oss-120b` | Powerful, complex analysis |
| 3rd | `qwen/qwen3.6-27b` | Alternate fallback |

> **Note:** `llama-3.1-8b-instant` and `llama-3.3-70b-versatile` were deprecated by Groq on **August 16, 2026**. RepoAtlas has been updated to use the new active model IDs.

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** — High-performance Python web framework
- **LangChain + LangGraph** — LLM orchestration and agent workflows
- **Groq** — Ultra-fast LLM inference via LPU
- **GitPython** — Git repository operations
- **Supabase (PostgreSQL)** — Auth, user sessions, and chat history
- **Render** — Backend deployment & hosting

### Frontend
- **Next.js 14 (App Router)** — React framework with SSR
- **TypeScript** — Type safety
- **TailwindCSS** — Utility-first styling
- **Framer Motion** — Smooth animations
- **Supabase JS Client** — Auth & database integration
- **Vercel** — Frontend deployment & CDN

---

## ⚡ Quick Start (Local Development)

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Groq API Key** — Free at [console.groq.com/keys](https://console.groq.com/keys)
- **Supabase Project** — Free at [supabase.com](https://supabase.com)

### 1. Clone the Repository

```bash
git clone https://github.com/Sara-ux23/repoatlas.git
cd repoatlas
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create `backend/.env`:
```env
# Groq API Keys (get free keys at console.groq.com/keys)
GROQ_API_KEY=gsk_...
GROQ_API_KEY_2=gsk_...    # Optional: for rotation
GROQ_API_KEY_3=gsk_...    # Optional: for rotation

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_jwt_secret

# GitHub Token (optional, increases API rate limits)
GITHUB_TOKEN=ghp_...
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Run the Application

**Terminal 1 — Backend:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

**Access the app at:** http://localhost:3000  
**API Docs at:** http://localhost:8000/docs

---

## 🚀 Deployment

### Frontend → Vercel

1. Connect your GitHub repo to [vercel.com](https://vercel.com)
2. Set root directory to `frontend`
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Backend → Render

1. Connect your GitHub repo to [render.com](https://render.com)
2. Set root directory to `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
5. Add environment variables:
   - `GROQ_API_KEY` (and optionally `GROQ_API_KEY_2` through `_6`)
   - `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_JWT_SECRET`

---

## 🔌 API Endpoints

### Manager Agent
- `POST /manager/` — Run all agents on a repository
- `GET /manager/session` — Get current session info
- `DELETE /manager/session` — Clear session cache

### Individual Agents
- `POST /explorer/` — Repository structure analysis
- `POST /trace/` — Git history and contributor timeline
- `POST /security/` — Security vulnerability scan
- `POST /visualization/` — Architecture + dependency charts

### Chat & Sessions
- `POST /chat/message` — Save a chat message
- `GET /chat/history` — Load chat history for a user+repo
- `POST /chat/thread` — Create a new chat thread

---

## 📁 Project Structure

```
repoatlas/
├── backend/
│   ├── app/
│   │   ├── agents/               # AI agent implementations
│   │   │   ├── explorer_agent.py
│   │   │   ├── trace_agent.py
│   │   │   ├── security_agent.py
│   │   │   ├── visualization_agent.py
│   │   │   └── manager_agent.py
│   │   ├── api/                  # FastAPI route handlers
│   │   ├── core/
│   │   │   ├── llm.py            # Groq LLM + key rotation
│   │   │   └── repo_session.py   # Repo clone session cache
│   │   ├── db/
│   │   │   └── crud.py           # Supabase DB operations
│   │   ├── tools/                # Agent tools (Git, GitHub, Viz, Security)
│   │   └── main.py               # FastAPI application entry
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── agents/               # Agent page components
│   │   │   └── explorer-agent/
│   │   ├── auth/                 # Auth page (Supabase OAuth)
│   │   └── layout.tsx
│   ├── components/               # Reusable UI components
│   │   ├── Navbar.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── api.ts                # API client (auto-points to Render)
│   │   ├── authContext.tsx       # Supabase auth context
│   │   └── supabase.ts
│   ├── src/
│   │   └── main.tsx              # SPA router + auth state
│   └── vercel.json               # Vercel rewrite rules
└── README.md
```

---

## 🐛 Troubleshooting

### ⚠️ Groq "Model Not Found" / "Model Decommissioned" errors
Groq deprecates models regularly. Check [console.groq.com/docs/deprecations](https://console.groq.com/docs/deprecations) and update the model IDs in `backend/app/core/llm.py`. As of August 2026, the active models are `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, and `qwen/qwen3.6-27b`.

### ⚠️ Groq "Invalid API Key" errors
Generate a fresh key at [console.groq.com/keys](https://console.groq.com/keys) and update `GROQ_API_KEY` in your Render environment variables.

### ⚠️ Auth redirect loop after login
The frontend uses SPA routing via `history.pushState`. Ensure you are running the latest version — earlier versions had a full-page reload that wiped in-memory auth state.

### ⚠️ Supabase 23502 NOT NULL errors
The `user_id` columns in `analysis_sessions` and `chat_history` tables require a non-null value. Anonymous users should pass `"anonymous"` as `user_id`.

### Backend won't start
- Ensure Python 3.10+ is installed
- Activate virtual environment before running uvicorn
- Verify `GROQ_API_KEY` is set in `.env`

### Frontend can't reach backend
- Check `frontend/lib/api.ts` — `BASE_URL` should point to your Render backend URL
- Verify the `/api` rewrite in `frontend/vercel.json` is set correctly

---

## 🗺️ Roadmap

- [ ] Support for private repositories (via GitHub OAuth token)
- [ ] Custom agent workflows
- [ ] Export analysis reports as PDF
- [ ] Team collaboration and shared dashboards
- [ ] CI/CD integration for automated reviews
- [ ] Support for GitLab and Bitbucket repositories
- [ ] VS Code extension

---

## 🤝 Contributing

Contributions are welcome! Please submit a Pull Request or open an issue.

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

Built with ❤️ using AI agents, FastAPI, Next.js, Groq, and Supabase.

**Live App:** [https://repoatlas-opal.vercel.app](https://repoatlas-opal.vercel.app)
