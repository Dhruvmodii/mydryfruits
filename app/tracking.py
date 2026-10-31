"""Order tracking: status steps, auto-advance by hours, delivery window and late/early messages.

All database times are naive UTC. Customers and admin see India time (IST, UTC+5:30).
"""
from __future__ import annotations

import copy
from datetime import datetime, timedelta

from .extensions import db
from .models import OrderStatusEvent, OrderTracking, SiteSetting

IST = timedelta(hours=5, minutes=30)
STATUSES = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"]
ALL_STATUSES = STATUSES + ["CANCELLED"]

DEFAULT_TRACKING = {
    "autoAdvance": True,
    "notifyCustomer": False,
    "steps": {
        "PENDING": {"label": "Order placed", "description": "We have received your order.", "afterHours": 0},
        "CONFIRMED": {"label": "Confirmed", "description": "We checked stock and confirmed your order.", "afterHours": 2},
        "PACKED": {"label": "Packed", "description": "Your dry fruits are freshly packed and sealed.", "afterHours": 12},
        "SHIPPED": {"label": "On the way", "description": "Your parcel has left our store.", "afterHours": 24},
        "DELIVERED": {"label": "Delivered", "description": "Your order has been delivered. Enjoy!", "afterHours": 0},
    },
    "delivery": {
        "minDays": 2,
        "maxDays": 4,
        "windowStart": "10:00",
        "windowEnd": "19:00",
        "skipSundays": True,
        "lateExtendHours": 24,
    },
    "messages": {
        "onTime": "Your order is on schedule.",
        "early": "Good news — your order may arrive earlier than expected.",
        "late": "Sorry, your order is running a little late. We are on it.",
        "delivered": "Delivered. Thank you for shopping with us!",
        "deliveredEarly": "Delivered earlier than expected. Thank you for shopping with us!",
        "cancelled": "This order was cancelled. Contact us if you have any questions.",
    },
    "style": {
        "activeColor": "#1b4332",
        "inactiveColor": "#e6dfd3",
        "accentColor": "#c4a35a",
        "showTimes": True,
        "showDescriptions": True,
    },
}


def _deep_merge(base: dict, extra: dict) -> dict:
    out = copy.deepcopy(base)
    for key, value in (extra or {}).items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _deep_merge(out[key], value)
        else:
            out[key] = value
    return out


def get_settings() -> dict:
    row = SiteSetting.query.filter_by(key="tracking").first()
    return _deep_merge(DEFAULT_TRACKING, row.value if row and isinstance(row.value, dict) else {})


def _num(value, default, minimum=0):
    try:
        return max(minimum, float(value))
    except (TypeError, ValueError):
        return default


def save_settings(form) -> dict:
    s = get_settings()
    s["autoAdvance"] = form.get("autoAdvance") == "on"
    s["notifyCustomer"] = form.get("notifyCustomer") == "on"
    for status in STATUSES:
        step = s["steps"][status]
        step["label"] = (form.get(f"steps.{status}.label") or step["label"]).strip()
        step["description"] = (form.get(f"steps.{status}.description") or "").strip()
        if status != "PENDING":
            step["afterHours"] = _num(form.get(f"steps.{status}.afterHours"), 0)
    d = s["delivery"]
    d["minDays"] = int(_num(form.get("delivery.minDays"), d["minDays"]))
    d["maxDays"] = max(d["minDays"], int(_num(form.get("delivery.maxDays"), d["maxDays"])))
    d["windowStart"] = form.get("delivery.windowStart") or d["windowStart"]
    d["windowEnd"] = form.get("delivery.windowEnd") or d["windowEnd"]
    d["skipSundays"] = form.get("delivery.skipSundays") == "on"
    d["lateExtendHours"] = _num(form.get("delivery.lateExtendHours"), d["lateExtendHours"], 1)
    for key in s["messages"]:
        s["messages"][key] = (form.get(f"messages.{key}") or s["messages"][key]).strip()
    st = s["style"]
    for key in ("activeColor", "inactiveColor", "accentColor"):
        value = (form.get(f"style.{key}") or "").strip()
        if value.startswith("#") and len(value) in (4, 7):
            st[key] = value
    st["showTimes"] = form.get("style.showTimes") == "on"
    st["showDescriptions"] = form.get("style.showDescriptions") == "on"

    row = SiteSetting.query.filter_by(key="tracking").first()
    if row:
        row.value = s
    else:
        db.session.add(SiteSetting(key="tracking", value=s))
    db.session.commit()
    return s


# ── Time helpers ─────────────────────────────────────────────

def to_ist(dt: datetime | None) -> datetime | None:
    return dt + IST if dt else None


def from_ist(dt: datetime | None) -> datetime | None:
    return dt - IST if dt else None


def fmt_day(dt: datetime | None) -> str:
    if not dt:
        return ""
    local = to_ist(dt)
    return f"{local:%a}, {local.day} {local:%b}"


def fmt_time(dt: datetime | None) -> str:
    if not dt:
        return ""
    local = to_ist(dt)
    hour = local.hour % 12 or 12
    suffix = "am" if local.hour < 12 else "pm"
    return f"{hour}:{local:%M} {suffix}" if local.minute else f"{hour} {suffix}"


def fmt_full(dt: datetime | None) -> str:
    return f"{fmt_day(dt)}, {fmt_time(dt)}" if dt else ""


def fmt_window(start: datetime | None, end: datetime | None) -> str:
    if not start or not end:
        return ""
    if to_ist(start).date() == to_ist(end).date():
        return f"{fmt_day(start)}, {fmt_time(start)} – {fmt_time(end)}"
    return f"{fmt_day(start)} – {fmt_day(end)}, {fmt_time(start)} – {fmt_time(end)}"


def _at(local_date, hhmm: str) -> datetime:
    try:
        hour, minute = (int(x) for x in hhmm.split(":")[:2])
    except ValueError:
        hour, minute = 10, 0
    return datetime(local_date.year, local_date.month, local_date.day, hour, minute) - IST


def _add_days(local_dt: datetime, days: int, skip_sundays: bool):
    day = local_dt.date()
    added = 0
    while added < days:
        day += timedelta(days=1)
        if skip_sundays and day.weekday() == 6:
            continue
        added += 1
    while skip_sundays and day.weekday() == 6:
        day += timedelta(days=1)
    return day


def default_window(created_at: datetime, settings: dict) -> tuple[datetime, datetime]:
    d = settings["delivery"]
    local = to_ist(created_at)
    start_day = _add_days(local, int(d["minDays"]), d["skipSundays"])
    end_day = _add_days(local, int(d["maxDays"]), d["skipSundays"])
    return _at(start_day, d["windowStart"]), _at(end_day, d["windowEnd"])


# ── Order state ──────────────────────────────────────────────

def events_for(order) -> list[OrderStatusEvent]:
    return (
        OrderStatusEvent.query.filter_by(orderId=order.id)
        .order_by(OrderStatusEvent.createdAt.asc())
        .all()
    )


def ensure_tracking(order, settings: dict | None = None) -> OrderTracking:
    """Create the tracking row and first timeline entry for orders that do not have them yet."""
    settings = settings or get_settings()
    tracking = OrderTracking.query.filter_by(orderId=order.id).first()
    changed = False
    if not tracking:
        created = order.createdAt or datetime.utcnow()
        start, end = default_window(created, settings)
        # Orders from before tracking existed must not jump ahead on first view.
        is_new = datetime.utcnow() - created < timedelta(minutes=30)
        tracking = OrderTracking(orderId=order.id, autoUpdate=is_new, estimatedFrom=start, estimatedTo=end)
        db.session.add(tracking)
        changed = True
    if not OrderStatusEvent.query.filter_by(orderId=order.id).first():
        db.session.add(
            OrderStatusEvent(orderId=order.id, status="PENDING", source="system", createdAt=order.createdAt or datetime.utcnow())
        )
        if order.status and order.status != "PENDING":
            db.session.add(
                OrderStatusEvent(
                    orderId=order.id,
                    status=order.status,
                    source="admin",
                    createdAt=order.updatedAt or order.createdAt or datetime.utcnow(),
                )
            )
        changed = True
    if changed:
        db.session.commit()
    return tracking


def next_auto_step(order, settings: dict, events: list | None = None):
    """Return (status, due_time_utc) of the next automatic update, or None."""
    if order.status not in STATUSES or order.status == "DELIVERED":
        return None
    tracking = order.tracking
    if not settings["autoAdvance"] or (tracking and not tracking.autoUpdate):
        return None
    nxt = STATUSES[STATUSES.index(order.status) + 1]
    hours = float(settings["steps"][nxt].get("afterHours") or 0)
    if hours <= 0:
        return None
    events = events if events is not None else events_for(order)
    last = events[-1].createdAt if events else order.createdAt
    return nxt, last + timedelta(hours=hours)


def auto_advance(order, settings: dict | None = None, now: datetime | None = None) -> list[str]:
    """Move the order forward for every step whose waiting time has passed. Returns new statuses."""
    settings = settings or get_settings()
    now = now or datetime.utcnow()
    ensure_tracking(order, settings)
    events = events_for(order)
    moved = []
    while True:
        step = next_auto_step(order, settings, events)
        if not step or step[1] > now:
            break
        status, due = step
        event = OrderStatusEvent(orderId=order.id, status=status, source="auto", createdAt=due)
        db.session.add(event)
        events.append(event)
        order.status = status
        moved.append(status)
    if moved:
        db.session.commit()
    return moved


def refresh(orders, settings: dict | None = None) -> dict[str, list[str]]:
    settings = settings or get_settings()
    changes = {}
    for order in orders:
        moved = auto_advance(order, settings)
        if moved:
            changes[order.id] = moved
    return changes


def set_status(order, status: str, note: str = "", source: str = "admin") -> bool:
    if status not in ALL_STATUSES or status == order.status:
        return False
    ensure_tracking(order)
    order.status = status
    db.session.add(OrderStatusEvent(orderId=order.id, status=status, note=note or None, source=source))
    db.session.commit()
    return True


def view(order, settings: dict | None = None, now: datetime | None = None) -> dict:
    """Everything a template needs to draw the progress bar and delivery message."""
    settings = settings or get_settings()
    now = now or datetime.utcnow()
    tracking = ensure_tracking(order, settings)
    events = events_for(order)
    reached = {}
    for e in events:
        reached[e.status] = e.createdAt

    cancelled = order.status == "CANCELLED"
    current_index = STATUSES.index(order.status) if order.status in STATUSES else -1
    if cancelled:
        done_statuses = [s for s in STATUSES if s in reached]
        current_index = STATUSES.index(done_statuses[-1]) if done_statuses else 0

    steps = []
    for i, status in enumerate(STATUSES):
        cfg = settings["steps"][status]
        steps.append(
            {
                "status": status,
                "label": cfg["label"],
                "description": cfg.get("description") or "",
                "done": i < current_index or (i == current_index and status == "DELIVERED"),
                "current": i == current_index and not cancelled and status != "DELIVERED",
                "time": fmt_full(reached.get(status)) if i <= current_index else "",
            }
        )

    start, end = tracking.estimatedFrom, tracking.estimatedTo
    msgs = settings["messages"]
    delivered_at = reached.get("DELIVERED")
    state, message, expected = "onTime", msgs["onTime"], fmt_window(start, end)
    if cancelled:
        state, message, expected = "cancelled", msgs["cancelled"], ""
    elif order.status == "DELIVERED":
        early = bool(delivered_at and start and delivered_at < start)
        state = "deliveredEarly" if early else "delivered"
        message = msgs[state]
        expected = ""
    elif end and now > end:
        state, message = "late", msgs["late"]
        new_end = now + timedelta(hours=float(settings["delivery"]["lateExtendHours"]))
        local_end = to_ist(new_end).replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        new_end = from_ist(local_end)
        expected = f"New expected time: by {fmt_full(new_end)}"
    elif order.status == "SHIPPED" and start and now < start:
        state, message = "early", msgs["early"]

    progress = 100 if order.status == "DELIVERED" else int(round(max(current_index, 0) / (len(STATUSES) - 1) * 100))
    nxt = next_auto_step(order, settings, events)
    return {
        "steps": steps,
        "progress": progress,
        "state": state,
        "message": message,
        "expected": expected,
        "deliveredAt": fmt_full(delivered_at),
        "cancelled": cancelled,
        "statusLabel": settings["steps"].get(order.status, {}).get("label", order.status.title()) if not cancelled else "Cancelled",
        "style": settings["style"],
        "tracking": tracking,
        "events": events,
        "nextAuto": {"status": nxt[0], "label": settings["steps"][nxt[0]]["label"], "at": fmt_full(nxt[1])} if nxt else None,
    }
