# NOC Site Access Tracker — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the FastAPI backend with SQLite, JWT auth, Excel import, check-in/out lifecycle, WebSocket broadcast, and REST API.

**Architecture:** Single FastAPI app, SQLAlchemy 2 ORM on SQLite, JWT via python-jose, WebSocket connection manager for real-time broadcast, openpyxl for Excel parsing. All routers under `/api` prefix.

**Tech Stack:** Python 3.11, FastAPI 0.111, SQLAlchemy 2.0, Pydantic v2, python-jose[cryptography], passlib[bcrypt], openpyxl 3.1, python-multipart, pytest, httpx

---

## File Map

| File | Responsibility |
|------|---------------|
| `backend/database.py` | Engine, SessionLocal, Base, `get_db` dependency |
| `backend/models.py` | ORM: User, Site, CheckIn, Notification, Contact + enums |
| `backend/schemas.py` | Pydantic v2 request/response models |
| `backend/auth.py` | bcrypt, JWT create/decode, `get_current_user`, `require_noc` |
| `backend/websocket.py` | `ConnectionManager` — broadcast to all active WS connections |
| `backend/import_excel.py` | openpyxl parse + DB upsert for sites and employees |
| `backend/routers/users.py` | POST /register, POST /login, GET /me, POST /refresh |
| `backend/routers/sites.py` | GET /sites, GET /sites/nearest |
| `backend/routers/checkins.py` | POST /checkins, PATCH /checkins/{id}/checkout, GET /checkins |
| `backend/routers/notifications.py` | GET /notifications, PATCH /notifications/read-all |
| `backend/routers/contacts.py` | GET /contacts |
| `backend/routers/imports.py` | POST /import/sites, POST /import/employees |
| `backend/main.py` | App factory, CORS, router registration, WS endpoint |
| `backend/tests/conftest.py` | In-memory SQLite fixture, TestClient |
| `backend/tests/test_auth.py` | Registration gating, login, JWT |
| `backend/tests/test_import.py` | Excel parse + upsert |
| `backend/tests/test_checkins.py` | Check-in, check-out, active sessions |
| `backend/tests/test_notifications.py` | Notification creation + mark-read |
| `backend/requirements.txt` | Pinned dependencies |

---

## Task 1: Project Scaffold & Dependencies

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/__init__.py`
- Create: `backend/routers/__init__.py`
- Create: `backend/tests/__init__.py`

- [ ] **Step 1: Create directory structure**

```powershell
mkdir noc-tracker\backend\routers
mkdir noc-tracker\backend\tests
New-Item noc-tracker\backend\__init__.py -ItemType File
New-Item noc-tracker\backend\routers\__init__.py -ItemType File
New-Item noc-tracker\backend\tests\__init__.py -ItemType File
```

- [ ] **Step 2: Write requirements.txt**

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
pydantic[email]==2.7.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
openpyxl==3.1.2
python-multipart==0.0.9
python-dotenv==1.0.1
pytest==8.2.0
httpx==0.27.0
pytest-asyncio==0.23.6
```

- [ ] **Step 3: Install dependencies**

```bash
cd noc-tracker/backend
pip install -r requirements.txt
```

Expected: all packages install without error.

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "feat: scaffold backend structure and dependencies"
```

---

## Task 2: Database Setup

**Files:**
- Create: `backend/database.py`

- [ ] **Step 1: Write database.py**

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./noc.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 2: Verify import**

```bash
cd noc-tracker/backend
python -c "from database import Base, get_db; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/database.py
git commit -m "feat: database engine and session setup"
```

---

## Task 3: ORM Models

**Files:**
- Create: `backend/models.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Write failing model import test**

```python
# backend/tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from backend.database import Base, get_db

TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def client(db):
    from backend.main import app
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

```python
# backend/tests/test_auth.py
def test_models_importable():
    from backend import models
    assert hasattr(models, "User")
    assert hasattr(models, "Site")
    assert hasattr(models, "CheckIn")
    assert hasattr(models, "Notification")
    assert hasattr(models, "Contact")
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd noc-tracker
pytest backend/tests/test_auth.py::test_models_importable -v
```

Expected: `FAILED` — `ModuleNotFoundError`

- [ ] **Step 3: Write models.py**

```python
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, JSON, Enum as SAEnum, ForeignKey
)
from sqlalchemy.orm import relationship
from backend.database import Base


class UserRole(str, enum.Enum):
    technician = "technician"
    noc_handler = "noc_handler"


class ActivityType(str, enum.Enum):
    maintenance = "Maintenance"
    emergency = "Emergency"
    inspection = "Inspection"
    installation = "Installation"
    other = "Other"


class Severity(str, enum.Enum):
    low = "Low"
    medium = "Medium"
    high = "High"
    critical = "Critical"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(SAEnum(UserRole), nullable=False)
    company = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    checkins = relationship("CheckIn", back_populates="user")
    notifications = relationship("Notification", back_populates="user")


class Site(Base):
    __tablename__ = "sites"
    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    region = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    checkins = relationship("CheckIn", back_populates="site")


class CheckIn(Base):
    __tablename__ = "checkins"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    activity_type = Column(SAEnum(ActivityType), nullable=False)
    severity = Column(SAEnum(Severity), nullable=False)
    affected_sites = Column(JSON, default=list)
    expected_duration = Column(Float, nullable=False)
    is_planned_outage = Column(Boolean, default=False)
    is_routine_maintenance = Column(Boolean, default=False)
    notes = Column(String, nullable=True)
    checked_in_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    checked_out_at = Column(DateTime, nullable=True)
    user = relationship("User", back_populates="checkins")
    site = relationship("Site", back_populates="checkins")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="notifications")


class Contact(Base):
    __tablename__ = "contacts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)
    role = Column(String, nullable=False)
    company = Column(String, nullable=False)
    shift = Column(String, nullable=True)
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pytest backend/tests/test_auth.py::test_models_importable -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/models.py backend/tests/conftest.py backend/tests/test_auth.py
git commit -m "feat: ORM models for User, Site, CheckIn, Notification, Contact"
```

---

## Task 4: Pydantic Schemas

**Files:**
- Create: `backend/schemas.py`

- [ ] **Step 1: Write schemas.py**

```python
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from backend.models import UserRole, ActivityType, Severity


# --- Auth ---
class RegisterRequest(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    name: str
    username: str
    email: str
    role: UserRole
    company: str
    phone: Optional[str]

    model_config = {"from_attributes": True}


# --- Sites ---
class SiteOut(BaseModel):
    id: int
    site_id: str
    name: str
    region: str
    latitude: float
    longitude: float

    model_config = {"from_attributes": True}


class SiteNearestOut(SiteOut):
    distance_km: float


# --- CheckIn ---
class CheckInCreate(BaseModel):
    site_id: int
    activity_type: ActivityType
    severity: Severity
    affected_sites: List[str] = []
    expected_duration: float
    is_planned_outage: bool = False
    is_routine_maintenance: bool = False
    notes: Optional[str] = None


class CheckInOut(BaseModel):
    id: int
    user: UserOut
    site: SiteOut
    activity_type: ActivityType
    severity: Severity
    affected_sites: List[str]
    expected_duration: float
    is_planned_outage: bool
    is_routine_maintenance: bool
    notes: Optional[str]
    checked_in_at: datetime
    checked_out_at: Optional[datetime]

    model_config = {"from_attributes": True}


# --- Notifications ---
class NotificationOut(BaseModel):
    id: int
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Contacts ---
class ContactOut(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str]
    role: str
    company: str
    shift: Optional[str]

    model_config = {"from_attributes": True}


# --- Import ---
class ImportPreview(BaseModel):
    headers: List[str]
    rows: List[List[str]]
    total_rows: int


class ImportResult(BaseModel):
    inserted: int
    updated: int
    skipped: int
```

- [ ] **Step 2: Verify import**

```bash
python -c "from backend.schemas import RegisterRequest, CheckInCreate, CheckInOut; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/schemas.py
git commit -m "feat: Pydantic v2 schemas for all endpoints"
```

---

## Task 5: Auth Utilities

**Files:**
- Create: `backend/auth.py`

- [ ] **Step 1: Write failing test**

```python
# append to backend/tests/test_auth.py
def test_password_hash_and_verify():
    from backend.auth import hash_password, verify_password
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)

def test_create_and_decode_access_token():
    from backend.auth import create_access_token, SECRET_KEY, ALGORITHM
    from jose import jwt
    token = create_access_token({"sub": "42"})
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "42"
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pytest backend/tests/test_auth.py::test_password_hash_and_verify -v
```

Expected: `FAILED` — `ModuleNotFoundError: No module named 'backend.auth'`

- [ ] **Step 3: Write auth.py**

```python
import os
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({**data, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode({**data, "exp": expire, "type": "refresh"}, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise exc
    except JWTError:
        raise exc
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise exc
    return user


def require_noc_handler(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != models.UserRole.noc_handler:
        raise HTTPException(status_code=403, detail="NOC handler role required")
    return current_user
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pytest backend/tests/test_auth.py::test_password_hash_and_verify backend/tests/test_auth.py::test_create_and_decode_access_token -v
```

Expected: both `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/auth.py
git commit -m "feat: JWT and bcrypt auth utilities"
```

---

## Task 6: Users Router (Register & Login)

**Files:**
- Create: `backend/routers/users.py`
- Modify: `backend/tests/test_auth.py`

The registration flow: user POSTs `{name, username, email, password}` → backend checks that `name` exists in the `employees` table (imported from Excel). If not found → 403. If found → create User with role/company/phone from the Employee row.

- [ ] **Step 1: Write failing tests**

```python
# append to backend/tests/test_auth.py
from backend import models
from backend.auth import hash_password

def _seed_employee(db, name="Habib Mrad", role="technician", company="Touch", phone="+961 70 000000"):
    contact = models.Contact(name=name, phone=phone, email=f"{name}@touch.com", role=role, company=company)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

def test_register_succeeds_when_name_in_allowlist(client, db):
    _seed_employee(db)
    resp = client.post("/api/auth/register", json={
        "name": "Habib Mrad",
        "username": "habib",
        "email": "habib@test.com",
        "password": "pass1234"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "habib"
    assert data["role"] == "technician"
    assert data["company"] == "Touch"

def test_register_blocked_when_name_not_in_allowlist(client, db):
    resp = client.post("/api/auth/register", json={
        "name": "Unknown Person",
        "username": "unknown",
        "email": "x@test.com",
        "password": "pass1234"
    })
    assert resp.status_code == 403

def test_login_returns_tokens(client, db):
    _seed_employee(db)
    client.post("/api/auth/register", json={
        "name": "Habib Mrad", "username": "habib",
        "email": "habib@test.com", "password": "pass1234"
    })
    resp = client.post("/api/auth/login", json={"username": "habib", "password": "pass1234"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()

def test_login_fails_wrong_password(client, db):
    _seed_employee(db)
    client.post("/api/auth/register", json={
        "name": "Habib Mrad", "username": "habib",
        "email": "habib@test.com", "password": "pass1234"
    })
    resp = client.post("/api/auth/login", json={"username": "habib", "password": "wrong"})
    assert resp.status_code == 401
```

- [ ] **Step 2: Create minimal main.py so TestClient works**

```python
# backend/main.py  (stub — will be expanded in Task 14)
from fastapi import FastAPI
app = FastAPI()
```

- [ ] **Step 3: Run — expect FAIL (404)**

```bash
pytest backend/tests/test_auth.py -k "register or login" -v
```

Expected: `FAILED` — 404 (routes not registered)

- [ ] **Step 4: Write routers/users.py**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models, schemas
from backend.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    contact = db.query(models.Contact).filter(
        models.Contact.name == payload.name
    ).first()
    if not contact:
        raise HTTPException(status_code=403, detail="Name not in approved employee list")
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Username already taken")
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = models.User(
        name=payload.name,
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=models.UserRole(contact.role),
        company=contact.company,
        phone=contact.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return schemas.TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user
```

- [ ] **Step 5: Update main.py to register router**

```python
# backend/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import Base, engine
from backend.routers import users

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
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
pytest backend/tests/test_auth.py -k "register or login" -v
```

Expected: all 4 `PASSED`

- [ ] **Step 7: Commit**

```bash
git add backend/routers/users.py backend/main.py backend/tests/test_auth.py
git commit -m "feat: user registration (allowlist-gated) and JWT login"
```

---

## Task 7: Excel Import — Sites & Employees

**Files:**
- Create: `backend/import_excel.py`
- Create: `backend/routers/imports.py`
- Create: `backend/tests/test_import.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_import.py
import io
import openpyxl
from fastapi.testclient import TestClient


def _make_sites_xlsx():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["site_id", "name", "region", "latitude", "longitude"])
    ws.append(["BEY-001", "Beirut Central", "Beirut", 33.8938, 35.5018])
    ws.append(["TYR-001", "Tyre South", "South", 33.2705, 35.2038])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def _make_employees_xlsx():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["name", "role", "phone", "email", "company"])
    ws.append(["Habib Mrad", "technician", "+961 70 111111", "habib@touch.com", "Touch"])
    ws.append(["Noc Handler", "noc_handler", "+961 70 222222", "noc@touch.com", "Touch"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def _noc_token(client, db):
    from backend import models
    from backend.auth import hash_password
    noc = models.User(
        name="Noc Handler", username="noc", email="noc@test.com",
        password_hash=hash_password("pass"), role=models.UserRole.noc_handler,
        company="Touch", phone=None,
    )
    db.add(noc)
    db.commit()
    db.refresh(noc)
    resp = client.post("/api/auth/login", json={"username": "noc", "password": "pass"})
    return resp.json()["access_token"]


def test_import_sites_preview(client, db):
    token = _noc_token(client, db)
    buf = _make_sites_xlsx()
    resp = client.post(
        "/api/import/sites/preview",
        files={"file": ("sites.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_rows"] == 2
    assert "site_id" in data["headers"]


def test_import_sites_confirm(client, db):
    token = _noc_token(client, db)
    buf = _make_sites_xlsx()
    resp = client.post(
        "/api/import/sites/confirm",
        files={"file": ("sites.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        params={"mode": "skip"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    result = resp.json()
    assert result["inserted"] == 2
    assert result["skipped"] == 0


def test_import_employees_confirm(client, db):
    token = _noc_token(client, db)
    buf = _make_employees_xlsx()
    resp = client.post(
        "/api/import/employees/confirm",
        files={"file": ("emp.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        params={"mode": "update"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["inserted"] == 2
```

- [ ] **Step 2: Run — expect FAIL (404)**

```bash
pytest backend/tests/test_import.py -v
```

- [ ] **Step 3: Write import_excel.py**

```python
import openpyxl
from io import BytesIO
from typing import Literal
from sqlalchemy.orm import Session
from backend import models, schemas


def _load_rows(content: bytes) -> tuple[list[str], list[list]]:
    wb = openpyxl.load_workbook(BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    headers = [str(h).strip() for h in rows[0]]
    return headers, [list(r) for r in rows[1:]]


def preview_xlsx(content: bytes) -> schemas.ImportPreview:
    headers, rows = _load_rows(content)
    preview_rows = [[str(c) if c is not None else "" for c in r] for r in rows[:20]]
    return schemas.ImportPreview(headers=headers, rows=preview_rows, total_rows=len(rows))


def import_sites(content: bytes, db: Session, mode: Literal["skip", "update"]) -> schemas.ImportResult:
    headers, rows = _load_rows(content)
    idx = {h: i for i, h in enumerate(headers)}
    inserted = updated = skipped = 0
    for row in rows:
        site_id = str(row[idx["site_id"]]).strip()
        existing = db.query(models.Site).filter(models.Site.site_id == site_id).first()
        if existing:
            if mode == "update":
                existing.name = str(row[idx["name"]])
                existing.region = str(row[idx["region"]])
                existing.latitude = float(row[idx["latitude"]])
                existing.longitude = float(row[idx["longitude"]])
                updated += 1
            else:
                skipped += 1
        else:
            db.add(models.Site(
                site_id=site_id,
                name=str(row[idx["name"]]),
                region=str(row[idx["region"]]),
                latitude=float(row[idx["latitude"]]),
                longitude=float(row[idx["longitude"]]),
            ))
            inserted += 1
    db.commit()
    return schemas.ImportResult(inserted=inserted, updated=updated, skipped=skipped)


def import_employees(content: bytes, db: Session, mode: Literal["skip", "update"]) -> schemas.ImportResult:
    headers, rows = _load_rows(content)
    idx = {h: i for i, h in enumerate(headers)}
    inserted = updated = skipped = 0
    for row in rows:
        name = str(row[idx["name"]]).strip()
        existing = db.query(models.Contact).filter(models.Contact.name == name).first()
        if existing:
            if mode == "update":
                existing.role = str(row[idx["role"]])
                existing.phone = str(row[idx["phone"]])
                existing.email = str(row[idx["email"]]) if row[idx["email"]] else None
                existing.company = str(row[idx["company"]])
                updated += 1
            else:
                skipped += 1
        else:
            db.add(models.Contact(
                name=name,
                role=str(row[idx["role"]]),
                phone=str(row[idx["phone"]]),
                email=str(row[idx["email"]]) if row[idx["email"]] else None,
                company=str(row[idx["company"]]),
            ))
            inserted += 1
    db.commit()
    return schemas.ImportResult(inserted=inserted, updated=updated, skipped=skipped)
```

- [ ] **Step 4: Write routers/imports.py**

```python
from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import Literal
from backend.database import get_db
from backend import schemas
from backend.auth import require_noc_handler
from backend import import_excel

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/sites/preview", response_model=schemas.ImportPreview)
async def preview_sites(
    file: UploadFile = File(...),
    _=Depends(require_noc_handler),
):
    content = await file.read()
    return import_excel.preview_xlsx(content)


@router.post("/sites/confirm", response_model=schemas.ImportResult)
async def confirm_sites(
    file: UploadFile = File(...),
    mode: Literal["skip", "update"] = Query("skip"),
    db: Session = Depends(get_db),
    _=Depends(require_noc_handler),
):
    content = await file.read()
    return import_excel.import_sites(content, db, mode)


@router.post("/employees/preview", response_model=schemas.ImportPreview)
async def preview_employees(
    file: UploadFile = File(...),
    _=Depends(require_noc_handler),
):
    content = await file.read()
    return import_excel.preview_xlsx(content)


@router.post("/employees/confirm", response_model=schemas.ImportResult)
async def confirm_employees(
    file: UploadFile = File(...),
    mode: Literal["skip", "update"] = Query("skip"),
    db: Session = Depends(get_db),
    _=Depends(require_noc_handler),
):
    content = await file.read()
    return import_excel.import_employees(content, db, mode)
```

- [ ] **Step 5: Add router to main.py**

```python
# Add to backend/main.py after existing include_router lines:
from backend.routers import imports
app.include_router(imports.router, prefix="/api")
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
pytest backend/tests/test_import.py -v
```

Expected: all 3 `PASSED`

- [ ] **Step 7: Commit**

```bash
git add backend/import_excel.py backend/routers/imports.py backend/main.py backend/tests/test_import.py
git commit -m "feat: Excel import for sites and employees with preview and upsert"
```

---

## Task 8: Sites Router (List + Nearest via Haversine)

**Files:**
- Create: `backend/routers/sites.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_checkins.py
from backend import models
from backend.auth import hash_password

def _seed_sites(db):
    sites = [
        models.Site(site_id="BEY-001", name="Beirut Central", region="Beirut", latitude=33.8938, longitude=35.5018),
        models.Site(site_id="TYR-001", name="Tyre South", region="South", latitude=33.2705, longitude=35.2038),
        models.Site(site_id="TRP-001", name="Tripoli North", region="North", latitude=34.4367, longitude=35.8497),
    ]
    for s in sites:
        db.add(s)
    db.commit()
    return sites

def _make_user(db, role="technician"):
    from backend import models
    contact = models.Contact(name="Test User", phone="+961", email="t@t.com", role=role, company="Touch")
    db.add(contact)
    db.commit()
    user = models.User(
        name="Test User", username="testuser", email="test@test.com",
        password_hash=hash_password("pass"),
        role=models.UserRole(role), company="Touch", phone=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def _login(client, username="testuser", password="pass"):
    resp = client.post("/api/auth/login", json={"username": username, "password": password})
    return resp.json()["access_token"]

def test_list_sites(client, db):
    _seed_sites(db)
    _make_user(db)
    token = _login(client)
    resp = client.get("/api/sites", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 3

def test_nearest_sites(client, db):
    _seed_sites(db)
    _make_user(db)
    token = _login(client)
    # Near Beirut
    resp = client.get(
        "/api/sites/nearest",
        params={"lat": 33.88, "lng": 35.50, "limit": 2},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 2
    assert results[0]["site_id"] == "BEY-001"
    assert results[0]["distance_km"] < 5
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pytest backend/tests/test_checkins.py::test_list_sites backend/tests/test_checkins.py::test_nearest_sites -v
```

- [ ] **Step 3: Write routers/sites.py**

```python
import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend import models, schemas
from backend.auth import get_current_user

router = APIRouter(prefix="/sites", tags=["sites"])


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


@router.get("", response_model=List[schemas.SiteOut])
def list_sites(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Site).order_by(models.Site.name).all()


@router.get("/nearest", response_model=List[schemas.SiteNearestOut])
def nearest_sites(
    lat: float = Query(...),
    lng: float = Query(...),
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    sites = db.query(models.Site).all()
    with_dist = [
        {**schemas.SiteOut.model_validate(s).model_dump(), "distance_km": haversine(lat, lng, s.latitude, s.longitude)}
        for s in sites
    ]
    with_dist.sort(key=lambda x: x["distance_km"])
    return with_dist[:limit]
```

- [ ] **Step 4: Add to main.py**

```python
from backend.routers import sites
app.include_router(sites.router, prefix="/api")
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pytest backend/tests/test_checkins.py::test_list_sites backend/tests/test_checkins.py::test_nearest_sites -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/routers/sites.py backend/main.py backend/tests/test_checkins.py
git commit -m "feat: sites list and nearest-sites endpoint with Haversine"
```

---

## Task 9: Check-In / Check-Out API

**Files:**
- Create: `backend/routers/checkins.py`

- [ ] **Step 1: Write failing tests**

```python
# append to backend/tests/test_checkins.py

def test_checkin_creates_active_session(client, db):
    _seed_sites(db)
    user = _make_user(db)
    token = _login(client)
    site = db.query(models.Site).filter(models.Site.site_id == "BEY-001").first()
    resp = client.post("/api/checkins", json={
        "site_id": site.id,
        "activity_type": "Maintenance",
        "severity": "Low",
        "affected_sites": ["BEY-001"],
        "expected_duration": 2.0,
        "is_planned_outage": False,
        "is_routine_maintenance": True,
        "notes": "Routine check"
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["checked_out_at"] is None
    assert data["site"]["site_id"] == "BEY-001"

def test_checkout_closes_session(client, db):
    _seed_sites(db)
    _make_user(db)
    token = _login(client)
    site = db.query(models.Site).filter(models.Site.site_id == "BEY-001").first()
    checkin_resp = client.post("/api/checkins", json={
        "site_id": site.id, "activity_type": "Maintenance",
        "severity": "Low", "affected_sites": [], "expected_duration": 1.0,
    }, headers={"Authorization": f"Bearer {token}"})
    checkin_id = checkin_resp.json()["id"]
    out_resp = client.patch(f"/api/checkins/{checkin_id}/checkout",
                            headers={"Authorization": f"Bearer {token}"})
    assert out_resp.status_code == 200
    assert out_resp.json()["checked_out_at"] is not None

def test_cannot_checkout_someone_elses_checkin(client, db):
    _seed_sites(db)
    _make_user(db)
    token = _login(client)
    site = db.query(models.Site).filter(models.Site.site_id == "BEY-001").first()
    # Create second user
    contact2 = models.Contact(name="Other User", phone="+961", email="o@o.com", role="technician", company="Touch")
    db.add(contact2)
    db.commit()
    user2 = models.User(
        name="Other User", username="other", email="other@test.com",
        password_hash=hash_password("pass"), role=models.UserRole.technician,
        company="Touch", phone=None,
    )
    db.add(user2)
    db.commit()
    db.refresh(user2)
    checkin = models.CheckIn(
        user_id=user2.id, site_id=site.id,
        activity_type=models.ActivityType.maintenance,
        severity=models.Severity.low, expected_duration=1.0,
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    resp = client.patch(f"/api/checkins/{checkin.id}/checkout",
                        headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403

def test_get_active_checkins(client, db):
    _seed_sites(db)
    _make_user(db)
    token = _login(client)
    site = db.query(models.Site).filter(models.Site.site_id == "BEY-001").first()
    client.post("/api/checkins", json={
        "site_id": site.id, "activity_type": "Maintenance",
        "severity": "Low", "affected_sites": [], "expected_duration": 1.0,
    }, headers={"Authorization": f"Bearer {token}"})
    resp = client.get("/api/checkins?status=active", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 1
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pytest backend/tests/test_checkins.py -k "checkin or checkout or active" -v
```

- [ ] **Step 3: Write routers/checkins.py**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone
from backend.database import get_db
from backend import models, schemas
from backend.auth import get_current_user

router = APIRouter(prefix="/checkins", tags=["checkins"])


@router.post("", response_model=schemas.CheckInOut, status_code=201)
def create_checkin(
    payload: schemas.CheckInCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    site = db.query(models.Site).filter(models.Site.id == payload.site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    checkin = models.CheckIn(
        user_id=current_user.id,
        site_id=site.id,
        activity_type=models.ActivityType(payload.activity_type),
        severity=models.Severity(payload.severity),
        affected_sites=payload.affected_sites,
        expected_duration=payload.expected_duration,
        is_planned_outage=payload.is_planned_outage,
        is_routine_maintenance=payload.is_routine_maintenance,
        notes=payload.notes,
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return db.query(models.CheckIn).options(
        joinedload(models.CheckIn.user), joinedload(models.CheckIn.site)
    ).filter(models.CheckIn.id == checkin.id).first()


@router.patch("/{checkin_id}/checkout", response_model=schemas.CheckInOut)
def checkout(
    checkin_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    checkin = db.query(models.CheckIn).filter(models.CheckIn.id == checkin_id).first()
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")
    if checkin.user_id != current_user.id and current_user.role != models.UserRole.noc_handler:
        raise HTTPException(status_code=403, detail="Cannot check out another user")
    if checkin.checked_out_at:
        raise HTTPException(status_code=400, detail="Already checked out")
    checkin.checked_out_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(checkin)
    return db.query(models.CheckIn).options(
        joinedload(models.CheckIn.user), joinedload(models.CheckIn.site)
    ).filter(models.CheckIn.id == checkin.id).first()


@router.get("", response_model=List[schemas.CheckInOut])
def list_checkins(
    status: Optional[str] = Query(None, regex="^(active|completed)$"),
    employee: Optional[str] = None,
    site_id: Optional[str] = None,
    region: Optional[str] = None,
    activity_type: Optional[str] = None,
    severity: Optional[str] = None,
    company: Optional[str] = None,
    is_planned_outage: Optional[bool] = None,
    is_routine_maintenance: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(models.CheckIn).options(
        joinedload(models.CheckIn.user), joinedload(models.CheckIn.site)
    )
    if status == "active":
        q = q.filter(models.CheckIn.checked_out_at.is_(None))
    elif status == "completed":
        q = q.filter(models.CheckIn.checked_out_at.isnot(None))
    if employee:
        q = q.join(models.User).filter(models.User.name.ilike(f"%{employee}%"))
    if site_id:
        q = q.join(models.Site).filter(models.Site.site_id == site_id)
    if region:
        q = q.join(models.Site).filter(models.Site.region == region)
    if activity_type:
        q = q.filter(models.CheckIn.activity_type == activity_type)
    if severity:
        q = q.filter(models.CheckIn.severity == severity)
    if company:
        q = q.join(models.User).filter(models.User.company == company)
    if is_planned_outage is not None:
        q = q.filter(models.CheckIn.is_planned_outage == is_planned_outage)
    if is_routine_maintenance is not None:
        q = q.filter(models.CheckIn.is_routine_maintenance == is_routine_maintenance)
    if date_from:
        q = q.filter(models.CheckIn.checked_in_at >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.filter(models.CheckIn.checked_in_at <= datetime.fromisoformat(date_to))
    return q.order_by(models.CheckIn.checked_in_at.desc()).offset(skip).limit(limit).all()
```

- [ ] **Step 4: Add to main.py**

```python
from backend.routers import checkins
app.include_router(checkins.router, prefix="/api")
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pytest backend/tests/test_checkins.py -v
```

Expected: all `PASSED`

- [ ] **Step 6: Commit**

```bash
git add backend/routers/checkins.py backend/main.py backend/tests/test_checkins.py
git commit -m "feat: check-in/out API with filtered list endpoint"
```

---

## Task 10: WebSocket Connection Manager + Notifications

**Files:**
- Create: `backend/websocket.py`
- Create: `backend/routers/notifications.py`
- Create: `backend/tests/test_notifications.py`

- [ ] **Step 1: Write websocket.py**

```python
from fastapi import WebSocket
from typing import List
import asyncio


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d)


manager = ConnectionManager()
```

- [ ] **Step 2: Write failing notification tests**

```python
# backend/tests/test_notifications.py
from backend import models
from backend.auth import hash_password

def _make_noc_and_tech(db):
    for name, username, role in [
        ("NOC User", "noc2", "noc_handler"),
        ("Tech User", "tech2", "technician"),
    ]:
        c = models.Contact(name=name, phone="+961", email=f"{username}@t.com", role=role, company="Touch")
        db.add(c)
        db.commit()
        u = models.User(
            name=name, username=username, email=f"{username}@t.com",
            password_hash=hash_password("pass"),
            role=models.UserRole(role), company="Touch", phone=None,
        )
        db.add(u)
    db.commit()

def _token(client, username):
    resp = client.post("/api/auth/login", json={"username": username, "password": "pass"})
    return resp.json()["access_token"]

def _seed_notifications(db, user_id, count=3):
    for i in range(count):
        db.add(models.Notification(user_id=user_id, message=f"Test notification {i}"))
    db.commit()

def test_get_notifications(client, db):
    _make_noc_and_tech(db)
    token = _token(client, "tech2")
    user = db.query(models.User).filter(models.User.username == "tech2").first()
    _seed_notifications(db, user.id, 3)
    resp = client.get("/api/notifications", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 3

def test_unread_count(client, db):
    _make_noc_and_tech(db)
    token = _token(client, "tech2")
    user = db.query(models.User).filter(models.User.username == "tech2").first()
    _seed_notifications(db, user.id, 5)
    resp = client.get("/api/notifications/unread-count", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["count"] == 5

def test_mark_all_read(client, db):
    _make_noc_and_tech(db)
    token = _token(client, "tech2")
    user = db.query(models.User).filter(models.User.username == "tech2").first()
    _seed_notifications(db, user.id, 3)
    resp = client.patch("/api/notifications/read-all", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    count_resp = client.get("/api/notifications/unread-count", headers={"Authorization": f"Bearer {token}"})
    assert count_resp.json()["count"] == 0
```

- [ ] **Step 3: Run — expect FAIL**

```bash
pytest backend/tests/test_notifications.py -v
```

- [ ] **Step 4: Write routers/notifications.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend import models, schemas
from backend.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[schemas.NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id)
        .order_by(models.Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    count = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.is_read == False,
        )
        .count()
    )
    return {"count": count}


@router.patch("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pytest backend/tests/test_notifications.py -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/websocket.py backend/routers/notifications.py backend/tests/test_notifications.py
git commit -m "feat: WebSocket connection manager and notifications API"
```

---

## Task 11: Contacts Router

**Files:**
- Create: `backend/routers/contacts.py`

- [ ] **Step 1: Write routers/contacts.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend import models, schemas
from backend.auth import get_current_user

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=List[schemas.ContactOut])
def list_contacts(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Contact).order_by(models.Contact.name).all()
```

- [ ] **Step 2: Verify with quick test**

```python
# append to backend/tests/test_notifications.py
def test_list_contacts(client, db):
    _make_noc_and_tech(db)
    token = _token(client, "tech2")
    resp = client.get("/api/contacts", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 2
```

```bash
pytest backend/tests/test_notifications.py::test_list_contacts -v
```

Expected: `PASSED`

- [ ] **Step 3: Commit**

```bash
git add backend/routers/contacts.py backend/tests/test_notifications.py
git commit -m "feat: contacts endpoint for Help tab"
```

---

## Task 12: CSV Export Endpoint

**Files:**
- Modify: `backend/routers/checkins.py`

- [ ] **Step 1: Add CSV export to checkins router**

Add this import at top of `backend/routers/checkins.py`:
```python
import csv
import io
from fastapi.responses import StreamingResponse
```

Add this endpoint after `list_checkins`:
```python
@router.get("/export/csv")
def export_csv(
    status: Optional[str] = Query(None),
    employee: Optional[str] = None,
    site_id: Optional[str] = None,
    region: Optional[str] = None,
    activity_type: Optional[str] = None,
    severity: Optional[str] = None,
    company: Optional[str] = None,
    is_planned_outage: Optional[bool] = None,
    is_routine_maintenance: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    # Re-use list_checkins query logic (no pagination)
    q = db.query(models.CheckIn).options(
        joinedload(models.CheckIn.user), joinedload(models.CheckIn.site)
    )
    if status == "active":
        q = q.filter(models.CheckIn.checked_out_at.is_(None))
    elif status == "completed":
        q = q.filter(models.CheckIn.checked_out_at.isnot(None))
    if employee:
        q = q.join(models.User).filter(models.User.name.ilike(f"%{employee}%"))
    if site_id:
        q = q.join(models.Site).filter(models.Site.site_id == site_id)
    if region:
        q = q.join(models.Site).filter(models.Site.region == region)
    if activity_type:
        q = q.filter(models.CheckIn.activity_type == activity_type)
    if severity:
        q = q.filter(models.CheckIn.severity == severity)
    if company:
        q = q.join(models.User).filter(models.User.company == company)
    if is_planned_outage is not None:
        q = q.filter(models.CheckIn.is_planned_outage == is_planned_outage)
    if is_routine_maintenance is not None:
        q = q.filter(models.CheckIn.is_routine_maintenance == is_routine_maintenance)
    if date_from:
        q = q.filter(models.CheckIn.checked_in_at >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.filter(models.CheckIn.checked_in_at <= datetime.fromisoformat(date_to))
    records = q.order_by(models.CheckIn.checked_in_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Employee", "Company", "Site", "Site ID", "Region",
        "Activity", "Severity", "Expected Duration (h)",
        "Planned Outage", "Routine Maintenance", "Notes",
        "Checked In At", "Checked Out At", "Affected Sites"
    ])
    for r in records:
        writer.writerow([
            r.id, r.user.name, r.user.company,
            r.site.name, r.site.site_id, r.site.region,
            r.activity_type.value, r.severity.value, r.expected_duration,
            r.is_planned_outage, r.is_routine_maintenance, r.notes or "",
            r.checked_in_at.isoformat() if r.checked_in_at else "",
            r.checked_out_at.isoformat() if r.checked_out_at else "",
            ",".join(r.affected_sites or []),
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=checkins.csv"},
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/routers/checkins.py
git commit -m "feat: CSV export endpoint for check-in history"
```

---

## Task 13: Final main.py Assembly + WebSocket Endpoint

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Write final main.py**

```python
import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from backend.database import Base, engine, get_db
from backend import models
from backend.auth import get_current_user
from backend.websocket import manager
from backend.routers import users, sites, checkins, notifications, contacts, imports

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
               notifications.router, contacts.router, imports.router]:
    app.include_router(router, prefix="/api")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep connection alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/api/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 2: Wire notification broadcast into check-in and check-out**

In `backend/routers/checkins.py`, add these imports at the top:
```python
from backend.websocket import manager
from backend.database import SessionLocal
```

After `db.commit()` in `create_checkin`, before `return`:
```python
    # Broadcast to all WebSocket clients
    msg = f"🔧 {current_user.name} entered {site.name} ({site.site_id}) — {checkin.activity_type.value} | Severity: {checkin.severity.value}"
    # Persist notification for all users
    all_users = db.query(models.User).all()
    for u in all_users:
        db.add(models.Notification(user_id=u.id, message=msg))
    db.commit()
    import asyncio
    asyncio.create_task(manager.broadcast(msg))
```

After `db.commit()` in `checkout`, before final `return`:
```python
    elapsed_minutes = int((checkin.checked_out_at - checkin.checked_in_at).total_seconds() / 60)
    hours, mins = divmod(elapsed_minutes, 60)
    msg = f"✅ {checkin.user.name} left {checkin.site.name} ({checkin.site.site_id}) — Duration: {hours}h {mins}m"
    all_users = db.query(models.User).all()
    for u in all_users:
        db.add(models.Notification(user_id=u.id, message=msg))
    db.commit()
    import asyncio
    asyncio.create_task(manager.broadcast(msg))
```

- [ ] **Step 3: Run full test suite**

```bash
pytest backend/tests/ -v
```

Expected: all tests `PASSED`

- [ ] **Step 4: Start dev server to verify**

```bash
cd noc-tracker/backend
uvicorn backend.main:app --reload --port 8000
```

Visit `http://localhost:8000/api/health` — should return `{"status": "ok"}`
Visit `http://localhost:8000/docs` — FastAPI Swagger UI should show all routes.

- [ ] **Step 5: Commit**

```bash
git add backend/main.py backend/routers/checkins.py
git commit -m "feat: final backend assembly with WebSocket endpoint and notification broadcast"
```

---

## Backend Complete

All backend tasks done. Run the full suite one final time:

```bash
pytest backend/tests/ -v --tb=short
```

Then confirm `PLANNING-frontend.md` to continue.
