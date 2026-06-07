import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.database import Base, engine
from backend.routers import users, imports, sites, checkins, notifications, contacts, photos, admin, push
from backend.websocket import manager

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NOC Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in [users.router, sites.router, checkins.router,
               notifications.router, contacts.router, imports.router, photos.router,
               admin.router, push.router]:
    app.include_router(router, prefix="/api")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/api/health")
def health():
    return {"status": "ok"}
