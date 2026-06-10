from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime, timezone, timedelta
from backend.database import get_db
from backend import models, schemas
from backend.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _utc(dt):
    return dt.replace(tzinfo=timezone.utc) if dt and dt.tzinfo is None else dt


@router.get("", response_model=List[schemas.NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    opts = [joinedload(models.CheckIn.user), joinedload(models.CheckIn.site)]

    # --- List 1: check-in events (50 most recent by checked_in_at) ---
    recent_checkins = (
        db.query(models.CheckIn)
        .options(*opts)
        .order_by(models.CheckIn.checked_in_at.desc())
        .limit(50)
        .all()
    )
    checkin_events = [
        schemas.NotificationOut(
            id=c.id * 2,
            message=(
                f"🔧 {c.user.name} entered {c.site.name} ({c.site.site_id})"
                f" — {c.activity_type.value} | Severity: {c.severity.value}"
            ),
            is_read=False,
            created_at=_utc(c.checked_in_at),
        )
        for c in recent_checkins
    ]

    # --- List 2: checkout events (50 most recent by checked_out_at) ---
    recent_checkouts = (
        db.query(models.CheckIn)
        .options(*opts)
        .filter(models.CheckIn.checked_out_at.isnot(None))
        .order_by(models.CheckIn.checked_out_at.desc())
        .limit(50)
        .all()
    )
    checkout_events = []
    for c in recent_checkouts:
        elapsed = int((c.checked_out_at - c.checked_in_at).total_seconds() / 60)
        h, m = divmod(elapsed, 60)
        checkout_events.append(schemas.NotificationOut(
            id=c.id * 2 + 1,
            message=(
                f"✅ {c.user.name} left {c.site.name} ({c.site.site_id})"
                f" — Duration: {h}h {m}m"
            ),
            is_read=False,
            created_at=_utc(c.checked_out_at),
        ))

    # Merge, sort newest-first, cap at 50
    combined = checkin_events + checkout_events
    combined.sort(key=lambda e: e.created_at, reverse=True)
    return combined[:50]


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    count = (
        db.query(models.CheckIn)
        .filter(models.CheckIn.checked_in_at >= since)
        .count()
    )
    return {"count": min(count, 99)}


@router.patch("/read-all")
def mark_all_read(
    _: models.User = Depends(get_current_user),
):
    return {"ok": True}
