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
