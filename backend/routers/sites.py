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
