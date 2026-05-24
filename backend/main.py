from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, select, func, delete
import datetime

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

@app.get("/")
async def root():
    return {"message": "Phantom backend is running!"}

@app.get("/api/logs")
async def get_logs():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TrafficLog).order_by(TrafficLog.id.desc()).limit(200)
        )
        logs = result.scalars().all()
        return [
            {
                "id":          l.id,
                "timestamp":   l.timestamp.isoformat() if l.timestamp else None,
                "method":      l.method,
                "path":        l.path,
                "req_headers": l.req_headers,
                "req_body":    l.req_body,
                "res_status":  l.res_status,
                "res_body":    l.res_body,
                "res_time_ms": l.res_time_ms,
            }
            for l in logs
        ]

@app.get("/api/logs/{log_id}")
async def get_log(log_id: int):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(TrafficLog).where(TrafficLog.id == log_id))
        l = result.scalar_one_or_none()
        if not l:
            return JSONResponse({"error": "Not found"}, status_code=404)
        return {
            "id": l.id, "timestamp": l.timestamp.isoformat(),
            "method": l.method, "path": l.path,
            "req_headers": l.req_headers, "req_body": l.req_body,
            "res_status": l.res_status, "res_body": l.res_body,
            "res_time_ms": l.res_time_ms,
        }

@app.delete("/api/logs")
async def clear_logs():
    async with AsyncSessionLocal() as session:
        await session.execute(delete(TrafficLog))
        await session.commit()
    return {"message": "All logs cleared"}

@app.get("/api/stats")
async def get_stats():
    async with AsyncSessionLocal() as session:
        total = await session.execute(select(func.count(TrafficLog.id)))
        avg   = await session.execute(select(func.avg(TrafficLog.res_time_ms)))
        methods_result = await session.execute(
            select(TrafficLog.method, func.count(TrafficLog.id))
            .group_by(TrafficLog.method)
        )
        methods = {row[0]: row[1] for row in methods_result.fetchall() if row[0]}
        return {
            "total_requests":        total.scalar() or 0,
            "average_response_time_ms": round(avg.scalar() or 0, 2),
            "methods":               methods,
        }