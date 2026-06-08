import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone
from backend.database import get_db
from backend import models, schemas
from backend.auth import get_current_user
from backend.websocket import manager
from backend.routers.push import send_push_to_all

router = APIRouter(prefix="/checkins", tags=["checkins"])

_FORMULA_CHARS = frozenset("=+-@\t\r")

def _csv_safe(value) -> str:
    s = str(value) if value is not None else ""
    return "'" + s if s and s[0] in _FORMULA_CHARS else s


@router.post("", response_model=schemas.CheckInOut, status_code=201)
def create_checkin(
    payload: schemas.CheckInCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role == models.UserRole.noc_handler:
        raise HTTPException(status_code=403, detail="NOC handlers cannot perform check-in/out")
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
    # Broadcast to all WebSocket clients and persist notification for all users
    all_users = db.query(models.User).all()
    msg = (
        f"🔧 {current_user.name} entered {site.name} ({site.site_id})"
        f" — {checkin.activity_type.value} | Severity: {checkin.severity.value}"
    )
    for u in all_users:
        db.add(models.Notification(user_id=u.id, message=msg))
    db.commit()
    import asyncio
    try:
        asyncio.get_event_loop().create_task(manager.broadcast(msg))
    except RuntimeError:
        pass  # no running event loop in sync context (tests)
    send_push_to_all(db, "🔧 Site Entry", f"{current_user.name} entered {site.name} — {checkin.activity_type.value}")
    return db.query(models.CheckIn).options(
        joinedload(models.CheckIn.user), joinedload(models.CheckIn.site)
    ).filter(models.CheckIn.id == checkin.id).first()


@router.get("", response_model=List[schemas.CheckInOut])
def list_checkins(
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
            r.id, _csv_safe(r.user.name), _csv_safe(r.user.company),
            _csv_safe(r.site.name), _csv_safe(r.site.site_id), _csv_safe(r.site.region),
            r.activity_type.value, r.severity.value, r.expected_duration,
            r.is_planned_outage, r.is_routine_maintenance, _csv_safe(r.notes or ""),
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


@router.patch("/{checkin_id}/checkout", response_model=schemas.CheckInOut)
def checkout(
    checkin_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role == models.UserRole.noc_handler:
        raise HTTPException(status_code=403, detail="NOC handlers cannot perform check-in/out")
    checkin = db.query(models.CheckIn).filter(models.CheckIn.id == checkin_id).first()
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")
    if checkin.user_id != current_user.id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Cannot check out another user")
    if checkin.checked_out_at:
        raise HTTPException(status_code=400, detail="Already checked out")
    checkin.checked_out_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(checkin)
    checkout_user = db.query(models.User).filter(models.User.id == checkin.user_id).first()
    checkout_site = db.query(models.Site).filter(models.Site.id == checkin.site_id).first()
    elapsed_minutes = 0
    if checkin.checked_out_at and checkin.checked_in_at:
        elapsed_minutes = int((checkin.checked_out_at - checkin.checked_in_at).total_seconds() / 60)
    hours, mins = divmod(elapsed_minutes, 60)
    msg = (
        f"✅ {checkout_user.name} left {checkout_site.name} ({checkout_site.site_id})"
        f" — Duration: {hours}h {mins}m"
    )
    all_users = db.query(models.User).all()
    for u in all_users:
        db.add(models.Notification(user_id=u.id, message=msg))
    db.commit()
    import asyncio
    try:
        asyncio.get_event_loop().create_task(manager.broadcast(msg))
    except RuntimeError:
        pass
    send_push_to_all(db, "✅ Site Exit", f"{checkout_user.name} left {checkout_site.name} — {hours}h {mins}m")
    return db.query(models.CheckIn).options(
        joinedload(models.CheckIn.user), joinedload(models.CheckIn.site)
    ).filter(models.CheckIn.id == checkin.id).first()
