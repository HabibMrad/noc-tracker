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
