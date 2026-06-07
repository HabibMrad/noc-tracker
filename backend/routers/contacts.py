from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend import models, schemas
from backend.auth import get_current_user, require_admin

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=List[schemas.ContactOut])
def list_contacts(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Contact).order_by(models.Contact.name).all()


@router.post("", response_model=schemas.ContactOut, status_code=201)
def create_contact(
    body: schemas.ContactCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    contact = models.Contact(
        name=body.name,
        phone=body.phone,
        email=body.email,
        role=body.role,
        company=body.company,
        shift=body.shift,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=204)
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    contact = db.query(models.Contact).filter(models.Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
