# NOC Site Access Tracker

A full-stack real-time web application for Touch Lebanon NOC to track field technician site access. Built with FastAPI, React, and Docker.

## Features

| Feature | Status |
|---|---|
| Live map + 200 Lebanese sites | ✅ |
| Check-in / Check-out | ✅ |
| Photo evidence with EXIF | ✅ |
| Real-time WebSocket notifications | ✅ |
| Bell notifications (real-time) | ✅ |
| Push notifications (desktop/phone) | ✅ |
| History + filters + CSV export | ✅ |
| Admin dashboard | ✅ |
| Token refresh | ✅ |
| CSV + Excel import | ✅ |
| PWA installable | ✅ |
| Dark mode + Arabic | ✅ |
| Docker deployment | ✅ |
| GitHub | ✅ |

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite, WebSockets
- **Frontend**: React, Vite, Tailwind CSS, Leaflet.js
- **Deployment**: Docker, Docker Compose, Nginx

## Quick Start

### Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Docker (Full Stack)
```bash
cp .env.example .env
docker compose build
docker compose up -d
```

App runs at http://localhost

## First Time Setup

1. Login as admin
2. Go to Import tab
3. Upload `employees.csv` first
4. Upload `sites.csv`
5. Share URL with technicians — they self-register

## Excel / CSV Format

### sites.csv

| Column | Required | Example |
|---|---|---|
| site_id | Yes | BEY-001 |
| name | Yes | Beirut Central |
| region | Yes | Beirut |
| latitude | Yes | 33.8938 |
| longitude | Yes | 35.5018 |

### employees.csv

| Column | Required | Example |
|---|---|---|
| name | Yes | Habib Mrad |
| role | Yes | technician or noc_handler |
| phone | Yes | +961 70 123456 |
| email | Yes | habib@touch.com.lb |
| company | Yes | Touch or PowerTech - IPT |

## Roles

| Role | Permissions |
|---|---|
| admin | Full access — import, user management, stats |
| noc_handler | Check-in/out, dashboard, history, help |
| technician | Check-in/out, dashboard, history, help |

## Environment Variables

| Variable | Description |
|---|---|
| SECRET_KEY | JWT signing key |
| DATABASE_URL | SQLAlchemy DB URL |
| CORS_ORIGINS | Allowed origins |
| VAPID_PRIVATE_KEY | Push notifications |
| VAPID_PUBLIC_KEY | Push notifications |
| VAPID_SUBJECT | Push notifications email |

## Developer

Built by Habib Mrad — Touch Lebanon NOC Automation Engineer
