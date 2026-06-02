def test_models_importable():
    from backend import models
    assert hasattr(models, "User")
    assert hasattr(models, "Site")
    assert hasattr(models, "CheckIn")
    assert hasattr(models, "Notification")
    assert hasattr(models, "Contact")
