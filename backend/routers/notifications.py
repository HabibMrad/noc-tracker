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
    checkins = (
        db.query(models.CheckIn)
        .options(joinedload(models.CheckIn.user), joinedload(models.CheckIn.site))
        .order_by(models.CheckIn.checked_in_at.desc())
        .limit(50)
        .all()
    )
    result = []
    for c in checkins:
        if c.checked_out_at:
            elapsed = int((c.checked_out_at - c.checked_in_at).total_seconds() / 60)
            h, m = divmod(elapsed, 60)
            msg = (
                f"✅ {c.user.name} left {c.site.name} ({c.site.site_id})"
                f" — Duration: {h}h {m}m"
            )
            ts = c.checked_out_at
        else:
            msg = (
                f"🔧 {c.user.name} entered {c.site.name} ({c.site.site_id})"
                f" — {c.activity_type.value} | Severity: {c.severity.value}"
            )
            ts = c.checked_in_at
        result.append(schemas.NotificationOut(id=c.id, message=msg, is_read=False, created_at=ts))
    return result


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
