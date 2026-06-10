from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime, timezone, timedelta
from backend.database import get_db
from backend import models, schemas
from backend.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[schemas.NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    # Fetch enough rows so that after emitting up to 2 events per record we can
    # still return 50 combined events sorted by time.
    checkins = (
        db.query(models.CheckIn)
        .options(joinedload(models.CheckIn.user), joinedload(models.CheckIn.site))
        .order_by(models.CheckIn.checked_in_at.desc())
        .limit(50)
        .all()
    )
    events = []
    for c in checkins:
        # Check-in event — always emitted
        checkin_ts = c.checked_in_at
        if checkin_ts.tzinfo is None:
            checkin_ts = checkin_ts.replace(tzinfo=timezone.utc)
        events.append(schemas.NotificationOut(
            id=c.id * 2,
            message=(
                f"🔧 {c.user.name} entered {c.site.name} ({c.site.site_id})"
                f" — {c.activity_type.value} | Severity: {c.severity.value}"
            ),
            is_read=False,
            created_at=checkin_ts,
        ))

        # Checkout event — only when the session is complete
        if c.checked_out_at:
            checkout_ts = c.checked_out_at
            if checkout_ts.tzinfo is None:
                checkout_ts = checkout_ts.replace(tzinfo=timezone.utc)
            elapsed = int((c.checked_out_at - c.checked_in_at).total_seconds() / 60)
            h, m = divmod(elapsed, 60)
            events.append(schemas.NotificationOut(
                id=c.id * 2 + 1,
                message=(
                    f"✅ {c.user.name} left {c.site.name} ({c.site.site_id})"
                    f" — Duration: {h}h {m}m"
                ),
                is_read=False,
                created_at=checkout_ts,
            ))

    events.sort(key=lambda e: e.created_at, reverse=True)
    return events[:50]


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
