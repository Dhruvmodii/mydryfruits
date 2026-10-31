"""Copy XAMPP MySQL mydryfruits data into Neon Postgres. Not for committing secrets."""
from __future__ import annotations

import json
import os
import sys
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

import pymysql
import psycopg2
from psycopg2.extras import Json, execute_values

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

MYSQL = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "database": os.getenv("MYSQL_DATABASE", "mydryfruits"),
    "charset": "utf8mb4",
}

NEON = os.getenv(
    "NEON_DATABASE_URL",
    os.getenv("DATABASE_URL", ""),
).strip().replace("\n", "").replace("\r", "")
if NEON.startswith("postgresql+psycopg2://"):
    NEON = "postgresql://" + NEON[len("postgresql+psycopg2://") :]
if "channel_binding=" in NEON:
    NEON = NEON.replace("&channel_binding=require", "").replace("channel_binding=require&", "")

# MySQL (lowercase on Windows) -> Postgres quoted names used by Flask models
TABLES = [
    ("Admin", "admin"),
    ("Category", "category"),
    ("Product", "product"),
    ("ProductImage", "productimage"),
    ("Collection", "collection"),
    ("CollectionItem", "collectionitem"),
    ("Customer", "customer"),
    ("Coupon", "coupon"),
    ("Review", "review"),
    ("Faq", "faq"),
    ("HomepageSection", "homepagesection"),
    ("NewsletterSubscriber", "newslettersubscriber"),
    ("MediaAsset", "mediaasset"),
    ("EmailTemplate", "emailtemplate"),
    ("SiteSetting", "sitesetting"),
    ("SeoPage", "seopage"),
    ("AnalyticsEvent", "analyticsevent"),
    ("BulkInquiry", "bulkinquiry"),
    ("Order", "order"),
    ("OrderItem", "orderitem"),
]

JSON_COLS = {
    "Product": {"nutrition"},
    "HomepageSection": {"content"},
    "SiteSetting": {"value"},
    "SeoPage": {"schemaJson"},
    "AnalyticsEvent": {"meta"},
}


def pg_types(pcur, pg_table: str) -> dict:
    pcur.execute(
        """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        """,
        (pg_table,),
    )
    return {r[0]: r[1] for r in pcur.fetchall()}


def convert(pg_table: str, col: str, val, types: dict):
    if val is None:
        return None
    dtype = types.get(col) or types.get(col.lower()) or ""
    if dtype == "boolean":
        return bool(val)
    if col in JSON_COLS.get(pg_table, set()):
        if isinstance(val, (dict, list)):
            return Json(val)
        if isinstance(val, (bytes, bytearray)):
            val = val.decode("utf-8")
        if isinstance(val, str):
            try:
                return Json(json.loads(val))
            except json.JSONDecodeError:
                return Json(val)
        return Json(val)
    if isinstance(val, Decimal):
        return val
    if isinstance(val, datetime):
        return val
    if isinstance(val, date):
        return val
    if isinstance(val, bytes):
        return val.decode("utf-8")
    return val


def main():
    if not NEON or "localhost" in NEON or "127.0.0.1" in NEON:
        print("Set NEON_DATABASE_URL or DATABASE_URL to the Neon postgres URI")
        sys.exit(1)

    mysql = pymysql.connect(**MYSQL, cursorclass=pymysql.cursors.DictCursor)
    pg = psycopg2.connect(NEON)
    pg.autocommit = False
    mcur = mysql.cursor()
    pcur = pg.cursor()

    copied = {}
    for pg_table, _mysql_table in reversed(TABLES):
        pcur.execute('DELETE FROM "{}"'.format(pg_table))
    print("cleared neon tables")

    for pg_table, mysql_table in TABLES:
        mcur.execute("SHOW TABLES LIKE %s", (mysql_table,))
        if not mcur.fetchone():
            print("skip missing mysql table", mysql_table)
            continue
        mcur.execute("SELECT * FROM `{}`".format(mysql_table))
        rows = mcur.fetchall()
        if not rows:
            print("empty", mysql_table, "->", pg_table)
            copied[pg_table] = 0
            continue
        cols = list(rows[0].keys())
        types = pg_types(pcur, pg_table)
        col_sql = ",".join('"{}"'.format(c) for c in cols)
        values = []
        for row in rows:
            values.append(tuple(convert(pg_table, c, row[c], types) for c in cols))
        execute_values(
            pcur,
            'INSERT INTO "{}" ({}) VALUES %s'.format(pg_table, col_sql),
            values,
            page_size=200,
        )
        copied[pg_table] = len(values)
        print("copied", mysql_table, "->", pg_table, len(values))

    pg.commit()
    mysql.close()
    pg.close()
    print("done", copied)


if __name__ == "__main__":
    main()
