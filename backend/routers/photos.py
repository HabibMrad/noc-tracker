import io
import os
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload

from backend import models, schemas
from backend.auth import get_current_user
from backend.database import get_db
from backend.photo_utils import UPLOADS_DIR, extract_exif, haversine_km

router = APIRouter(tags=["photos"])

MAX_PHOTOS = 5
MAX_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/heic"}


@router.post(
    "/checkins/{checkin_id}/photos",
    response_model=List[schemas.SitePhotoOut],
    status_code=201,
)
async def upload_photos(
    checkin_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    checkin = (
        db.query(models.CheckIn)
        .options(joinedload(models.CheckIn.site))
        .filter(models.CheckIn.id == checkin_id)
        .first()
    )
    if not checkin:
        raise HTTPException(404, "Check-in not found")
    if checkin.user_id != current_user.id and current_user.role != models.UserRole.noc_handler:
        raise HTTPException(403, "Not authorized to upload photos for this check-in")

    existing_count = (
        db.query(models.SitePhoto)
        .filter(models.SitePhoto.checkin_id == checkin_id)
        .count()
    )
    if existing_count + len(files) > MAX_PHOTOS:
        raise HTTPException(
            400,
            f"Max {MAX_PHOTOS} photos per check-in. Currently have {existing_count}.",
        )

    os.makedirs(UPLOADS_DIR, exist_ok=True)
    results = []

    for upload in files:
        content = await upload.read()

        if len(content) > MAX_SIZE:
            raise HTTPException(400, "File exceeds 10MB limit")

        if upload.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                400,
                f"File type '{upload.content_type}' not allowed. Use JPEG, PNG, or HEIC.",
            )

        try:
            from PIL import Image as PILImage
            pil_img = PILImage.open(io.BytesIO(content))
            pil_img.verify()
        except Exception:
            raise HTTPException(400, "Invalid image file")

        exif = extract_exif(content)
        now = datetime.now(timezone.utc)
        uid = uuid.uuid4().hex[:8]
        filename = f"{checkin_id}_{int(now.timestamp())}_{uid}.jpg"
        filepath = os.path.join(UPLOADS_DIR, filename)

        with open(filepath, "wb") as fh:
            fh.write(content)

        distance = None
        if exif["lat"] is not None and exif["lng"] is not None:
            distance = haversine_km(
                exif["lat"], exif["lng"],
                checkin.site.latitude, checkin.site.longitude,
            )

        photo = models.SitePhoto(
            checkin_id=checkin_id,
            filename=filename,
            original_name=upload.filename or "photo.jpg",
            file_size=len(content),
            taken_at=exif["taken_at"] or now,
            exif_lat=exif["lat"],
            exif_lng=exif["lng"],
            exif_device=exif["device"],
            distance_from_site=round(distance, 3) if distance is not None else None,
        )
        db.add(photo)
        db.commit()
        db.refresh(photo)
        results.append(photo)

    return results


@router.get("/checkins/{checkin_id}/photos", response_model=List[schemas.SitePhotoOut])
def list_photos(
    checkin_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    if not db.query(models.CheckIn).filter(models.CheckIn.id == checkin_id).first():
        raise HTTPException(404, "Check-in not found")
    return (
        db.query(models.SitePhoto)
        .filter(models.SitePhoto.checkin_id == checkin_id)
        .order_by(models.SitePhoto.created_at.asc())
        .all()
    )


@router.get("/photos/{filename}")
def serve_photo(
    filename: str,
    db: Session = Depends(get_db),
):
    photo = db.query(models.SitePhoto).filter(models.SitePhoto.filename == filename).first()
    if not photo:
        raise HTTPException(404, "Photo not found")
    filepath = os.path.join(UPLOADS_DIR, filename)
    if not os.path.isfile(filepath):
        raise HTTPException(404, "Photo file missing from storage")
    return FileResponse(filepath, media_type="image/jpeg")


@router.delete("/photos/{photo_id}", status_code=204)
def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    photo = db.query(models.SitePhoto).filter(models.SitePhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(404, "Photo not found")
    checkin = db.query(models.CheckIn).filter(models.CheckIn.id == photo.checkin_id).first()
    if checkin.user_id != current_user.id and current_user.role != models.UserRole.noc_handler:
        raise HTTPException(403, "Not authorized to delete this photo")
    filepath = os.path.join(UPLOADS_DIR, photo.filename)
    if os.path.isfile(filepath):
        os.remove(filepath)
    db.delete(photo)
    db.commit()
