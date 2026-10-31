"""Remember a customer on their device without a login (signed cookie, 1 year)."""
from __future__ import annotations

from flask import after_this_request, current_app, g, request
from itsdangerous import BadSignature, URLSafeTimedSerializer

from .models import Customer

COOKIE = "mdf_customer"
MAX_AGE = 365 * 24 * 3600


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="customer-device")


def current_customer() -> Customer | None:
    if "customer" in g:
        return g.customer
    customer = None
    raw = request.cookies.get(COOKIE)
    if raw:
        try:
            customer_id = _serializer().loads(raw, max_age=MAX_AGE)
            customer = Customer.query.get(customer_id)
        except BadSignature:
            customer = None
    g.customer = customer
    return customer


def remember(customer: Customer) -> None:
    token = _serializer().dumps(customer.id)
    g.customer = customer

    @after_this_request
    def _set(response):
        response.set_cookie(
            COOKIE,
            token,
            max_age=MAX_AGE,
            httponly=True,
            samesite="Lax",
            secure=current_app.config.get("SESSION_COOKIE_SECURE", False),
        )
        return response


def forget() -> None:
    g.customer = None

    @after_this_request
    def _clear(response):
        response.delete_cookie(COOKIE)
        return response
