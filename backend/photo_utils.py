import io
import math
import os
from datetime import datetime
from typing import Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads", "photos")


def extract_exif(image_bytes: bytes) -> dict:
    """Return dict with keys: lat, lng, taken_at, device. All may be None."""
    result: dict = {"lat": None, "lng": None, "taken_at": None, "device": None}
    try:
        from PIL import Image
        import piexif
        img = Image.open(io.BytesIO(image_bytes))
        raw_exif = img.info.get("exif", b"")
        if not raw_exif:
            return result
        exif_data = piexif.load(raw_exif)

        gps = exif_data.get("GPS", {})
        if gps:
            lat = _dms_to_decimal(
                gps.get(piexif.GPSIFD.GPSLatitude),
                gps.get(piexif.GPSIFD.GPSLatitudeRef),
            )
            lng = _dms_to_decimal(
                gps.get(piexif.GPSIFD.GPSLongitude),
                gps.get(piexif.GPSIFD.GPSLongitudeRef),
            )
            result["lat"] = lat
            result["lng"] = lng

        exif = exif_data.get("Exif", {})
        dt_bytes = exif.get(piexif.ExifIFD.DateTimeOriginal)
        if dt_bytes:
            try:
                result["taken_at"] = datetime.strptime(
                    dt_bytes.decode("ascii", errors="replace"), "%Y:%m:%d %H:%M:%S"
                )
            except ValueError:
                pass

        ifd0 = exif_data.get("0th", {})
        model_bytes = ifd0.get(piexif.ImageIFD.Model)
        if model_bytes:
            result["device"] = model_bytes.decode("utf-8", errors="replace").strip("\x00")

    except Exception:
        pass

    return result


def _dms_to_decimal(dms, ref) -> Optional[float]:
    if not dms or not ref:
        return None
    try:
        d = dms[0][0] / dms[0][1]
        m = dms[1][0] / dms[1][1]
        s = dms[2][0] / dms[2][1]
        decimal = d + m / 60.0 + s / 3600.0
        if ref in (b"S", b"W"):
            decimal = -decimal
        return round(decimal, 7)
    except (ZeroDivisionError, TypeError, IndexError):
        return None


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return distance in km between two GPS coordinates."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
