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
    admin = "admin"


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
    is_active = Column(Boolean, default=True, nullable=False, server_default="1")
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
    photos = relationship("SitePhoto", back_populates="checkin", cascade="all, delete-orphan")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="notifications")


class SitePhoto(Base):
    __tablename__ = "site_photos"
    id = Column(Integer, primary_key=True, index=True)
    checkin_id = Column(Integer, ForeignKey("checkins.id"), nullable=False)
    filename = Column(String, nullable=False, unique=True)
    original_name = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    taken_at = Column(DateTime, nullable=False)
    exif_lat = Column(Float, nullable=True)
    exif_lng = Column(Float, nullable=True)
    exif_device = Column(String, nullable=True)
    distance_from_site = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    checkin = relationship("CheckIn", back_populates="photos")


class Contact(Base):
    __tablename__ = "contacts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)
    role = Column(String, nullable=False)
    company = Column(String, nullable=False)
    shift = Column(String, nullable=True)
