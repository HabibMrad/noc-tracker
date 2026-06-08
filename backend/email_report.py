import os
import logging
import smtplib
import ssl
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from sqlalchemy.orm import Session, joinedload
from backend import models

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
REPORT_EMAIL_TO = os.getenv("REPORT_EMAIL_TO", "")
REPORT_EMAIL_FROM = os.getenv("REPORT_EMAIL_FROM", SMTP_USER)


def _fmt(dt):
    if not dt:
        return "—"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%d %b %Y %H:%M UTC")


def _duration(ci, co):
    if not ci or not co:
        return "Active"
    mins = int((co - ci).total_seconds() / 60)
    h, m = divmod(mins, 60)
    return f"{h}h {m}m"


def send_activity_report(db: Session) -> None:
    if not (SMTP_USER and SMTP_PASSWORD and REPORT_EMAIL_TO):
        logger.debug("SMTP credentials not configured — skipping email report")
        return

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    checkins = (
        db.query(models.CheckIn)
        .options(joinedload(models.CheckIn.user), joinedload(models.CheckIn.site))
        .filter(models.CheckIn.checked_in_at >= since)
        .order_by(models.CheckIn.checked_in_at.desc())
        .all()
    )

    if not checkins:
        logger.info("No check-ins in last 24h — skipping email report")
        return

    rows_html = ""
    for c in checkins:
        status = "✅ Checked out" if c.checked_out_at else "🔧 Active"
        rows_html += f"""
        <tr>
          <td>{c.user.name}</td>
          <td>{c.user.company}</td>
          <td>{c.site.name} ({c.site.site_id})</td>
          <td>{c.activity_type.value}</td>
          <td>{c.severity.value}</td>
          <td>{_fmt(c.checked_in_at)}</td>
          <td>{_fmt(c.checked_out_at)}</td>
          <td>{_duration(c.checked_in_at, c.checked_out_at)}</td>
          <td>{status}</td>
        </tr>"""

    html = f"""
    <html><body style="font-family:Arial,sans-serif;font-size:13px;">
    <h2 style="color:#2563eb;">NOC Site Access Report — Last 24 Hours</h2>
    <p>Generated: {_fmt(datetime.now(timezone.utc))} &nbsp;|&nbsp; Total events: {len(checkins)}</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;">
      <thead style="background:#2563eb;color:white;">
        <tr>
          <th>Employee</th><th>Company</th><th>Site</th><th>Activity</th>
          <th>Severity</th><th>Check-in</th><th>Check-out</th><th>Duration</th><th>Status</th>
        </tr>
      </thead>
      <tbody>{rows_html}</tbody>
    </table>
    <p style="color:#6b7280;font-size:11px;margin-top:16px;">Touch Lebanon NOC Site Access Tracker</p>
    </body></html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"NOC Activity Report — {len(checkins)} events in last 24h"
    msg["From"] = REPORT_EMAIL_FROM
    msg["To"] = REPORT_EMAIL_TO
    msg.attach(MIMEText(html, "html"))

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls(context=ctx)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(REPORT_EMAIL_FROM, REPORT_EMAIL_TO.split(","), msg.as_string())
        logger.info("Activity report sent to %s (%d events)", REPORT_EMAIL_TO, len(checkins))
    except Exception as e:
        logger.error("Failed to send activity report: %s", e)
    finally:
        db.close()
