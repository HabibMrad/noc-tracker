import asyncio
import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List
from backend.database import get_db
from backend import models, schemas
from backend.auth import get_current_user
from backend.websocket import manager

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/messages", response_model=List[schemas.MessageOut])
def get_messages(
    limit: int = 50,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Message)
        .options(joinedload(models.Message.user))
        .order_by(models.Message.created_at.asc())
        .limit(limit)
        .all()
    )


@router.post("/messages", response_model=schemas.MessageOut, status_code=201)
def send_message(
    payload: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    msg = models.Message(user_id=current_user.id, content=payload.content)
    db.add(msg)
    db.commit()
    db.refresh(msg)

    ws_payload = json.dumps({
        "type": "chat",
        "id": msg.id,
        "user": current_user.name,
        "user_id": current_user.id,
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    })
    try:
        asyncio.get_event_loop().create_task(manager.broadcast_raw(ws_payload))
    except RuntimeError:
        pass

    return db.query(models.Message).options(
        joinedload(models.Message.user)
    ).filter(models.Message.id == msg.id).first()
