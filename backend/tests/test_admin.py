from backend import models
from backend.auth import hash_password


def _make_user(db, username, role=models.UserRole.technician, active=True):
    user = models.User(
        name=username, username=username, email=f"{username}@t.com",
        password_hash=hash_password("pass"), role=role,
        company="Touch", is_active=active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(client, username, password="pass"):
    return client.post("/api/auth/login", json={"username": username, "password": password})


def _headers(client, username):
    r = _login(client, username)
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ── Test 1 ───────────────────────────────────────────────────────────────────
def test_admin_can_list_users(client, db):
    _make_user(db, "adm", role=models.UserRole.admin)
    _make_user(db, "tech1")
    _make_user(db, "tech2")
    r = client.get("/api/admin/users", headers=_headers(client, "adm"))
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 3
    assert all("is_active" in u for u in data)


# ── Test 2 ───────────────────────────────────────────────────────────────────
def test_non_admin_cannot_list_users(client, db):
    _make_user(db, "tech3")
    r = client.get("/api/admin/users", headers=_headers(client, "tech3"))
    assert r.status_code == 403


# ── Test 3 ───────────────────────────────────────────────────────────────────
def test_admin_can_change_user_role(client, db):
    _make_user(db, "adm2", role=models.UserRole.admin)
    target = _make_user(db, "tech4")
    r = client.patch(
        f"/api/admin/users/{target.id}",
        json={"role": "noc_handler"},
        headers=_headers(client, "adm2"),
    )
    assert r.status_code == 200
    assert r.json()["role"] == "noc_handler"
    db.refresh(target)
    assert target.role == models.UserRole.noc_handler


# ── Test 4 ───────────────────────────────────────────────────────────────────
def test_admin_can_deactivate_user(client, db):
    _make_user(db, "adm3", role=models.UserRole.admin)
    target = _make_user(db, "tech5")
    r = client.patch(
        f"/api/admin/users/{target.id}",
        json={"is_active": False},
        headers=_headers(client, "adm3"),
    )
    assert r.status_code == 200
    assert r.json()["is_active"] is False


# ── Test 5 ───────────────────────────────────────────────────────────────────
def test_admin_cannot_deactivate_self(client, db):
    admin = _make_user(db, "adm4", role=models.UserRole.admin)
    r = client.patch(
        f"/api/admin/users/{admin.id}",
        json={"is_active": False},
        headers=_headers(client, "adm4"),
    )
    assert r.status_code == 400


# ── Test 6 ───────────────────────────────────────────────────────────────────
def test_admin_can_delete_user(client, db):
    _make_user(db, "adm5", role=models.UserRole.admin)
    target = _make_user(db, "tech6")
    r = client.delete(
        f"/api/admin/users/{target.id}",
        headers=_headers(client, "adm5"),
    )
    assert r.status_code == 204
    assert db.query(models.User).filter(models.User.id == target.id).first() is None


# ── Test 7 ───────────────────────────────────────────────────────────────────
def test_admin_cannot_delete_self(client, db):
    admin = _make_user(db, "adm6", role=models.UserRole.admin)
    r = client.delete(
        f"/api/admin/users/{admin.id}",
        headers=_headers(client, "adm6"),
    )
    assert r.status_code == 400


# ── Test 8 ───────────────────────────────────────────────────────────────────
def test_admin_stats_structure(client, db):
    _make_user(db, "adm7", role=models.UserRole.admin)
    _make_user(db, "t7a")
    _make_user(db, "t7b")
    db.add(models.Site(site_id="S-001", name="Site1", region="B", latitude=33.9, longitude=35.5))
    db.commit()
    r = client.get("/api/admin/stats", headers=_headers(client, "adm7"))
    assert r.status_code == 200
    data = r.json()
    assert "total_users" in data
    assert "total_sites" in data
    assert "active_checkins" in data
    assert "users_by_role" in data
    assert "checkins_today" in data
    assert "top_active_sites" in data
    assert data["total_sites"] == 1
    assert data["users_by_role"]["technician"] == 2
    assert data["active_checkins"] == 0
    assert isinstance(data["top_active_sites"], list)


# ── Test 9 ───────────────────────────────────────────────────────────────────
def test_deactivated_user_cannot_login(client, db):
    _make_user(db, "dead", active=False)
    r = _login(client, "dead")
    assert r.status_code == 403
