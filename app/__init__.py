import os

from flask import Flask, render_template
from sqlalchemy.exc import OperationalError

from .config import Config
from .extensions import db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    from . import models  # noqa: F401
    from .views.admin import bp as admin_bp
    from .views.store import bp as store_bp

    app.register_blueprint(store_bp)
    app.register_blueprint(admin_bp)

    try:
        from .bootstrap import ensure_schema_and_admin

        ensure_schema_and_admin(app)
    except Exception as exc:
        app.logger.warning("database bootstrap skipped: %s", exc)

    @app.errorhandler(OperationalError)
    def handle_db_errors(_err):
        on_vercel = os.getenv("VERCEL") == "1"
        return (
            render_template(
                "db_down.html",
                on_vercel=on_vercel,
                error=(
                    "Paste your Neon DATABASE_URL in Vercel environment variables, then redeploy."
                    if on_vercel
                    else "Database is not reachable on this PC."
                ),
            ),
            503,
        )

    return app
