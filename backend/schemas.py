from pydantic import BaseModel, EmailStr
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
    phone: Optional[str] = None

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
    notes: Optional[str] = None
    checked_in_at: datetime
    checked_out_at: Optional[datetime] = None

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
    email: Optional[str] = None
    role: str
    company: str
    shift: Optional[str] = None

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
