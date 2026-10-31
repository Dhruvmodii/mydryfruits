"""Create tables (if needed) and an admin user. Does not wipe existing shop data."""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import bcrypt
from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from app import create_app
from app.extensions import db
from app.models import Admin


def main():
    app = create_app()
    email = (os.getenv("ADMIN_EMAIL") or "admin@mydryfruits.com").lower()
    password = os.getenv("ADMIN_PASSWORD") or "Admin@12345"
    with app.app_context():
        db.create_all()
        existing = Admin.query.filter_by(email=email).first()
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        if existing:
            existing.passwordHash = hashed
            print(f"Updated admin {email}")
        else:
            db.session.add(Admin(email=email, passwordHash=hashed, name="Admin"))
            print(f"Created admin {email}")
        db.session.commit()


if __name__ == "__main__":
    main()
