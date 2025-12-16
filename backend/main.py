from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import asyncio
from datetime import datetime

from app.config import settings
from app.database import init_db
from app.mqtt_client import mqtt_handler
from app.routes import router
from app.report_generator import router as report_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup resources"""
    # Startup
    print("🚀 Starting Motor Monitoring Backend...")
    
    # Initialize database
    await init_db()
    print("✅ Database initialized")
    
    # Start MQTT client (desactivado temporalmente - TLS issue en Windows)
    # loop = asyncio.get_event_loop()
    # await mqtt_handler.start(loop)
    print("⚠️  MQTT backend desactivado (frontend funciona vía WebSocket)")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down...")
    # await mqtt_handler.stop()

# Create FastAPI app
app = FastAPI(
    title="Motor Monitoring Backend",
    description="Backend API for 3-phase motor monitoring system with ML anomaly detection",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)
app.include_router(report_router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Motor Monitoring Backend API",
        "version": "1.0.0",
        "status": "running",
        "mqtt_connected": mqtt_handler.connected if mqtt_handler else False,
        "timestamp": datetime.utcnow().isoformat()
    }

# WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        await websocket.send_json({
            "type": "connection",
            "message": "Connected to Motor Monitoring System",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            # Echo back for now - can be extended for real-time data streaming
            await websocket.send_json({
                "type": "echo",
                "data": data,
                "timestamp": datetime.utcnow().isoformat()
            })
            
    except WebSocketDisconnect:
        print("Client disconnected from WebSocket")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
