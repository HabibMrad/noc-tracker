# NOC Site Access Tracker — Design Spec
**Date:** 2026-06-02  
**Status:** Approved

---

## 1. Overview

A full-stack web app for Touch Lebanon NOC to track field technician site access in real time. Technicians check in when entering a site and check out when leaving. NOC handlers monitor active sessions on a live dashboard. All employee and site data originates from Excel uploads — no manual data entry.

---

## 2. Architecture

**Option B — Decoupled containers.**

| Container | Technology | Purpose |
|-----------|-----------|---------|
| `backend` | FastAPI + SQLite (SQLAlchemy) | REST API, WebSocket hub, JWT auth, Excel import |
| `frontend` | React + Vite + Tailwind + Leaflet | UI served via Nginx; proxies `/api` and `/ws` to backend |

- Single `docker-compose.yml` for VPS deployment (Hostinger)
- SQLite mounted as Docker volume (data persists across restarts)
- `.env` file for `SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS`, `VITE_API_URL`
- Local dev: `uvicorn --reload` + `vite dev` (no Docker needed)

---

## 3. Data Models

### User
| Field | Type | Notes |
|-------|------|-------|
| id | int PK | |
| name | str | Must match Excel allowlist |
| username | str unique | Self-chosen at registration |
| email | str unique | Self-chosen at registration |
| password_hash | str | bcrypt |
| role | enum | `technician` / `noc_handler` |
| company | str | Touch / subcontractor (from Excel) |
| phone | str | From Excel |

### Site
| Field | Type | Notes |
|-------|------|-------|
| id | int PK | |
| site_id | str unique | From Excel |
| name | str | From Excel |
| region | str | From Excel |
| latitude | float | From Excel |
| longitude | float | From Excel |

### CheckIn
| Field | Type | Notes |
|-------|------|-------|
| id | int PK | |
| user_id | int FK | |
| site_id | int FK | |
| activity_type | enum | Maintenance / Emergency / Inspection / Installation / Other |
| severity | enum | Low / Medium / High / Critical |
| affected_sites | JSON | List of site IDs |
| expected_duration | float | Hours |
| is_planned_outage | bool | |
| is_routine_maintenance | bool | |
| notes | str | Optional |
| checked_in_at | datetime | |
| checked_out_at | datetime | Null = still active |

### Notification
| Field | Type | Notes |
|-------|------|-------|
| id | int PK | |
| user_id | int FK | Recipient |
| message | str | |
| is_read | bool | Default false |
| created_at | datetime | |

### Contact (Help tab — read from Excel, not editable in UI)
| Field | Type | Notes |
|-------|------|-------|
| id | int PK | |
| name | str | |
| phone | str | |
| email | str | |
| role | str | |
| company | str | |
| shift | str | Optional |

---

## 4. User Registration & Auth

- **Self-registration gated by Excel allowlist**: user submits name + username + password + email. Backend checks that `name` exists in the imported Employee table. If not found → 403.
- **JWT**: access token (short-lived, 30 min) + refresh token (7 days), stored in httpOnly cookies.
- **Two roles**: `technician` (check-in/out, view history, view live dashboard), `noc_handler` (all technician permissions + Excel upload, Help tab management).

---

## 5. Excel Import

Two separate upload endpoints, both NOC-handler-only.

**Sites Excel columns:** `site_id`, `name`, `region`, `latitude`, `longitude`  
**Employees Excel columns:** `name`, `role`, `phone`, `email`, `company`

Flow:
1. NOC handler uploads `.xlsx` via UI
2. Backend parses with `openpyxl`, returns preview JSON (first 20 rows)
3. UI shows preview table with a "Confirm Import" button
4. On confirm: upsert rows (skip if exists, update if `update` mode selected via toggle)
5. Import result summary shown (X inserted, Y updated, Z skipped)

---

## 6. Check-In / Check-Out Flow

**Check-in:**
1. Technician searches for site by name or ID, OR taps "Detect Nearest" (GPS → Haversine → top 5)
2. Fills form: activity type, severity, affected sites, expected duration, toggles, notes
3. Submit → saved to DB → WebSocket broadcast: `"🔧 [Name] entered [Site Name] ([Site ID]) — [Activity] | Severity: [X]"`
4. Notification saved to DB for all connected users

**Check-out:**
1. Technician sees their active check-in on dashboard
2. Taps "Check Out" button
3. `checked_out_at` set to now → WebSocket broadcast: `"✅ [Name] left [Site Name] ([Site ID]) — Duration: Xh Ym"`
4. Notification saved to DB for all users

---

## 7. Live Dashboard (Home Page)

**Map section (top):**
- Leaflet.js map bounded to Lebanon
- All imported sites shown as grey pins
- Active check-ins shown as **flashing red markers**
- Click marker → popup with technician name, activity, elapsed time, severity

**Active sessions table (below map):**
- Columns: Technician, Company, Site, Activity, Severity, Checked In At, Expected Duration, Elapsed, Status
- Status = green (within expected duration) / orange (near limit) / red (overdue)
- NOC handler can see all; technician sees all (read-only)

---

## 8. Notifications

- Bell icon in navbar with unread count badge
- Dropdown shows last 20 notifications (newest first)
- WebSocket pushes new notifications in real time to all connected clients
- "Mark all as read" button
- Notifications persisted in DB per user — survive refresh and re-login

---

## 9. History & Filters

Accessible to all roles. Filterable by:
- Employee name
- Company (Touch / subcontractor)
- Site
- Region
- Activity type
- Severity
- Date range
- Planned outage (yes/no)
- Routine maintenance (yes/no)
- Status (active / completed)

Export filtered results to CSV. Pagination (50 rows/page).

---

## 10. Help Tab

- Contact cards: name, phone (click-to-call), email, role, company, shift
- Data read from last imported Employees Excel — no in-app editing
- NOC handler re-uploads Excel to refresh contacts
- All users can view; no role restriction on viewing

---

## 11. Frontend Structure

- **Mobile-first** Tailwind CSS — technicians use phones on-site
- **Dark mode** toggle (saved to localStorage)
- **Bilingual** English/Arabic with a toggle (RTL layout for Arabic)
- **Pages**: Login, Register, Dashboard (Live), Check-In Form, History, Help, Admin (Excel Import)
- **Full form validation** before submit (React Hook Form + Zod)
- Leaflet map lazy-loaded (not needed on auth pages)

---

## 12. Project Structure

```
noc-tracker/
  backend/
    main.py
    models.py
    schemas.py
    auth.py
    websocket.py
    database.py
    import_excel.py
    routers/
      checkins.py
      sites.py
      users.py
      notifications.py
      contacts.py
  frontend/
    src/
      components/
      pages/
      hooks/
      i18n/         ← translations (en, ar)
      App.jsx
  nginx/
    nginx.conf
  docker-compose.yml
  .env.example
  README.md
  docs/superpowers/specs/
```

---

## 13. Excel Column Reference (for README)

### sites.xlsx
| Column | Required | Example |
|--------|----------|---------|
| site_id | Yes | `BEY-001` |
| name | Yes | `Beirut Central` |
| region | Yes | `Beirut` |
| latitude | Yes | `33.8938` |
| longitude | Yes | `35.5018` |

### employees.xlsx
| Column | Required | Example |
|--------|----------|---------|
| name | Yes | `Habib Mrad` |
| role | Yes | `technician` or `noc_handler` |
| phone | Yes | `+961 70 123456` |
| email | Yes | `habib@touch.com.lb` |
| company | Yes | `Touch` or `subcontractor` |
