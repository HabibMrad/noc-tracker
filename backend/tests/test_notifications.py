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
