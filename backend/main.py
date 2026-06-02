import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import Base, engine
from backend.routers import users, imports, sites, checkins, notifications, contacts

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NOC Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api")
app.include_router(imports.router, prefix="/api")
app.include_router(sites.router, prefix="/api")
app.include_router(checkins.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(contacts.router, prefix="/api")
