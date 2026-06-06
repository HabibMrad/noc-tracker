from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend import models, schemas
from backend.auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=List[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    return db.query(models.User).all()


@router.patch("/users/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    body: schemas.AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    if body.is_active is False and user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if body.role is not None:
        try:
            target.role = models.UserRole(body.role)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {body.role}")
    if body.is_active is not None:
        target.is_active = body.is_active

    db.commit()
    db.refresh(target)
    return target


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(target)
    db.commit()


@router.get("/stats", response_model=schemas.AdminStats)
def get_stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    total_users = db.query(func.count(models.User.id)).scalar()
    total_sites = db.query(func.count(models.Site.id)).scalar()
    active_checkins = (
        db.query(func.count(models.CheckIn.id))
        .filter(models.CheckIn.checked_out_at.is_(None))
        .scalar()
    )

    role_rows = (
        db.query(models.User.role, func.count(models.User.id))
        .group_by(models.User.role)
        .all()
    )
    users_by_role = {row[0].value: row[1] for row in role_rows}

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    checkins_today = (
        db.query(func.count(models.CheckIn.id))
        .filter(models.CheckIn.checked_in_at >= today_start)
        .scalar()
    )

    top_rows = (
        db.query(models.Site, func.count(models.CheckIn.id).label("total"))
        .join(models.CheckIn, models.CheckIn.site_id == models.Site.id, isouter=True)
        .group_by(models.Site.id)
        .order_by(func.count(models.CheckIn.id).desc())
        .limit(5)
        .all()
    )
    top_active_sites = [
        schemas.TopSite(site_id=site.site_id, name=site.name, total_checkins=total)
        for site, total in top_rows
    ]

    return schemas.AdminStats(
        total_users=total_users,
        total_sites=total_sites,
        active_checkins=active_checkins,
        users_by_role=users_by_role,
        checkins_today=checkins_today,
        top_active_sites=top_active_sites,
    )
