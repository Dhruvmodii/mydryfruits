import os

import bcrypt

from .extensions import db
from .models import Admin, Category, HomepageSection, OrderStatusEvent, OrderTracking
from .utils import slugify

NEW_TABLES = [OrderTracking, OrderStatusEvent]


def ensure_schema_and_admin(app):
    uri = app.config.get("SQLALCHEMY_DATABASE_URI") or ""
    with app.app_context():
        for model in NEW_TABLES:
            model.__table__.create(bind=db.engine, checkfirst=True)
        from .notify import ensure_status_template

        ensure_status_template()

        if "postgresql" not in uri and "neon.tech" not in uri:
            return
        db.create_all()
        email = (os.getenv("ADMIN_EMAIL") or "admin@mydryfruits.com").lower()
        password = os.getenv("ADMIN_PASSWORD") or "Admin@12345"
        if not Admin.query.filter_by(email=email).first():
            hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            db.session.add(Admin(email=email, passwordHash=hashed, name="Admin"))
        if Category.query.count() == 0:
            for i, name in enumerate(
                ["Nuts", "Dried Fruits", "Spices", "Healthy Snacks", "Premium Nuts & Fruits"],
                start=1,
            ):
                db.session.add(
                    Category(name=name, slug=slugify(name), displayOrder=i, hidden=False)
                )
        if not HomepageSection.query.filter_by(key="hero").first():
            db.session.add(
                HomepageSection(
                    key="hero",
                    title="Hero",
                    enabled=True,
                    content={
                        "headline": "Premium Dry Fruits Delivered Fresh",
                        "subheading": "100% Natural • Fresh Stock • Premium Quality",
                    },
                )
            )
        db.session.commit()
