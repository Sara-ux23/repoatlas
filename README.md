# RepoAtlas AI

**See your codebase. Not just search it.**

RepoAtlas AI is an intelligent code analysis platform that uses AI agents to explore, trace, and visualize your GitHub repositories. Paste a GitHub URL and get architecture diagrams, dependency graphs, security analysis, and execution flow traces — all explained in plain English.

## Features

- 🔍 **Explorer Agent** - Deep repository structure analysis
- 📊 **Trace Agent** - Git history and contributor insights  
- 🔒 **Security Agent** - Vulnerability scanning and risk assessment
- 📈 **Visualization Agent** - Interactive architecture and dependency graphs
- 🎯 **Manager Agent** - Orchestrates all agents and generates executive summaries

## Tech Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **LangChain** - LLM orchestration
- **LangGraph** - Agent workflow management
- **Groq** - Fast LLM inference
- **GitPython** - Git repository operations

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool
- **TailwindCSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **TypeScript** - Type safety

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Groq API Key** - Get one at [console.groq.com](https://console.groq.com)
- **Git** - For cloning repositories

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd <repo-name>
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

# Configure environment variables
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

**Important**: Edit `backend/.env` and add your Groq API key:
```env
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

### 4. Run the Application

You need two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
# Make sure venv is activated
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

The backend API will be running at:
```
http://localhost:8000
```

You can check the API docs at:
```
http://localhost:8000/docs
```

## Usage

1. **Paste a GitHub URL** - Enter any public GitHub repository URL
2. **Click "Analyze Repo"** - The system will clone and analyze the repository
3. **View Results** - Explore the interactive dashboard with:
   - Executive summary
   - Repository structure
   - Git history and contributors
   - Security vulnerabilities
   - Architecture diagrams
   - Dependency graphs

### Example Repositories to Try

- `facebook/react`
- `vercel/next.js`
- `openai/whisper`
- `fastapi/fastapi`

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── agents/          # AI agent implementations
│   │   ├── api/             # FastAPI routes
│   │   ├── core/            # Core utilities (LLM, sessions)
│   │   ├── tools/           # Agent tools (Git, GitHub, etc.)
│   │   └── main.py          # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment template
├── frontend/
│   ├── app/                 # Page components
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Utilities and API client
│   ├── src/                 # Entry point and styles
│   ├── index.html           # HTML template
│   └── package.json         # Node dependencies
└── README.md
```

## API Endpoints

### Manager Agent
- `POST /manager/` - Analyze a repository
- `GET /manager/session` - Get current session info
- `DELETE /manager/session` - Clear session cache

### Individual Agents
- `POST /explorer/` - Repository structure analysis
- `POST /trace/` - Git history and contributors
- `POST /security/` - Security vulnerability scan
- `POST /visualization/` - Generate architecture visualizations

## Configuration

### Backend Environment Variables

Edit `backend/.env`:

```env
# Required - Get from console.groq.com
GROQ_API_KEY=your_groq_api_key

# Optional - For API key rotation
GROQ_API_KEY_2=
GROQ_API_KEY_3=
GROQ_API_KEY_4=
```

### Frontend Configuration

The frontend is pre-configured to connect to `http://localhost:8000`. To change this, edit `frontend/lib/api.ts`:

```typescript
const BASE_URL = 'http://localhost:8000';
```

## Troubleshooting

### Backend won't start
- Ensure Python 3.10+ is installed: `python --version`
- Activate virtual environment
- Install all dependencies: `pip install -r requirements.txt`
- Check `.env` file has valid GROQ_API_KEY

### Frontend won't start
- Ensure Node.js 18+ is installed: `node --version`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again
- Check no other process is using port 3000

### CORS errors
- Ensure backend is running on port 8000
- Check backend CORS settings in `backend/app/main.py`

### Analysis fails
- Ensure the GitHub URL is valid and public
- Check backend logs for error details
- Verify Groq API key is valid and has quota
- Some very large repositories may timeout

## Development

### Backend Development

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

The `--reload` flag enables hot-reloading.

### Frontend Development

```bash
cd frontend
npm run dev
```

Vite provides instant hot module replacement (HMR).

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```

The optimized files will be in `frontend/dist/`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Add your license here]

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions

## Roadmap

- [ ] Support for private repositories
- [ ] Custom agent workflows
- [ ] Multi-language support (beyond Python/JS/TS/Go/Rust)
- [ ] Export reports as PDF
- [ ] Team collaboration features
- [ ] CI/CD integration

---

Built with ❤️ using AI agents and modern web technologies.
