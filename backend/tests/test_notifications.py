from backend import models
from backend.auth import hash_password


def _make_noc_and_tech(db):
    for name, username, role in [
        ("NOC User", "noc2", "noc_handler"),
        ("Tech User", "tech2", "technician"),
    ]:
        c = models.Contact(name=name, phone="+961", email=f"{username}@t.com", role=role, company="Touch")
        db.add(c)
        db.commit()
        u = models.User(
            name=name, username=username, email=f"{username}@t.com",
            password_hash=hash_password("pass"),
            role=models.UserRole(role), company="Touch", phone=None,
        )
        db.add(u)
    db.commit()


def _token(client, username):
    resp = client.post("/api/auth/login", json={"username": username, "password": "pass"})
    return resp.json()["access_token"]


def _seed_notifications(db, user_id, count=3):
    for i in range(count):
        db.add(models.Notification(user_id=user_id, message=f"Test notification {i}"))
    db.commit()


def test_get_notifications(client, db):
    _make_noc_and_tech(db)
    token = _token(client, "tech2")
    user = db.query(models.User).filter(models.User.username == "tech2").first()
    _seed_notifications(db, user.id, 3)
    resp = client.get("/api/notifications", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 3


def test_unread_count(client, db):
    _make_noc_and_tech(db)
    token = _token(client, "tech2")
    user = db.query(models.User).filter(models.User.username == "tech2").first()
    _seed_notifications(db, user.id, 5)
    resp = client.get("/api/notifications/unread-count", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["count"] == 5


def test_mark_all_read(client, db):
    _make_noc_and_tech(db)
    token = _token(client, "tech2")
    user = db.query(models.User).filter(models.User.username == "tech2").first()
    _seed_notifications(db, user.id, 3)
    resp = client.patch("/api/notifications/read-all", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    count_resp = client.get("/api/notifications/unread-count", headers={"Authorization": f"Bearer {token}"})
    assert count_resp.json()["count"] == 0


def test_list_contacts(client, db):
    _make_noc_and_tech(db)
    token = _token(client, "tech2")
    resp = client.get("/api/contacts", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_checkin_creates_notifications_for_all_users(client, db):
    from backend import models as m
    from backend.auth import hash_password as hp
    # Create two users
    for name, username, role in [("User One", "u1", "technician"), ("User Two", "u2", "technician")]:
        c = m.Contact(name=name, phone="+961", email=f"{username}@t.com", role=role, company="Touch")
        db.add(c)
        db.commit()
        u = m.User(name=name, username=username, email=f"{username}@t.com",
                   password_hash=hp("pass"), role=m.UserRole(role), company="Touch", phone=None)
        db.add(u)
    db.commit()
    # Add a site
    site = m.Site(site_id="TEST-001", name="Test Site", region="Test", latitude=33.0, longitude=35.0)
    db.add(site)
    db.commit()
    db.refresh(site)

    token = client.post("/api/auth/login", json={"username": "u1", "password": "pass"}).json()["access_token"]
    resp = client.post("/api/checkins", json={
        "site_id": site.id, "activity_type": "Maintenance", "severity": "Low",
        "affected_sites": [], "expected_duration": 1.0,
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201

    # Both users should have a notification
    u1 = db.query(m.User).filter(m.User.username == "u1").first()
    u2 = db.query(m.User).filter(m.User.username == "u2").first()
    n1 = db.query(m.Notification).filter(m.Notification.user_id == u1.id).count()
    n2 = db.query(m.Notification).filter(m.Notification.user_id == u2.id).count()
    assert n1 == 1
    assert n2 == 1
