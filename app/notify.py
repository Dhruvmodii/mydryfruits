"""Email (SendGrid / Mailjet) and WhatsApp (Meta Cloud API / Twilio) notifications."""
from __future__ import annotations

import base64
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, wait

from flask import current_app

from .extensions import db
from .models import EmailTemplate, SiteSetting
from .utils import format_weight, to_number

TIMEOUT = 8

# The "sendgrid" section holds the email settings for every provider (kept for older saved data).
DEFAULT_INTEGRATIONS = {
    "sendgrid": {
        "enabled": True,
        "provider": "sendgrid",
        "apiKey": "",
        "apiSecret": "",
        "fromEmail": "",
        "fromName": "MyDryFruits",
        "notifyEmail": "",
    },
    "whatsapp": {
        "enabled": False,
        "provider": "meta",
        "apiKey": "",
        "apiSecret": "",
        "phoneNumberId": "",
        "businessAccountId": "",
        "adminNumber": "",
        "templateName": "",
        "templateLanguage": "en",
    },
    "sms": {
        "enabled": False,
        "provider": "msg91",
        "apiKey": "",
        "apiSecret": "",
        "senderId": "",
    },
}

SECRET_FIELDS = {
    ("sendgrid", "apiKey"),
    ("sendgrid", "apiSecret"),
    ("whatsapp", "apiKey"),
    ("whatsapp", "apiSecret"),
}

EMAIL_PROVIDERS = {"sendgrid": "SendGrid", "mailjet": "Mailjet"}

PLACEHOLDER = re.compile(r"\{\{\s*(\w+)\s*\}\}")


def get_integrations() -> dict:
    row = SiteSetting.query.filter_by(key="integrations").first()
    stored = row.value if row and isinstance(row.value, dict) else {}
    merged = {}
    for section, defaults in DEFAULT_INTEGRATIONS.items():
        merged[section] = {**defaults, **(stored.get(section) or {})}
    sg = merged["sendgrid"]
    sg["apiKey"] = os.getenv("SENDGRID_API_KEY") or sg["apiKey"]
    sg["fromEmail"] = os.getenv("SENDGRID_FROM_EMAIL") or sg["fromEmail"]
    sg["fromName"] = os.getenv("SENDGRID_FROM_NAME") or sg["fromName"] or "MyDryFruits"
    return merged


def save_integrations(form) -> None:
    row = SiteSetting.query.filter_by(key="integrations").first()
    stored = row.value if row and isinstance(row.value, dict) else {}
    updated = {section: {**DEFAULT_INTEGRATIONS[section], **(stored.get(section) or {})} for section in DEFAULT_INTEGRATIONS}

    for section, defaults in DEFAULT_INTEGRATIONS.items():
        for field, default in defaults.items():
            name = f"{section}.{field}"
            if isinstance(default, bool):
                if f"{name}__present" in form:
                    updated[section][field] = form.get(name) == "on"
                continue
            if name not in form:
                continue
            value = (form.get(name) or "").strip()
            if (section, field) in SECRET_FIELDS:
                if form.get(f"{name}__clear") == "on":
                    updated[section][field] = ""
                elif value:
                    updated[section][field] = value
                continue
            updated[section][field] = value

    if not row:
        db.session.add(SiteSetting(key="integrations", value=updated))
    else:
        row.value = updated
    db.session.commit()


def secret_hint(value: str) -> str:
    value = value or ""
    if not value:
        return ""
    return f"Saved (ends with …{value[-4:]})" if len(value) > 8 else "Saved"


def render_text(text: str, variables: dict) -> str:
    return PLACEHOLDER.sub(lambda m: str(variables.get(m.group(1), "")), text or "")


def _post(url: str, body: bytes, headers: dict) -> tuple[int, str]:
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as err:
        return err.code, err.read().decode("utf-8", "replace")


def email_ready(cfg: dict) -> bool:
    if not (cfg.get("enabled", True) and cfg.get("apiKey") and cfg.get("fromEmail")):
        return False
    if cfg.get("provider") == "mailjet":
        return bool(cfg.get("apiSecret"))
    return True


def send_email(to, subject: str, html: str) -> dict:
    cfg = get_integrations()["sendgrid"]
    provider = cfg.get("provider") or "sendgrid"
    label = EMAIL_PROVIDERS.get(provider, provider)
    recipients = [to] if isinstance(to, str) else list(to or [])
    recipients = [r.strip() for r in recipients if r and "@" in r]
    if not recipients:
        return {"sent": False, "reason": "No valid recipient email"}
    if not email_ready(cfg):
        missing = "Secret key" if provider == "mailjet" and cfg.get("apiKey") and not cfg.get("apiSecret") else "settings"
        return {"sent": False, "reason": f"{label} is not set up or disabled (missing {missing})"}
    from_name = cfg["fromName"] or "MyDryFruits"

    if provider == "mailjet":
        auth = base64.b64encode(f"{cfg['apiKey']}:{cfg['apiSecret']}".encode()).decode()
        payload = {
            "Messages": [
                {
                    "From": {"Email": cfg["fromEmail"], "Name": from_name},
                    "To": [{"Email": r} for r in recipients],
                    "Subject": subject,
                    "HTMLPart": html,
                }
            ]
        }
        status, text = _post(
            "https://api.mailjet.com/v3.1/send",
            json.dumps(payload).encode("utf-8"),
            {"Authorization": f"Basic {auth}", "Content-Type": "application/json"},
        )
    else:
        if not cfg["apiKey"].startswith("SG."):
            return {
                "sent": False,
                "reason": "This is not a SendGrid key (SendGrid keys start with SG.). "
                "If it is a Mailjet key, choose Mailjet as the provider and add the Secret key.",
            }
        payload = {
            "personalizations": [{"to": [{"email": r} for r in recipients]}],
            "from": {"email": cfg["fromEmail"], "name": from_name},
            "subject": subject,
            "content": [{"type": "text/html", "value": html}],
        }
        status, text = _post(
            "https://api.sendgrid.com/v3/mail/send",
            json.dumps(payload).encode("utf-8"),
            {"Authorization": f"Bearer {cfg['apiKey']}", "Content-Type": "application/json"},
        )

    if 200 <= status < 300:
        if provider == "mailjet":
            try:
                messages = json.loads(text).get("Messages") or []
            except ValueError:
                messages = []
            failed = [m for m in messages if m.get("Status") != "success"]
            if failed:
                return {"sent": False, "reason": f"Mailjet: {json.dumps(failed[0].get('Errors') or failed[0])[:300]}"}
        return {"sent": True}
    if provider == "mailjet" and status == 401:
        return {"sent": False, "reason": "Mailjet rejected the API Key / Secret Key pair. Copy both again from Mailjet → Account settings → API keys."}
    if provider == "mailjet" and "sender" in text.lower():
        return {"sent": False, "reason": f"Mailjet: the From email {cfg['fromEmail']} is not a validated sender. Add and verify it in Mailjet → Senders & domains. ({text[:200]})"}
    return {"sent": False, "reason": f"{label} {status}: {text[:300]}"}


def send_templated_email(to, key: str, variables: dict) -> dict:
    tpl = EmailTemplate.query.filter_by(key=key).first()
    if not tpl:
        return {"sent": False, "reason": f"Email template '{key}' not found"}
    return send_email(to, render_text(tpl.subject, variables), render_text(tpl.htmlBody, variables))


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) == 10:
        digits = "91" + digits
    return digits


def send_whatsapp(to: str, message: str) -> dict:
    cfg = get_integrations()["whatsapp"]
    number = normalize_phone(to)
    if not cfg["enabled"] or not cfg["apiKey"] or not number:
        return {"sent": False, "reason": "WhatsApp is not configured or disabled"}

    if cfg["provider"] == "twilio":
        if not cfg["apiSecret"] or not cfg["phoneNumberId"]:
            return {"sent": False, "reason": "Twilio needs Auth Token and From number"}
        sender = cfg["phoneNumberId"]
        sender = sender if sender.startswith("whatsapp:") else f"whatsapp:{sender}"
        auth = base64.b64encode(f"{cfg['apiKey']}:{cfg['apiSecret']}".encode()).decode()
        status, text = _post(
            f"https://api.twilio.com/2010-04-01/Accounts/{cfg['apiKey']}/Messages.json",
            urllib.parse.urlencode({"To": f"whatsapp:+{number}", "From": sender, "Body": message}).encode(),
            {"Authorization": f"Basic {auth}", "Content-Type": "application/x-www-form-urlencoded"},
        )
    else:
        if not cfg["phoneNumberId"]:
            return {"sent": False, "reason": "Meta WhatsApp needs Phone Number ID"}
        if cfg["templateName"]:
            payload = {
                "messaging_product": "whatsapp",
                "to": number,
                "type": "template",
                "template": {
                    "name": cfg["templateName"],
                    "language": {"code": cfg["templateLanguage"] or "en"},
                    "components": [
                        {"type": "body", "parameters": [{"type": "text", "text": message[:1000]}]}
                    ],
                },
            }
        else:
            payload = {
                "messaging_product": "whatsapp",
                "to": number,
                "type": "text",
                "text": {"body": message},
            }
        status, text = _post(
            f"https://graph.facebook.com/v21.0/{cfg['phoneNumberId']}/messages",
            json.dumps(payload).encode("utf-8"),
            {"Authorization": f"Bearer {cfg['apiKey']}", "Content-Type": "application/json"},
        )

    if 200 <= status < 300:
        return {"sent": True}
    return {"sent": False, "reason": f"WhatsApp {status}: {text[:300]}"}


def _money(value) -> str:
    return f"{to_number(value):,.2f}"


def order_variables(order) -> dict:
    site = current_app.config["SITE_URL"]
    lines = [
        f"{i.productName} ({format_weight(i.weightGrams)}) — ₹{_money(i.lineTotal)}" for i in order.items
    ]
    items_html = "<ul>" + "".join(f"<li>{line}</li>" for line in lines) + "</ul>"
    address = ", ".join(
        p for p in [order.addressLine1, order.addressLine2, f"{order.city}, {order.state} {order.pincode}", order.country] if p
    )
    admin_url = f"{site}/admin/orders?highlight={urllib.parse.quote(order.orderNumber)}"
    summary = "\n".join(
        [
            f"Order {order.orderNumber}",
            f"Customer: {order.customerName}",
            f"Email: {order.customerEmail}",
            f"Address: {address}",
            "Items:",
            *lines,
            f"Total: ₹{_money(order.total)}",
            f"Coupon: {order.couponCode}" if order.couponCode else "",
            f"Open in admin: {admin_url}",
        ]
    ).strip()
    return {
        "orderNumber": order.orderNumber,
        "customerName": order.customerName,
        "customerEmail": order.customerEmail,
        "total": _money(order.total),
        "subtotal": _money(order.subtotal),
        "discount": _money(order.discount),
        "deliveryCharge": _money(order.deliveryCharge),
        "tax": _money(order.tax),
        "couponCode": order.couponCode or "",
        "address": address,
        "addressLine1": order.addressLine1,
        "city": order.city,
        "state": order.state,
        "pincode": order.pincode,
        "estimatedDelivery": order.estimatedDelivery or "",
        "notes": order.notes or "",
        "itemsHtml": items_html,
        "itemsText": "\n".join(lines),
        "copySummary": summary,
        "adminOrderUrl": admin_url,
        "viewOrderHtml": (
            f'<a href="{admin_url}" style="display:inline-block;margin-top:12px;padding:10px 16px;'
            'background:#1B4332;color:#fff;text-decoration:none;border-radius:8px">Open order in admin</a>'
        ),
    }


def sample_variables() -> dict:
    site = current_app.config["SITE_URL"]
    admin_url = f"{site}/admin/orders?highlight=MDF2610231234"
    return {
        "orderNumber": "MDF2610231234",
        "customerName": "Priya Sharma",
        "customerEmail": "priya@example.com",
        "total": "2,315.00",
        "subtotal": "2,350.00",
        "discount": "235.00",
        "deliveryCharge": "200.00",
        "tax": "0.00",
        "couponCode": "WELCOME10",
        "address": "12 Lake View Society, Ahmedabad, Gujarat 380015, India",
        "addressLine1": "12 Lake View Society",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "380015",
        "estimatedDelivery": "Tue, 27 Oct",
        "notes": "Please call before delivery",
        "itemsHtml": "<ul><li>Almond Mamra (500g) — ₹2,000.00</li><li>Cashew 210 (250g) — ₹350.00</li></ul>",
        "itemsText": "Almond Mamra (500g) — ₹2,000.00\nCashew 210 (250g) — ₹350.00",
        "copySummary": "Order MDF2610231234\nCustomer: Priya Sharma\nTotal: ₹2,315.00",
        "adminOrderUrl": admin_url,
        "viewOrderHtml": (
            f'<a href="{admin_url}" style="display:inline-block;margin-top:12px;padding:10px 16px;'
            'background:#1B4332;color:#fff;text-decoration:none;border-radius:8px">Open order in admin</a>'
        ),
        "name": "Rahul Mehta",
        "productName": "Cashew 210",
        "requiredQuantity": "25 kg",
        "title": "Diwali Special — 15% off gift boxes",
        "body": "Celebrate with premium dry fruits. Offer valid till 31 Oct.",
        "statusLabel": "On the way",
        "statusDescription": "Your parcel has left our store.",
        "expectedDelivery": "Expected delivery: Tue, 27 Oct, 10 am – 7 pm",
        "trackUrl": f"{site}/track/MDF2610231234",
    }


def _admin_emails(cfg: dict) -> list[str]:
    candidates = [cfg["sendgrid"].get("notifyEmail"), cfg["sendgrid"].get("fromEmail")]
    business = SiteSetting.query.filter_by(key="business").first()
    if business and isinstance(business.value, dict):
        candidates.insert(1, business.value.get("email"))
    out = []
    for email in candidates:
        email = (email or "").strip().lower()
        if "@" in email and not email.endswith("@mydryfruits.com") and email not in out:
            out.append(email)
    return out


def _run_all(app, jobs):
    def wrap(fn, *args):
        with app.app_context():
            try:
                result = fn(*args)
                if isinstance(result, dict) and not result.get("sent"):
                    app.logger.warning("[notify] %s skipped: %s", fn.__name__, result.get("reason"))
            except Exception as exc:
                app.logger.warning("[notify] %s failed: %s", fn.__name__, exc)

    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(wrap, fn, *args) for fn, *args in jobs]
        wait(futures, timeout=TIMEOUT + 2)


def notify_new_order(order) -> None:
    app = current_app._get_current_object()
    cfg = get_integrations()
    variables = order_variables(order)
    jobs = [(send_templated_email, order.customerEmail, "order_confirmation", variables)]
    admins = _admin_emails(cfg)
    if admins:
        jobs.append((send_templated_email, admins, "admin_order_notification", variables))
    if cfg["whatsapp"].get("adminNumber"):
        jobs.append(
            (
                send_whatsapp,
                cfg["whatsapp"]["adminNumber"],
                f"New order {order.orderNumber} — {order.customerName} — ₹{variables['total']}\n{variables['adminOrderUrl']}",
            )
        )
    _run_all(app, jobs)


ORDER_STATUS_TEMPLATE = {
    "key": "order_status",
    "name": "Order Status Update",
    "subject": "Your order {{orderNumber}} is now: {{statusLabel}}",
    "htmlBody": (
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2933">'
        '<h2 style="color:#1b4332;margin:0 0 12px">Hi {{customerName}},</h2>'
        '<p style="font-size:16px;margin:0 0 8px">Your order <strong>{{orderNumber}}</strong> is now '
        '<strong style="color:#1b4332">{{statusLabel}}</strong>.</p>'
        '<p style="margin:0 0 16px;color:#52606d">{{statusDescription}}</p>'
        '<p style="margin:0 0 20px;color:#52606d">{{expectedDelivery}}</p>'
        '<a href="{{trackUrl}}" style="display:inline-block;padding:12px 20px;background:#1b4332;color:#fff;'
        'text-decoration:none;border-radius:8px">Track your order</a>'
        '<p style="margin:24px 0 0;font-size:13px;color:#7b8794">Thank you for shopping with MyDryFruits.</p>'
        "</div>"
    ),
}


def ensure_status_template() -> None:
    if not EmailTemplate.query.filter_by(key=ORDER_STATUS_TEMPLATE["key"]).first():
        db.session.add(EmailTemplate(**ORDER_STATUS_TEMPLATE))
        db.session.commit()


def notify_status_change(order, view: dict) -> None:
    site = current_app.config["SITE_URL"]
    step = next((s for s in view["steps"] if s["status"] == order.status), None)
    variables = {
        "customerName": order.customerName,
        "orderNumber": order.orderNumber,
        "statusLabel": view["statusLabel"],
        "statusDescription": (step or {}).get("description") or view["message"],
        "expectedDelivery": f"Expected delivery: {view['expected']}" if view["expected"] else view["message"],
        "trackUrl": f"{site}/track/{order.orderNumber}",
    }
    _run_all(current_app._get_current_object(), [(send_templated_email, order.customerEmail, "order_status", variables)])


def notify_bulk_inquiry(inquiry) -> None:
    app = current_app._get_current_object()
    cfg = get_integrations()
    variables = {
        "name": inquiry.name,
        "productName": inquiry.productName,
        "requiredQuantity": inquiry.requiredQuantity,
    }
    jobs = [(send_templated_email, inquiry.email, "bulk_inquiry_ack", variables)]
    if cfg["whatsapp"].get("adminNumber"):
        jobs.append(
            (
                send_whatsapp,
                cfg["whatsapp"]["adminNumber"],
                f"Bulk enquiry: {inquiry.name} wants {inquiry.requiredQuantity} of {inquiry.productName} ({inquiry.email})",
            )
        )
    _run_all(app, jobs)
