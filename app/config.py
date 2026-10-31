from __future__ import annotations

import os

from dotenv import load_dotenv
from sqlalchemy.pool import NullPool

load_dotenv()

# Values pasted via the Vercel CLI on Windows can carry a trailing newline.
for _key, _value in list(os.environ.items()):
    if _value != _value.strip():
        os.environ[_key] = _value.strip()


def sqlalchemy_uri(raw: str | None) -> str:
    url = (raw or "mysql://root:@127.0.0.1:3306/mydryfruits").strip().replace("\r", "").replace("\n", "")
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://") and "+psycopg" not in url and "+psycopg2" not in url:
        url = "postgresql+psycopg2://" + url[len("postgresql://") :]
    elif url.startswith("mysql://"):
        url = "mysql+pymysql://" + url[len("mysql://") :]
    if "neon.tech" in url and "sslmode=" not in url:
        url += ("&" if "?" in url else "?") + "sslmode=require"
    return url


_uri = sqlalchemy_uri(os.getenv("DATABASE_URL"))
_on_vercel = os.getenv("VERCEL") == "1"


class Config:
    SECRET_KEY = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY") or "dev-secret-change-me"
    SQLALCHEMY_DATABASE_URI = _uri
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = (
        {
            "poolclass": NullPool,
            "pool_pre_ping": True,
        }
        if _on_vercel or "neon.tech" in _uri
        else {
            "pool_pre_ping": True,
            "pool_recycle": 280,
            "pool_size": 2,
            "max_overflow": 0,
        }
    )
    SITE_NAME = os.getenv("NEXT_PUBLIC_SITE_NAME") or os.getenv("SITE_NAME") or "MyDryFruits"
    SITE_URL = (os.getenv("SITE_URL") or os.getenv("NEXT_PUBLIC_SITE_URL") or "http://localhost:5000").rstrip("/")
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL") or "admin@mydryfruits.com"
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME") or ""
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY") or ""
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET") or ""
    UPLOAD_DRIVER = os.getenv("UPLOAD_DRIVER") or (
        "cloudinary" if os.getenv("VERCEL") == "1" else "local"
    )
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("VERCEL") == "1" or os.getenv("NODE_ENV") == "production"
