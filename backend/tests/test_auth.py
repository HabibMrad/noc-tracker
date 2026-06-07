def test_models_importable():
    from backend import models
    assert hasattr(models, "User")
    assert hasattr(models, "Site")
    assert hasattr(models, "CheckIn")
    assert hasattr(models, "Notification")
    assert hasattr(models, "Contact")


def test_password_hash_and_verify():
    from backend.auth import hash_password, verify_password
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


def test_create_and_decode_access_token():
    from backend.auth import create_access_token, SECRET_KEY, ALGORITHM
    from jose import jwt
    token = create_access_token({"sub": "42"})
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "42"


from backend import models
from backend.auth import hash_password


def _seed_employee(db, name="Habib Mrad", role="technician", company="Touch", phone="+961 70 000000"):
    contact = models.Contact(name=name, phone=phone, email=f"{name}@touch.com", role=role, company=company)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def test_register_succeeds_when_name_in_allowlist(client, db):
    _seed_employee(db)
    resp = client.post("/api/auth/register", json={
        "name": "Habib Mrad",
        "username": "habib",
        "email": "habib@test.com",
        "password": "pass1234"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "habib"
    assert data["role"] == "technician"
    assert data["company"] == "Touch"


def test_register_blocked_when_name_not_in_allowlist(client, db):
    resp = client.post("/api/auth/register", json={
        "name": "Unknown Person",
        "username": "unknown",
        "email": "x@test.com",
        "password": "pass1234"
    })
    assert resp.status_code == 403


def test_login_returns_tokens(client, db):
    _seed_employee(db)
    client.post("/api/auth/register", json={
        "name": "Habib Mrad", "username": "habib",
        "email": "habib@test.com", "password": "pass1234"
    })
    resp = client.post("/api/auth/login", json={"username": "habib", "password": "pass1234"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_fails_wrong_password(client, db):
    _seed_employee(db)
    client.post("/api/auth/register", json={
        "name": "Habib Mrad", "username": "habib",
        "email": "habib@test.com", "password": "pass1234"
    })
    resp = client.post("/api/auth/login", json={"username": "habib", "password": "wrong"})
    assert resp.status_code == 401


def _register_and_login(client, db):
    _seed_employee(db)
    client.post("/api/auth/register", json={
        "name": "Habib Mrad", "username": "habib",
        "email": "habib@test.com", "password": "pass1234",
    })
    resp = client.post("/api/auth/login", json={"username": "habib", "password": "pass1234"})
    return resp.json()


def test_refresh_returns_new_tokens(client, db):
    tokens = _register_and_login(client, db)
    resp = client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    # new access token must authenticate against /me
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "habib"


def test_refresh_fails_with_access_token(client, db):
    tokens = _register_and_login(client, db)
    # passing an access token (no "type":"refresh") must be rejected
    resp = client.post("/api/auth/refresh", json={"refresh_token": tokens["access_token"]})
    assert resp.status_code == 401


def test_refresh_fails_with_invalid_token(client, db):
    resp = client.post("/api/auth/refresh", json={"refresh_token": "garbage.token.value"})
    assert resp.status_code == 401
