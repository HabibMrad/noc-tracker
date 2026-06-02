import io
import openpyxl
from backend import models
from backend.auth import hash_password


def _make_sites_xlsx():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["site_id", "name", "region", "latitude", "longitude"])
    ws.append(["BEY-001", "Beirut Central", "Beirut", 33.8938, 35.5018])
    ws.append(["TYR-001", "Tyre South", "South", 33.2705, 35.2038])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def _make_employees_xlsx():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["name", "role", "phone", "email", "company"])
    ws.append(["Habib Mrad", "technician", "+961 70 111111", "habib@touch.com", "Touch"])
    ws.append(["Noc Handler", "noc_handler", "+961 70 222222", "noc@touch.com", "Touch"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def _noc_token(client, db):
    noc = models.User(
        name="Noc Handler", username="noc", email="noc@test.com",
        password_hash=hash_password("pass"), role=models.UserRole.noc_handler,
        company="Touch", phone=None,
    )
    db.add(noc)
    db.commit()
    db.refresh(noc)
    resp = client.post("/api/auth/login", json={"username": "noc", "password": "pass"})
    return resp.json()["access_token"]


def test_import_sites_preview(client, db):
    token = _noc_token(client, db)
    buf = _make_sites_xlsx()
    resp = client.post(
        "/api/import/sites/preview",
        files={"file": ("sites.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_rows"] == 2
    assert "site_id" in data["headers"]


def test_import_sites_confirm(client, db):
    token = _noc_token(client, db)
    buf = _make_sites_xlsx()
    resp = client.post(
        "/api/import/sites/confirm",
        files={"file": ("sites.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        params={"mode": "skip"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    result = resp.json()
    assert result["inserted"] == 2
    assert result["skipped"] == 0


def test_import_employees_confirm(client, db):
    token = _noc_token(client, db)
    buf = _make_employees_xlsx()
    resp = client.post(
        "/api/import/employees/confirm",
        files={"file": ("emp.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        params={"mode": "update"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["inserted"] == 2
