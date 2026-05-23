# 👻 Phantom
### A Developer's Secret Weapon — API Traffic Recorder, Mocker & Chaos Injector

> *Sit between your frontend and backend. Watch everything. Control everything.*

---

## What is Phantom?

Phantom is a **local reverse proxy** that intercepts every HTTP request your app makes, records it in real-time, and gives you a beautiful dashboard to inspect, replay, mock, and sabotage it — all without touching your actual backend.

Think of it as **CCTV + a remote control** for your API traffic.

```
Your App  →→→  👻 Phantom (port 8080)  →→→  Real Backend
                      ↓
               SQLite Database
                      ↓
             React Dashboard (port 5173)
```

---

## The Solution we are aiming for:

| Situation | Without Phantom | With Phantom |
|---|---|---|
| Backend isn't ready | You wait or hardcode fake data | Replay recorded real responses |
| Can't reproduce a bug | Guess and beg users for screenshots | Replay the exact request that caused it |
| Testing error handling | Break your real server 😬 | Inject errors safely with one click |
| Slow API debugging | console.log everywhere | See every header, body, timing instantly |
| Frontend-backend integration | Hope for the best | Mock any endpoint in seconds |

---

## Features

### 🔴 Traffic Recorder *(v1 — built first)*
- Intercepts every HTTP request passing through port 8080
- Records: method, URL, headers, request body, response body, status code, response time
- Stores everything in a local SQLite database
- Live dashboard updates every 2 seconds

### 🟡 Mock Engine *(coming soon)*
- Define fake responses for any endpoint
- Phantom returns your mock instead of hitting the real backend
- Perfect for offline development

### 🟠 Chaos Injector *(coming soon)*
- Simulate slow responses (add artificial latency)
- Force error responses (500, 404, 503)
- Test how your app behaves when things go wrong

### 🟢 Traffic Replay *(coming soon)*
- Click any recorded request and replay it instantly
- Reproduce bugs with the exact same payload every time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Proxy Core | Python + FastAPI |
| HTTP Forwarding | httpx (async) |
| Database | SQLite + SQLAlchemy (async) |
| API Server | FastAPI + Uvicorn |
| Dashboard | React + Vite + Tailwind CSS |

---

## Project Structure

```
phantom/
├── backend/
│   ├── main.py          # REST API (port 8000) — serves logs to the dashboard
│   ├── proxy.py         # Reverse proxy (port 8080) — intercepts & records traffic
│   ├── database.py      # SQLAlchemy models & DB setup
│   ├── requirements.txt
│   └── phantom.db       # Auto-created SQLite database
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Main dashboard UI
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── .env                 # Your config (TARGET_URL etc.)
├── .env.example
├── start.sh             # Linux/Mac: start all three services
└── README.md
```

---

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- pip

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/phantom.git
cd phantom

# Install Python dependencies
cd backend
pip install -r requirements.txt
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure your target

Copy the example env file and set your backend URL:

```bash
cp .env.example .env
```

Open `.env` and set:
```
TARGET_URL=https://your-actual-backend.com
```

> **Example:** If you're building a React app that normally talks to `https://api.myapp.com`, set `TARGET_URL=https://api.myapp.com`. Then point your React app to `http://localhost:8080` instead.

### 3. Start Phantom

**On Linux/Mac:**
```bash
bash start.sh
```

**On Windows (run each in a separate terminal):**

Terminal 1 — Proxy:
```bash
cd backend
uvicorn proxy:app --port 8080 --reload
```

Terminal 2 — API:
```bash
cd backend
uvicorn main:app --port 8000 --reload
```

Terminal 3 — Dashboard:
```bash
cd frontend
npm run dev
```

### 4. Open the dashboard

Go to **http://localhost:5173** in your browser.

Now send any request to `http://localhost:8080/your-endpoint` and watch it appear in the dashboard in real time.

---

## API Endpoints

These are Phantom's own REST endpoints for the dashboard:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/logs` | All recorded traffic, newest first (limit 200) |
| `GET` | `/api/logs/{id}` | Full detail of one traffic entry |
| `DELETE` | `/api/logs` | Clear all recorded logs |
| `GET` | `/api/stats` | Total requests, avg response time, method breakdown |

---

## Real-World Usage Example

Say you're building a React app that fetches user data from `https://api.github.com`.

**Step 1:** Set `TARGET_URL=https://api.github.com` in `.env`

**Step 2:** Change your React app's base URL to `http://localhost:8080`

**Step 3:** Use your app normally — browse, click, trigger API calls

**Step 4:** Open `http://localhost:5173` — see every request recorded with full detail

**Step 5:** When something breaks, click that request in Phantom and inspect exactly what was sent and received.

---

## Roadmap

- [x] Traffic recorder with live dashboard
- [ ] Mock endpoint builder (define fake responses per route)
- [ ] Chaos injection (latency + error simulation)  
- [ ] One-click traffic replay
- [ ] Export recorded sessions as JSON / HAR format
- [ ] Request filtering and search
- [ ] Team mode (shared recording sessions)

---

## Why Phantom?

Tools like this exist commercially:

- **Proxyman** — $89 one-time
- **WireMock Cloud** — enterprise pricing  
- **Postman Interceptor** — requires paid plan

Phantom is **free, open-source, and self-hosted**. Your traffic never leaves your machine.

---

## Contributing

Contributions welcome! Open an issue or submit a PR.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/mock-engine`
3. Commit your changes
4. Open a pull request

---

## License

MIT — do whatever you want with it.

---

<div align="center">
  Built with 🐍 Python + ⚛️ React &nbsp;|&nbsp; Made by developers, for developers
</div>
