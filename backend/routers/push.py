import os
import json
import base64
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth import get_current_user

logger = logging.getLogger(__name__)

_PRIVATE_KEY_B64 = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = os.getenv("VAPID_SUBJECT", "mailto:admin@touch.com.lb")

# Decode base64-encoded PEM back to PEM string
def _get_private_pem() -> str:
    if not _PRIVATE_KEY_B64:
        return ""
    try:
        return base64.b64decode(_PRIVATE_KEY_B64).decode()
    except Exception:
        return _PRIVATE_KEY_B64  # already raw PEM

router = APIRouter(prefix="/push", tags=["push"])


class SubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


@router.post("/subscribe", status_code=201)
def subscribe(
    body: SubscribeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing = (
        db.query(models.PushSubscription)
        .filter(models.PushSubscription.endpoint == body.endpoint)
        .first()
    )
    if existing:
        existing.p256dh = body.p256dh
        existing.auth = body.auth
        existing.user_id = current_user.id
    else:
        db.add(models.PushSubscription(
            user_id=current_user.id,
            endpoint=body.endpoint,
            p256dh=body.p256dh,
            auth=body.auth,
        ))
    db.commit()
    return {"ok": True}


@router.delete("/unsubscribe", status_code=204)
def unsubscribe(
    body: SubscribeRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    db.query(models.PushSubscription).filter(
        models.PushSubscription.endpoint == body.endpoint
    ).delete()
    db.commit()


def send_push_to_all(db: Session, title: str, body: str) -> None:
    private_pem = _get_private_pem()
    if not private_pem:
        return
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.warning("pywebpush not installed — skipping push notifications")
        return

    subs = db.query(models.PushSubscription).all()
    dead_ids = []
    payload = json.dumps({"title": title, "body": body})

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=private_pem,
                vapid_claims={"sub": VAPID_SUBJECT},
            )
        except Exception as e:
            status = getattr(getattr(e, "response", None), "status_code", None)
            if status in (404, 410):
                dead_ids.append(sub.id)
            else:
                logger.debug("push failed for sub %s: %s", sub.id, e)

    for sub_id in dead_ids:
        db.query(models.PushSubscription).filter(
            models.PushSubscription.id == sub_id
        ).delete()
    if dead_ids:
        db.commit()
