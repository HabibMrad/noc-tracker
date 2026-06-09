import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from backend.database import Base, engine, SessionLocal
from backend.routers import users, imports, sites, checkins, notifications, contacts, photos, admin, push
from backend.websocket import manager
from backend.email_report import send_activity_report

logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)


def _report_job():
    db = SessionLocal()
    try:
        send_activity_report(db)
    except Exception as e:
        logger.error("Scheduled report failed: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = BackgroundScheduler()
    scheduler.add_job(_report_job, CronTrigger(hour=0, minute=0), id="report_midnight")
    scheduler.add_job(_report_job, CronTrigger(hour=8, minute=0), id="report_morning")
    scheduler.add_job(_report_job, CronTrigger(hour=16, minute=0), id="report_afternoon")
    scheduler.start()
    logger.info("APScheduler started — email reports at 00:00, 08:00, 16:00")
    yield
    scheduler.shutdown(wait=False)
    logger.info("APScheduler stopped")


app = FastAPI(title="NOC Tracker API", version="1.0.0", lifespan=lifespan)

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
