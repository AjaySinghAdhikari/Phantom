# Phantom

**A local reverse proxy for HTTP traffic recording, mocking, and fault injection.**

Phantom sits transparently between your frontend and backend, capturing every request and response in real time. Use it to debug API calls, develop against a backend that doesn't exist yet, or test how your app handles failures — all from a local dashboard, with no traffic leaving your machine.

```
Your App  ──→  Phantom :8080  ──→  Real Backend
                    │
               SQLite DB
                    │
           Dashboard :5173
```

---

## Why Phantom?

| Scenario | Without Phantom | With Phantom |
|---|---|---|
| Backend isn't ready | Wait, or hardcode fake data | Serve recorded responses immediately |
| Can't reproduce a bug | Guess from screenshots | Replay the exact request that caused it |
| Testing error handling | Break production or staging | Inject errors safely with one click |
| Debugging slow APIs | Scatter `console.log` everywhere | Inspect every header, body, and timing |
| Frontend/backend integration | Hope both sides agree | Mock any endpoint in seconds |

---

## Features

### Traffic Recorder *(available now)*
- Intercepts all HTTP requests routed through port 8080
- Captures method, URL, request headers and body, response headers and body, status code, and response time
- Persists everything to a local SQLite database
- Dashboard refreshes every 2 seconds with live traffic

### Mock Engine *(coming soon)*
- Define custom responses for any route
- Phantom returns your mock; the real backend is never called
- Ideal for offline development or testing edge cases

### Chaos Injector *(coming soon)*
- Add artificial latency to any request
- Force specific HTTP error codes (500, 503, 404, etc.)
- Validate your app's resilience without touching real infrastructure

### Traffic Replay *(coming soon)*
- Re-issue any captured request with one click
- Reproduce bugs with bit-for-bit identical payloads

---

## Tech Stack

| Layer | Technology |
|---|---|
| Proxy | Python · FastAPI · httpx (async) |
| Storage | SQLite · SQLAlchemy (async) |
| API server | FastAPI · Uvicorn |
| Dashboard | React · Vite · Tailwind CSS |

---

## Project Structure

```
phantom/
├── backend/
│   ├── main.py           # REST API (port 8000) — serves log data to the dashboard
│   ├── proxy.py          # Reverse proxy (port 8080) — intercepts and records traffic
│   ├── database.py       # SQLAlchemy models and database setup
│   ├── requirements.txt
│   └── phantom.db        # SQLite database (auto-created on first run)
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Dashboard UI
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── .env                  # Local configuration (TARGET_URL, etc.)
├── .env.example
├── start.sh              # Starts all three services (Linux/macOS)
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- pip

### 1. Install dependencies

```bash
git clone https://github.com/yourusername/phantom.git
cd phantom

# Python dependencies
pip install -r backend/requirements.txt

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure your target

```bash
cp .env.example .env
```

Open `.env` and set `TARGET_URL` to your backend:

```env
TARGET_URL=https://your-actual-backend.com
```

Then point your frontend at `http://localhost:8080` instead of the real backend URL. Phantom will forward all requests transparently.

### 3. Start Phantom

**Linux / macOS:**
```bash
bash start.sh
```

**Windows** — run each command in a separate terminal:

```bash
# Terminal 1 — Proxy
cd backend && uvicorn proxy:app --port 8080 --reload

# Terminal 2 — API server
cd backend && uvicorn main:app --port 8000 --reload

# Terminal 3 — Dashboard
cd frontend && npm run dev
```

### 4. Open the dashboard

Visit **[http://localhost:5173](http://localhost:5173)**.

Send any request to `http://localhost:8080/<your-endpoint>` and it will appear in the dashboard within 2 seconds.

---

## API Reference

Phantom exposes a REST API for the dashboard. You can also query it directly.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/logs` | All recorded traffic, newest first (max 200) |
| `GET` | `/api/logs/{id}` | Full detail for a single traffic entry |
| `DELETE` | `/api/logs` | Clear all recorded logs |
| `GET` | `/api/stats` | Request count, average response time, method breakdown |

---

## Example

Proxying the GitHub API:

```bash
# .env
TARGET_URL=https://api.github.com
```

Point your app at `http://localhost:8080`, then use it normally. Every API call will appear in the Phantom dashboard with full request and response detail, making it straightforward to trace exactly what your app is sending and receiving.

---

## Roadmap

- [x] Live traffic recording and dashboard
- [ ] Mock endpoint builder
- [ ] Chaos injection (latency, forced errors)
- [ ] One-click request replay
- [ ] Export sessions as JSON / HAR
- [ ] Request search and filtering
- [ ] Shared recording sessions (team mode)

---

## Alternatives

Phantom covers similar ground to commercial tools, without the cost or the cloud dependency:

| Tool | Price |
|---|---|
| Proxyman | $89 one-time |
| WireMock Cloud | Enterprise pricing |
| Postman Interceptor | Requires paid plan |
| **Phantom** | **Free, open-source, self-hosted** |

Your traffic stays on your machine.

---

## Contributing

Pull requests are welcome. To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes with a clear message
4. Open a pull request against `main`

Please open an issue first for substantial changes so we can align on direction before you build.

---

## License

[MIT](LICENSE) — use it however you like.

---

*Built with Python and React.*