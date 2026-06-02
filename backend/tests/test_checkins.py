from backend import models
from backend.auth import hash_password


def _seed_sites(db):
    site_list = [
        models.Site(site_id="BEY-001", name="Beirut Central", region="Beirut", latitude=33.8938, longitude=35.5018),
        models.Site(site_id="TYR-001", name="Tyre South", region="South", latitude=33.2705, longitude=35.2038),
        models.Site(site_id="TRP-001", name="Tripoli North", region="North", latitude=34.4367, longitude=35.8497),
    ]
    for s in site_list:
        db.add(s)
    db.commit()
    return site_list


def _make_user(db, role="technician"):
    contact = models.Contact(name="Test User", phone="+961", email="t@t.com", role=role, company="Touch")
    db.add(contact)
    db.commit()
    user = models.User(
        name="Test User", username="testuser", email="test@test.com",
        password_hash=hash_password("pass"),
        role=models.UserRole(role), company="Touch", phone=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(client, username="testuser", password="pass"):
    resp = client.post("/api/auth/login", json={"username": username, "password": password})
    return resp.json()["access_token"]


def test_list_sites(client, db):
    _seed_sites(db)
    _make_user(db)
    token = _login(client)
    resp = client.get("/api/sites", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 3


def test_nearest_sites(client, db):
    _seed_sites(db)
    _make_user(db)
    token = _login(client)
    resp = client.get(
        "/api/sites/nearest",
        params={"lat": 33.88, "lng": 35.50, "limit": 2},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 2
    assert results[0]["site_id"] == "BEY-001"
    assert results[0]["distance_km"] < 5


def test_checkin_creates_active_session(client, db):
    _seed_sites(db)
    _make_user(db)
    token = _login(client)
    site = db.query(models.Site).filter(models.Site.site_id == "BEY-001").first()
    resp = client.post("/api/checkins", json={
        "site_id": site.id,
        "activity_type": "Maintenance",
        "severity": "Low",
        "affected_sites": ["BEY-001"],
        "expected_duration": 2.0,
        "is_planned_outage": False,
        "is_routine_maintenance": True,
        "notes": "Routine check"
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["checked_out_at"] is None
    assert data["site"]["site_id"] == "BEY-001"


def test_checkout_closes_session(client, db):
    _seed_sites(db)
    _make_user(db)
    token = _login(client)
    site = db.query(models.Site).filter(models.Site.site_id == "BEY-001").first()
    checkin_resp = client.post("/api/checkins", json={
        "site_id": site.id, "activity_type": "Maintenance",
        "severity": "Low", "affected_sites": [], "expected_duration": 1.0,
    }, headers={"Authorization": f"Bearer {token}"})
    checkin_id = checkin_resp.json()["id"]
    out_resp = client.patch(f"/api/checkins/{checkin_id}/checkout",
                            headers={"Authorization": f"Bearer {token}"})
    assert out_resp.status_code == 200
    assert out_resp.json()["checked_out_at"] is not None


def test_cannot_checkout_someone_elses_checkin(client, db):
    _seed_sites(db)
    _make_user(db)
    token = _login(client)
    site = db.query(models.Site).filter(models.Site.site_id == "BEY-001").first()
    contact2 = models.Contact(name="Other User", phone="+961", email="o@o.com", role="technician", company="Touch")
    db.add(contact2)
    db.commit()
    user2 = models.User(
        name="Other User", username="other", email="other@test.com",
        password_hash=hash_password("pass"), role=models.UserRole.technician,
        company="Touch", phone=None,
    )
    db.add(user2)
    db.commit()
    db.refresh(user2)
    checkin = models.CheckIn(
        user_id=user2.id, site_id=site.id,
        activity_type=models.ActivityType.maintenance,
        severity=models.Severity.low, expected_duration=1.0,
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    resp = client.patch(f"/api/checkins/{checkin.id}/checkout",
                        headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


def test_get_active_checkins(client, db):
    _seed_sites(db)
    _make_user(db)
    token = _login(client)
    site = db.query(models.Site).filter(models.Site.site_id == "BEY-001").first()
    client.post("/api/checkins", json={
        "site_id": site.id, "activity_type": "Maintenance",
        "severity": "Low", "affected_sites": [], "expected_duration": 1.0,
    }, headers={"Authorization": f"Bearer {token}"})
    resp = client.get("/api/checkins?status=active", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 1
