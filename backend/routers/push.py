import os
import json
import base64
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth import get_current_user, require_admin

logger = logging.getLogger(__name__)

_PRIVATE_KEY_B64 = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = os.getenv("VAPID_SUBJECT", "mailto:habib.mrad.19383@gmail.com")

router = APIRouter(prefix="/push", tags=["push"])


def _get_private_pem() -> str:
    if not _PRIVATE_KEY_B64:
        logger.warning("VAPID_PRIVATE_KEY env var is empty — push disabled")
        return ""
    try:
        pem = base64.b64decode(_PRIVATE_KEY_B64).decode()
        logger.debug("VAPID private key loaded OK (%d chars)", len(pem))
        return pem
    except Exception as exc:
        logger.warning("VAPID_PRIVATE_KEY base64 decode failed (%s) — trying raw", exc)
        return _PRIVATE_KEY_B64


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
    logger.info("Push subscription saved for user %s (endpoint …%s)", current_user.id, body.endpoint[-20:])
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
        logger.error("pywebpush not installed — push notifications disabled")
        return

    subs = db.query(models.PushSubscription).all()
    if not subs:
        logger.debug("No push subscriptions in DB — skipping broadcast")
        return

    logger.info("Sending push '%s' to %d subscription(s)", title, len(subs))
    payload = json.dumps({"title": title, "body": body})
    dead_ids = []

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
            logger.debug("Push sent OK to sub %d", sub.id)
        except Exception as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None)
            body_text = getattr(resp, "text", "") if resp else ""
            logger.error(
                "Push FAILED sub=%d status=%s err=%s body=%s",
                sub.id, status, e, body_text[:200],
            )
            if status in (404, 410):
                dead_ids.append(sub.id)

    for sub_id in dead_ids:
        db.query(models.PushSubscription).filter(
            models.PushSubscription.id == sub_id
        ).delete()
    if dead_ids:
        logger.info("Removed %d dead subscription(s)", len(dead_ids))
        db.commit()


@router.get("/test")
def test_push(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    private_pem = _get_private_pem()
    if not private_pem:
        raise HTTPException(status_code=503, detail="VAPID_PRIVATE_KEY not configured")

    try:
        from pywebpush import webpush
    except ImportError:
        raise HTTPException(status_code=503, detail="pywebpush not installed")

    subs = db.query(models.PushSubscription).all()
    if not subs:
        return {"sent": 0, "total": 0, "detail": "No subscriptions in DB"}

    payload = json.dumps({"title": "🔔 Test Push", "body": "Push notifications are working!"})
    sent = 0
    errors = []

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
            sent += 1
        except Exception as e:
            resp = getattr(e, "response", None)
            status = getattr(resp, "status_code", None)
            body_text = getattr(resp, "text", "")[:200] if resp else str(e)
            errors.append({"sub_id": sub.id, "status": status, "error": body_text})

    return {
        "sent": sent,
        "total": len(subs),
        "errors": errors,
        "vapid_subject": VAPID_SUBJECT,
        "vapid_key_loaded": bool(private_pem),
    }
