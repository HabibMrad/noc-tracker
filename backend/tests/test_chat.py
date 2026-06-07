from backend import models
from backend.auth import hash_password


def _make_user(db, username="alice"):
    user = models.User(
        name=username, username=username, email=f"{username}@t.com",
        password_hash=hash_password("pass"), role=models.UserRole.technician,
        company="Touch", is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _headers(client, username="alice"):
    r = client.post("/api/auth/login", json={"username": username, "password": "pass"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_get_messages_empty(client, db):
    _make_user(db)
    r = client.get("/api/chat/messages", headers=_headers(client))
    assert r.status_code == 200
    assert r.json() == []


def test_send_message(client, db):
    _make_user(db)
    r = client.post("/api/chat/messages", json={"content": "hello"}, headers=_headers(client))
    assert r.status_code == 201
    data = r.json()
    assert data["content"] == "hello"
    assert data["user"]["username"] == "alice"
    assert data["id"] is not None


def test_get_messages_returns_history(client, db):
    _make_user(db)
    h = _headers(client)
    client.post("/api/chat/messages", json={"content": "first"}, headers=h)
    client.post("/api/chat/messages", json={"content": "second"}, headers=h)
    r = client.get("/api/chat/messages", headers=h)
    assert r.status_code == 200
    contents = [m["content"] for m in r.json()]
    assert contents == ["first", "second"]  # oldest first


def test_send_message_unauthenticated(client, db):
    r = client.post("/api/chat/messages", json={"content": "hi"})
    assert r.status_code == 401
