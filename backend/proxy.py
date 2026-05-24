from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from dotenv import load_dotenv
import httpx
import os
import time
import asyncio
import datetime

load_dotenv()

TARGET_URL = os.getenv("TARGET_URL", "https://jsonplaceholder.typicode.com").rstrip("/")

DATABASE_URL = "sqlite+aiosqlite:///./phantom.db"
engine = create_async_engine(DATABASE_URL, echo=False)
Base = declarative_base()
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class TrafficLog(Base):
    __tablename__ = "traffic_logs"
    id            = Column(Integer, primary_key=True, index=True)
    timestamp     = Column(DateTime, default=datetime.datetime.utcnow)
    method        = Column(String)
    path          = Column(String)
    req_headers   = Column(Text)
    req_body      = Column(Text)
    res_status    = Column(Integer)
    res_body      = Column(Text)
    res_time_ms   = Column(Float)

# ── Chaos config (lives in memory) ──────────────────────────────
chaos_config = {
    "enabled": False,
    "latency_ms": 0,       # artificial delay in ms
    "error_code": None,    # if set, return this status instead of forwarding
    "path_filter": "",     # if set, only apply chaos to paths containing this string
}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# ── Chaos endpoints ──────────────────────────────────────────────
@app.get("/api/chaos")
async def get_chaos():
    return chaos_config

@app.post("/api/chaos")
async def set_chaos(request: Request):
    body = await request.json()
    chaos_config["enabled"]    = body.get("enabled", chaos_config["enabled"])
    chaos_config["latency_ms"] = int(body.get("latency_ms", chaos_config["latency_ms"]))
    chaos_config["error_code"] = body.get("error_code", chaos_config["error_code"])
    chaos_config["path_filter"]= body.get("path_filter", chaos_config["path_filter"])
    return chaos_config

# ── Proxy catch-all ──────────────────────────────────────────────
@app.api_route("/{path:path}", methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS","HEAD"])
async def proxy(request: Request, path: str):
    import json

    req_body = await request.body()
    req_headers = dict(request.headers)
    req_headers.pop("host", None)

    full_path = "/" + path
    if request.url.query:
        full_path += "?" + request.url.query

    # Skip chaos for internal /api/ routes
    apply_chaos = (
        chaos_config["enabled"]
        and not path.startswith("api/")
    )

    # Check path filter
    if apply_chaos and chaos_config["path_filter"]:
        apply_chaos = chaos_config["path_filter"] in full_path

    start = time.time()

    # Apply latency
    if apply_chaos and chaos_config["latency_ms"] > 0:
        await asyncio.sleep(chaos_config["latency_ms"] / 1000)

    # Apply error injection (skip real server)
    if apply_chaos and chaos_config["error_code"]:
        elapsed = round((time.time() - start) * 1000, 2)
        fake_body = json.dumps({"error": f"Chaos injected {chaos_config['error_code']}", "phantom": True})

        async with AsyncSessionLocal() as session:
            log = TrafficLog(
                method      = request.method,
                path        = full_path,
                req_headers = json.dumps(req_headers),
                req_body    = req_body.decode("utf-8", errors="replace"),
                res_status  = chaos_config["error_code"],
                res_body    = fake_body,
                res_time_ms = elapsed,
            )
            session.add(log)
            await session.commit()

        return JSONResponse(
            content={"error": f"Chaos injected {chaos_config['error_code']}", "phantom": True},
            status_code=chaos_config["error_code"],
        )

    # Normal proxy forward
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            url = TARGET_URL + full_path
            resp = await client.request(
                method=request.method,
                url=url,
                headers=req_headers,
                content=req_body,
            )
        elapsed = round((time.time() - start) * 1000, 2)

        async with AsyncSessionLocal() as session:
            log = TrafficLog(
                method      = request.method,
                path        = full_path,
                req_headers = json.dumps(req_headers),
                req_body    = req_body.decode("utf-8", errors="replace"),
                res_status  = resp.status_code,
                res_body    = resp.text[:5000],
                res_time_ms = elapsed,
            )
            session.add(log)
            await session.commit()

        return JSONResponse(
            content=resp.json() if "application/json" in resp.headers.get("content-type","") else {"body": resp.text},
            status_code=resp.status_code,
        )

    except Exception as e:
        elapsed = round((time.time() - start) * 1000, 2)
        async with AsyncSessionLocal() as session:
            log = TrafficLog(
                method=request.method, path=full_path,
                req_headers=json.dumps(req_headers),
                req_body=req_body.decode("utf-8", errors="replace"),
                res_status=502, res_body=str(e), res_time_ms=elapsed,
            )
            session.add(log)
            await session.commit()
        return JSONResponse({"error": str(e)}, status_code=502)