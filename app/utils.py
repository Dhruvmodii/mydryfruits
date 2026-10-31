from __future__ import annotations

import json
import random
import re
import secrets
from datetime import datetime, timedelta
from decimal import Decimal


WEIGHT_OPTIONS = [250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 3500, 4000]


def new_id() -> str:
    return "c" + secrets.token_hex(12)


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower())
    return s.strip("-")


def money(n) -> float:
    return round(float(n or 0) * 100) / 100


def price_for_weight(price_per_kg, weight_grams: int) -> float:
    return money((float(price_per_kg) * int(weight_grams)) / 1000)


def format_inr(amount) -> str:
    n = int(round(float(amount or 0)))
    sign, digits = ("-" if n < 0 else ""), str(abs(n))
    if len(digits) > 3:
        head, tail = digits[:-3], digits[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        digits = ",".join(groups) + "," + tail
    return f"{sign}₹{digits}"


def format_weight(grams: int) -> str:
    if grams < 1000:
        return f"{grams}g"
    kg = grams / 1000
    return f"{int(kg)}kg" if kg == int(kg) else f"{kg}kg"


def generate_order_number() -> str:
    d = datetime.utcnow()
    return f"MDF{d:%y%m%d}{random.randint(1000, 9999)}"


def estimate_delivery() -> str:
    d = datetime.utcnow() + timedelta(days=3)
    return d.strftime("%a, %-d %b").replace(" 0", " ") if False else d.strftime("%a, %d %b").lstrip("0").replace(" 0", " ")


def parse_names(value) -> list[str]:
    if isinstance(value, list):
        return [str(v) for v in value]
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(v) for v in parsed]
        except json.JSONDecodeError:
            return [value] if value else []
    return []


def to_number(value) -> float:
    if isinstance(value, Decimal):
        return float(value)
    return float(value or 0)
