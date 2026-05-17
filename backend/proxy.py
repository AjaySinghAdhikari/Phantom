import os
import json
import time
from datetime import datetime, timezone
from fastapi import FastAPI, Request, Response
import httpx
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Text, Integer, DateTime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

TARGET_URL = os.getenv("TARGET_URL", "http://localhost:8000")

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
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    method: Mapped[str] = mapped_column(Text)
    path: Mapped[str] = mapped_column(Text)
    req_headers: Mapped[str] = mapped_column(Text) # JSON string
    req_body: Mapped[str] = mapped_column(Text)
    res_status: Mapped[int] = mapped_column(Integer)
    res_body: Mapped[str] = mapped_column(Text)
    res_time_ms: Mapped[int] = mapped_column(Integer)

app = FastAPI(title="Phantom Proxy")

@app.on_event("startup")
async def startup_event():
    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def proxy(request: Request, path: str):
    start_time = time.time()
    
    # Read request data
    body_bytes = await request.body()
    req_body_text = body_bytes.decode("utf-8", errors="replace")
    req_headers = dict(request.headers)
    
    # Drop headers that shouldn't be forwarded (e.g., Host)
    forward_headers = {k: v for k, v in req_headers.items() if k.lower() not in ["host", "content-length"]}
    
    # Construct target URL
    target = f"{TARGET_URL.rstrip('/')}/{path}"
    if request.url.query:
        target += f"?{request.url.query}"
        
    async with httpx.AsyncClient() as client:
        # Forward the request
        try:
            proxy_response = await client.request(
                method=request.method,
                url=target,
                headers=forward_headers,
                content=body_bytes,
                timeout=30.0
            )
            res_status = proxy_response.status_code
            res_body_bytes = proxy_response.content
            res_body_text = res_body_bytes.decode("utf-8", errors="replace")
            res_headers = dict(proxy_response.headers)
        except Exception as e:
            # Handle connection errors to target
            res_status = 502
            res_body_text = str(e)
            res_body_bytes = res_body_text.encode("utf-8")
            res_headers = {}

    end_time = time.time()
    res_time_ms = int((end_time - start_time) * 1000)
    
    # Save to DB asynchronously
    async with AsyncSessionLocal() as session:
        log_entry = ProxyLog(
            timestamp=datetime.now(timezone.utc),
            method=request.method,
            path=request.url.path,
            req_headers=json.dumps(req_headers),
            req_body=req_body_text,
            res_status=res_status,
            res_body=res_body_text,
            res_time_ms=res_time_ms
        )
        session.add(log_entry)
        await session.commit()
        
    # Return the real response back untouched
    # Filter out transfer headers that might cause issues with FastAPI's own Response
    return_headers = {
        k: v for k, v in res_headers.items() 
        if k.lower() not in ["content-encoding", "transfer-encoding", "content-length"]
    }
    
    return Response(
        content=res_body_bytes,
        status_code=res_status,
        headers=return_headers
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("proxy:app", host="0.0.0.0", port=8080, reload=True)
