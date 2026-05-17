#!/bin/bash

# Start the proxy server on port 8080
uvicorn backend.proxy:app --port 8080 &

# Start the main API server on port 8000
uvicorn backend.main:app --port 8000 &

# Start the frontend on port 5173
cd frontend && npm run dev &

echo "🚀 Phantom is running!"

# Keep script running to maintain background processes
wait
