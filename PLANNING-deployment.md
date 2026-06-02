# NOC Site Access Tracker — Deployment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the backend and frontend into Docker containers, wire them behind Nginx, and deploy to a VPS (Hostinger) with HTTPS via Let's Encrypt.

**Architecture:** Two containers (`backend` on port 8000, `frontend` served by Nginx on port 80/443) orchestrated by `docker-compose.yml`. A top-level Nginx container handles HTTPS termination, proxies `/api` and `/ws` to the backend, and serves the React build for all other routes.

**Tech Stack:** Docker, Docker Compose v2, Nginx, Certbot (Let's Encrypt), GitHub (for code delivery)

**Prerequisites:** Both PLANNING-backend.md and PLANNING-frontend.md fully complete. VPS with Ubuntu 22.04, a domain name pointed at the VPS IP.

---

## File Map

| File | Responsibility |
|------|---------------|
| `backend/Dockerfile` | Python 3.11-slim image, install deps, run uvicorn |
| `frontend/Dockerfile` | Node 20-slim build stage → nginx:alpine serve stage |
| `nginx/nginx.conf` | Reverse proxy: `/api` + `/ws` → backend, everything else → React build |
| `docker-compose.yml` | Service definitions, volumes, network |
| `docker-compose.prod.yml` | Production overrides (HTTPS, restart policy) |
| `.env.example` | Template for all required env vars |
| `README.md` | Setup, local dev, VPS deploy, Excel format reference |

---

## Task 1: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Write backend/.dockerignore**

```
__pycache__
*.pyc
*.pyo
.pytest_cache
tests/
*.db
.env
```

- [ ] **Step 2: Write backend/Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 3: Build and verify locally**

```bash
cd noc-tracker
docker build -t noc-backend ./backend
docker run --rm -p 8000:8000 -e SECRET_KEY=test123 noc-backend
```

Visit `http://localhost:8000/api/health` — should return `{"status": "ok"}`.

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "feat: backend Dockerfile"
```

---

## Task 2: Frontend Dockerfile

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/.dockerignore`

- [ ] **Step 1: Write frontend/.dockerignore**

```
node_modules
dist
.env
```

- [ ] **Step 2: Write frontend/Dockerfile**

```dockerfile
# --- Build stage ---
FROM node:20-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Serve stage ---
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

- [ ] **Step 3: Write frontend/nginx-spa.conf** (handles React Router client-side routes)

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # API and WebSocket proxy — handled by the outer nginx, not this one
    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}
```

- [ ] **Step 4: Build and verify locally**

```bash
cd noc-tracker
docker build -t noc-frontend ./frontend
docker run --rm -p 3000:80 noc-frontend
```

Visit `http://localhost:3000` — React app loads (will fail API calls without backend, that's expected).

- [ ] **Step 5: Commit**

```bash
git add frontend/Dockerfile frontend/.dockerignore frontend/nginx-spa.conf
git commit -m "feat: frontend multi-stage Dockerfile"
```

---

## Task 3: Nginx Reverse Proxy Config

**Files:**
- Create: `nginx/nginx.conf`
- Create: `nginx/nginx.prod.conf`

- [ ] **Step 1: Write nginx/nginx.conf** (HTTP only — for local docker-compose testing)

```nginx
upstream backend {
    server backend:8000;
}

server {
    listen 80;
    server_name _;

    # WebSocket upgrade
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    # Proxy API to FastAPI
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy WebSocket
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Everything else → React SPA (served by frontend container)
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
    }
}
```

- [ ] **Step 2: Write nginx/nginx.prod.conf** (HTTPS — used on VPS after cert is issued)

```nginx
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:80;
}

map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name YOUR_DOMAIN;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name YOUR_DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
    }
}
```

- [ ] **Step 3: Replace `YOUR_DOMAIN` placeholder before deploying**

When deploying to VPS, run:
```bash
sed -i 's/YOUR_DOMAIN/noc.yourdomain.com/g' nginx/nginx.prod.conf
```

- [ ] **Step 4: Commit**

```bash
git add nginx/
git commit -m "feat: Nginx reverse proxy config for HTTP and HTTPS"
```

---

## Task 4: Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.prod.yml`
- Create: `.env.example`

- [ ] **Step 1: Write .env.example**

```env
# Backend
SECRET_KEY=change-this-to-a-random-64-char-string
DATABASE_URL=sqlite:////data/noc.db
CORS_ORIGINS=http://localhost:5173,https://YOUR_DOMAIN

# Frontend build
VITE_API_URL=/api
```

- [ ] **Step 2: Write docker-compose.yml** (local dev / CI — HTTP only)

```yaml
version: "3.9"

services:
  backend:
    build: ./backend
    environment:
      - SECRET_KEY=${SECRET_KEY:-dev-secret}
      - DATABASE_URL=sqlite:////data/noc.db
      - CORS_ORIGINS=${CORS_ORIGINS:-http://localhost:80}
    volumes:
      - db_data:/data
    networks:
      - noc_net
    restart: unless-stopped

  frontend:
    build: ./frontend
    networks:
      - noc_net
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend
      - frontend
    networks:
      - noc_net
    restart: unless-stopped

volumes:
  db_data:

networks:
  noc_net:
    driver: bridge
```

- [ ] **Step 3: Write docker-compose.prod.yml** (VPS — HTTPS with mounted certs)

```yaml
version: "3.9"

services:
  nginx:
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

On VPS, run with:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

- [ ] **Step 4: Test local full-stack build**

```bash
cd noc-tracker
cp .env.example .env
# Edit .env: set SECRET_KEY to a random string
docker compose build
docker compose up -d
```

Visit `http://localhost` — full app should load.

```bash
curl http://localhost/api/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml docker-compose.prod.yml .env.example
git commit -m "feat: docker-compose for local and production deployment"
```

---

## Task 5: VPS Deployment

**Prerequisites:** VPS with Ubuntu 22.04, domain DNS A record pointing to VPS IP, SSH access.

- [ ] **Step 1: Install Docker on VPS**

```bash
ssh user@YOUR_VPS_IP
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Re-login for group to take effect
```

- [ ] **Step 2: Install Certbot**

```bash
sudo apt update && sudo apt install -y certbot
```

- [ ] **Step 3: Issue SSL certificate**

Stop any process on port 80 first, then:
```bash
sudo certbot certonly --standalone -d YOUR_DOMAIN
```

Expected: cert saved to `/etc/letsencrypt/live/YOUR_DOMAIN/`

- [ ] **Step 4: Clone repo to VPS**

```bash
git clone https://github.com/YOUR_GITHUB/noc-tracker.git
cd noc-tracker
```

- [ ] **Step 5: Create .env on VPS**

```bash
cp .env.example .env
# Edit .env:
#   SECRET_KEY = $(openssl rand -hex 32)
#   CORS_ORIGINS = https://YOUR_DOMAIN
nano .env
```

- [ ] **Step 6: Update nginx.prod.conf with actual domain**

```bash
sed -i 's/YOUR_DOMAIN/noc.yourdomain.com/g' nginx/nginx.prod.conf
```

- [ ] **Step 7: Build and start**

```bash
docker compose build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

- [ ] **Step 8: Verify**

```bash
curl https://YOUR_DOMAIN/api/health
```

Expected: `{"status":"ok"}`

Visit `https://YOUR_DOMAIN` in a browser — app loads over HTTPS.

- [ ] **Step 9: Set up auto-renew for SSL cert**

```bash
(crontab -l; echo "0 3 * * * certbot renew --quiet && docker compose -f /home/user/noc-tracker/docker-compose.yml -f /home/user/noc-tracker/docker-compose.prod.yml restart nginx") | crontab -
```

---

## Task 6: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

```markdown
# NOC Site Access Tracker

Real-time site access tracking for Touch Lebanon NOC. Technicians check in/out of field sites. NOC handlers monitor a live dashboard.

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy 2, SQLite, python-jose, passlib, openpyxl
- **Frontend:** React 18, Vite, Tailwind CSS, react-leaflet, i18next
- **Infra:** Docker Compose, Nginx, Let's Encrypt

---

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173 (proxies /api and /ws to backend)

### Tests

```bash
cd backend && pytest tests/ -v
cd frontend && npm run test
```

---

## Docker (Full Stack Local)

```bash
cp .env.example .env   # set SECRET_KEY
docker compose build
docker compose up -d
```

App: http://localhost

---

## VPS Production Deployment

1. Point DNS A record to VPS IP
2. SSH into VPS, clone repo
3. `sudo certbot certonly --standalone -d YOUR_DOMAIN`
4. `sed -i 's/YOUR_DOMAIN/your.domain.com/g' nginx/nginx.prod.conf`
5. Copy `.env.example` → `.env`, set `SECRET_KEY` and `CORS_ORIGINS`
6. `docker compose build`
7. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`

---

## First-Time Setup (after deployment)

1. Log in as any user → go to **Import** tab (must be NOC handler role)
2. Upload `employees.xlsx` first → this seeds the registration allowlist
3. Upload `sites.xlsx` → this populates the map and check-in form
4. Share the URL with technicians → they self-register (name must match Excel)

---

## Excel File Format

### sites.xlsx

| Column | Required | Example |
|--------|----------|---------|
| `site_id` | Yes | `BEY-001` |
| `name` | Yes | `Beirut Central` |
| `region` | Yes | `Beirut` |
| `latitude` | Yes | `33.8938` |
| `longitude` | Yes | `35.5018` |

### employees.xlsx

| Column | Required | Example |
|--------|----------|---------|
| `name` | Yes | `Habib Mrad` |
| `role` | Yes | `technician` or `noc_handler` |
| `phone` | Yes | `+961 70 123456` |
| `email` | Yes | `habib@touch.com.lb` |
| `company` | Yes | `Touch` or `subcontractor` |

> **Note:** The `name` column is the registration allowlist key. Self-registering users must enter their name exactly as it appears in this file.

---

## Roles

| Role | Permissions |
|------|------------|
| `technician` | Check in/out, view dashboard, view history, view help |
| `noc_handler` | Everything above + Excel import, view all sessions |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `dev-secret` | JWT signing key — **must change in production** |
| `DATABASE_URL` | `sqlite:///./noc.db` | SQLAlchemy DB URL |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with setup, Excel format, and deployment instructions"
```

---

## Task 7: Final Deployment Smoke Test

- [ ] **Step 1: Verify all containers healthy**

```bash
docker compose ps
```

Expected: `backend`, `frontend`, `nginx` all `running`.

- [ ] **Step 2: Health check**

```bash
curl https://YOUR_DOMAIN/api/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 3: WebSocket check**

```bash
# Install wscat: npm install -g wscat
wscat -c wss://YOUR_DOMAIN/ws
```

Expected: connection established (no error).

- [ ] **Step 4: Full golden path on production**

1. Visit `https://YOUR_DOMAIN` — loads over HTTPS
2. Import employees.xlsx and sites.xlsx via Import tab
3. Register as technician → login → dashboard shows Lebanon map with all sites
4. Check in to a site → map shows flashing red marker
5. Open a second browser tab → notification bell increments in real time
6. Check out → marker returns to blue
7. History → filter by site → export CSV → file downloads correctly

- [ ] **Step 5: Tag release**

```bash
git tag v1.0.0
git push origin main --tags
```

---

## Deployment Complete

The NOC Site Access Tracker is live. Three planning files cover the full build:

- `PLANNING-backend.md` — 13 tasks, FastAPI + SQLite + JWT + WebSocket
- `PLANNING-frontend.md` — 14 tasks, React + Leaflet + i18n + all pages
- `PLANNING-deployment.md` — 7 tasks, Docker + Nginx + HTTPS + VPS

**To execute:** Use `superpowers:subagent-driven-development` on each file in order, or `superpowers:executing-plans` for inline execution.
```
