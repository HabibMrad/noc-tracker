import io
import os
import pytest
from PIL import Image
import piexif
from backend import models
from backend.auth import hash_password


# ── helpers ──────────────────────────────────────────────────────────────────

def _make_jpeg(with_gps: bool = False, lat: float = 33.8938, lng: float = 35.5018) -> bytes:
    img = Image.new("RGB", (100, 100), color=(200, 100, 50))
    exif_dict: dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}}
    if with_gps:
        def _rat(v):
            d = int(abs(v))
            m = int((abs(v) - d) * 60)
            s = round(((abs(v) - d) * 60 - m) * 60 * 100)
            return ((d, 1), (m, 1), (s, 100))
        exif_dict["GPS"] = {
            piexif.GPSIFD.GPSLatitudeRef: b"N",
            piexif.GPSIFD.GPSLatitude: _rat(lat),
            piexif.GPSIFD.GPSLongitudeRef: b"E",
            piexif.GPSIFD.GPSLongitude: _rat(lng),
        }
        exif_dict["Exif"][piexif.ExifIFD.DateTimeOriginal] = b"2024:01:15 10:30:00"
    exif_bytes = piexif.dump(exif_dict)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif_bytes)
    return buf.getvalue()


def _make_user(db, username="alice", name="Alice", role="technician"):
    contact = models.Contact(name=name, phone="+961", email=f"{username}@t.com", role=role, company="Touch")
    db.add(contact)
    db.commit()
    user = models.User(
        name=name, username=username, email=f"{username}@t.com",
        password_hash=hash_password("pass"),
        role=models.UserRole(role), company="Touch",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _make_site(db):
    site = models.Site(site_id="BEY-001", name="Beirut Central", region="Beirut",
                       latitude=33.8938, longitude=35.5018)
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


def _make_checkin(db, user_id, site_id):
    c = models.CheckIn(
        user_id=user_id, site_id=site_id,
        activity_type=models.ActivityType.maintenance,
        severity=models.Severity.low,
        expected_duration=2.0,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def _login(client, username="alice"):
    resp = client.post("/api/auth/login", json={"username": username, "password": "pass"})
    return resp.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def patch_uploads(tmp_path, monkeypatch):
    monkeypatch.setattr("backend.routers.photos.UPLOADS_DIR", str(tmp_path))


# ── tests ─────────────────────────────────────────────────────────────────────

def test_upload_single_photo(client, db):
    user = _make_user(db)
    site = _make_site(db)
    checkin = _make_checkin(db, user.id, site.id)
    token = _login(client)

    resp = client.post(
        f"/api/checkins/{checkin.id}/photos",
        files=[("files", ("shot.jpg", _make_jpeg(), "image/jpeg"))],
        headers=_auth(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert len(data) == 1
    assert data[0]["checkin_id"] == checkin.id
    assert data[0]["url"].startswith("/api/photos/")
    assert data[0]["filename"].endswith(".jpg")


def test_upload_enforces_max_5_photos(client, db):
    user = _make_user(db)
    site = _make_site(db)
    checkin = _make_checkin(db, user.id, site.id)
    token = _login(client)

    for i in range(5):
        r = client.post(
            f"/api/checkins/{checkin.id}/photos",
            files=[("files", (f"p{i}.jpg", _make_jpeg(), "image/jpeg"))],
            headers=_auth(token),
        )
        assert r.status_code == 201

    r = client.post(
        f"/api/checkins/{checkin.id}/photos",
        files=[("files", ("p5.jpg", _make_jpeg(), "image/jpeg"))],
        headers=_auth(token),
    )
    assert r.status_code == 400
    assert "Max 5" in r.json()["detail"]


def test_non_owner_cannot_upload(client, db):
    _make_user(db, username="owner", name="Owner")
    _make_user(db, username="other", name="Other")
    site = _make_site(db)
    owner = db.query(models.User).filter(models.User.username == "owner").first()
    checkin = _make_checkin(db, owner.id, site.id)
    token = _login(client, username="other")

    resp = client.post(
        f"/api/checkins/{checkin.id}/photos",
        files=[("files", ("x.jpg", _make_jpeg(), "image/jpeg"))],
        headers=_auth(token),
    )
    assert resp.status_code == 403


def test_exif_extraction_returns_coordinates(client, db):
    user = _make_user(db)
    site = _make_site(db)
    checkin = _make_checkin(db, user.id, site.id)
    token = _login(client)

    img_bytes = _make_jpeg(with_gps=True, lat=33.8938, lng=35.5018)
    resp = client.post(
        f"/api/checkins/{checkin.id}/photos",
        files=[("files", ("gps.jpg", img_bytes, "image/jpeg"))],
        headers=_auth(token),
    )
    assert resp.status_code == 201
    data = resp.json()[0]
    assert data["exif_lat"] is not None
    assert abs(data["exif_lat"] - 33.8938) < 0.01
    assert data["exif_lng"] is not None
    assert abs(data["exif_lng"] - 35.5018) < 0.01
    assert data["distance_from_site"] is not None
    assert data["distance_from_site"] < 1.0


def test_photo_served_via_get(client, db):
    user = _make_user(db)
    site = _make_site(db)
    checkin = _make_checkin(db, user.id, site.id)
    token = _login(client)

    upload_resp = client.post(
        f"/api/checkins/{checkin.id}/photos",
        files=[("files", ("img.jpg", _make_jpeg(), "image/jpeg"))],
        headers=_auth(token),
    )
    filename = upload_resp.json()[0]["filename"]

    resp = client.get(f"/api/photos/{filename}", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("image/")


def test_delete_removes_file_and_db_record(client, db, tmp_path):
    user = _make_user(db)
    site = _make_site(db)
    checkin = _make_checkin(db, user.id, site.id)
    token = _login(client)

    upload_resp = client.post(
        f"/api/checkins/{checkin.id}/photos",
        files=[("files", ("del.jpg", _make_jpeg(), "image/jpeg"))],
        headers=_auth(token),
    )
    photo = upload_resp.json()[0]
    photo_id = photo["id"]
    filename = photo["filename"]

    del_resp = client.delete(f"/api/photos/{photo_id}", headers=_auth(token))
    assert del_resp.status_code == 204

    list_resp = client.get(f"/api/checkins/{checkin.id}/photos", headers=_auth(token))
    assert list_resp.json() == []

    assert not os.path.exists(os.path.join(str(tmp_path), filename))


def test_upload_rejects_non_image(client, db):
    user = _make_user(db)
    site = _make_site(db)
    checkin = _make_checkin(db, user.id, site.id)
    token = _login(client)

    resp = client.post(
        f"/api/checkins/{checkin.id}/photos",
        files=[("files", ("doc.pdf", b"%PDF-1.4 fake content", "application/pdf"))],
        headers=_auth(token),
    )
    assert resp.status_code == 400


def test_upload_rejects_oversized_file(client, db):
    user = _make_user(db)
    site = _make_site(db)
    checkin = _make_checkin(db, user.id, site.id)
    token = _login(client)

    big_file = b"X" * (11 * 1024 * 1024)  # 11 MB
    resp = client.post(
        f"/api/checkins/{checkin.id}/photos",
        files=[("files", ("big.jpg", big_file, "image/jpeg"))],
        headers=_auth(token),
    )
    assert resp.status_code == 400
    assert "10MB" in resp.json()["detail"]
