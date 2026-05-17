import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select, func, delete, desc
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Text, Integer, DateTime
from datetime import datetime

# Database setup
DB_PATH = os.path.join(os.path.dirname(__file__), "phantom.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class ProxyLog(Base):
    __tablename__ = "proxy_logs"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime)
    method: Mapped[str] = mapped_column(Text)
    path: Mapped[str] = mapped_column(Text)
    req_headers: Mapped[str] = mapped_column(Text)
    req_body: Mapped[str] = mapped_column(Text)
    res_status: Mapped[int] = mapped_column(Integer)
    res_body: Mapped[str] = mapped_column(Text)
    res_time_ms: Mapped[int] = mapped_column(Integer)

def log_to_dict(log: ProxyLog) -> dict:
    return {
        "id": log.id,
        "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        "method": log.method,
        "path": log.path,
        "req_headers": log.req_headers,
        "req_body": log.req_body,
        "res_status": log.res_status,
        "res_body": log.res_body,
        "res_time_ms": log.res_time_ms
    }

app = FastAPI(title="Phantom Backend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Ensure the database file exists
    if not os.path.exists(DB_PATH):
        open(DB_PATH, 'w').close()
    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
def read_root():
    return {"message": "Phantom backend is running!"}

@app.get("/api/logs")
async def get_logs():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ProxyLog).order_by(desc(ProxyLog.timestamp)).limit(200)
        )
        logs = result.scalars().all()
        return [log_to_dict(log) for log in logs]

@app.get("/api/logs/{log_id}")
async def get_log(log_id: int):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ProxyLog).where(ProxyLog.id == log_id)
        )
        log = result.scalars().first()
        if not log:
            raise HTTPException(status_code=404, detail="Log not found")
        return log_to_dict(log)

@app.delete("/api/logs")
async def clear_logs():
    async with AsyncSessionLocal() as session:
        await session.execute(delete(ProxyLog))
        await session.commit()
        return {"message": "All logs cleared"}

@app.get("/api/stats")
async def get_stats():
    async with AsyncSessionLocal() as session:
        # Total requests
        total_result = await session.execute(select(func.count(ProxyLog.id)))
        total_requests = total_result.scalar() or 0
        
        # Average response time
        avg_time_result = await session.execute(select(func.avg(ProxyLog.res_time_ms)))
        avg_time = avg_time_result.scalar() or 0.0
        
        # Breakdown by HTTP method
        method_result = await session.execute(
            select(ProxyLog.method, func.count(ProxyLog.id)).group_by(ProxyLog.method)
        )
        methods = {row[0]: row[1] for row in method_result.all()}
        
        return {
            "total_requests": total_requests,
            "average_response_time_ms": round(avg_time, 2),
            "methods": methods
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
