from __future__ import annotations

import re
from datetime import datetime

from sqlalchemy import or_

from .extensions import db
from .models import Category, Coupon, Customer, Order, OrderItem, Product
from .utils import (
    estimate_delivery,
    generate_order_number,
    money,
    parse_names,
    price_for_weight,
    to_number,
)


def cart_from_session(session) -> list[dict]:
    return list(session.get("cart") or [])


def save_cart(session, items: list[dict]):
    session["cart"] = items
    session.modified = True


def cart_count(items: list[dict]) -> int:
    return sum(int(i.get("quantity") or 0) for i in items)


def add_to_cart(session, product: Product, weight_grams: int, quantity: int = 1):
    items = cart_from_session(session)
    quantity = max(1, min(20, int(quantity)))
    weight_grams = int(weight_grams)
    for item in items:
        if item["productId"] == product.id and int(item["weightGrams"]) == weight_grams:
            item["quantity"] = min(20, int(item["quantity"]) + quantity)
            save_cart(session, items)
            return items
    image = product.imageUrl
    if product.images:
        image = product.images[0].url or image
    items.append(
        {
            "productId": product.id,
            "name": product.name,
            "slug": product.slug,
            "imageUrl": image,
            "pricePerKg": to_number(product.pricePerKg),
            "discountPercent": product.discountPercent or 0,
            "weightGrams": weight_grams,
            "quantity": quantity,
        }
    )
    save_cart(session, items)
    return items


def line_unit(item: dict) -> float:
    unit = price_for_weight(item.get("pricePerKg") or 0, int(item.get("weightGrams") or 0))
    disc = int(item.get("discountPercent") or 0)
    if disc:
        unit = unit * (1 - disc / 100)
    return money(unit)


def cart_subtotal(items: list[dict]) -> float:
    return money(sum(line_unit(i) * int(i.get("quantity") or 1) for i in items))


def apply_coupon(subtotal: float, code: str | None):
    if not code:
        return 0.0, None, None
    coupon = Coupon.query.filter(Coupon.code == code.strip().upper()).first()
    now = datetime.utcnow()
    if not coupon or not coupon.active:
        return 0.0, None, "Invalid coupon"
    if coupon.startsAt and coupon.startsAt > now:
        return 0.0, None, "Coupon is not active yet"
    if coupon.expiresAt and coupon.expiresAt < now:
        return 0.0, None, "Coupon expired"
    if coupon.maxUses is not None and (coupon.usedCount or 0) >= coupon.maxUses:
        return 0.0, None, "Coupon usage limit reached"
    if subtotal < to_number(coupon.minPurchase):
        return 0.0, None, f"Minimum purchase ₹{coupon.minPurchase}"
    if coupon.type == "percent":
        discount = money(subtotal * to_number(coupon.value) / 100)
    else:
        discount = money(min(subtotal, to_number(coupon.value)))
    return discount, coupon, None


def build_quote(items: list[dict], coupon_code: str | None = None):
    lines = []
    for raw in items:
        product = Product.query.filter_by(id=raw["productId"], hidden=False).first()
        if not product:
            return {"error": "A product in your cart is no longer available"}
        qty = max(1, min(20, int(raw.get("quantity") or 1)))
        grams = int(raw.get("weightGrams") or 250)
        unit = price_for_weight(product.pricePerKg, grams)
        if product.discountPercent:
            unit = money(unit * (1 - product.discountPercent / 100))
        line_total = money(unit * qty)
        image = product.imageUrl
        if product.images:
            image = product.images[0].url or image
        lines.append(
            {
                "productId": product.id,
                "productName": product.name,
                "imageUrl": image,
                "weightGrams": grams,
                "quantity": qty,
                "unitPrice": unit,
                "lineTotal": line_total,
            }
        )
    subtotal = money(sum(l["lineTotal"] for l in lines))
    discount, coupon, err = apply_coupon(subtotal, coupon_code)
    if err and coupon_code:
        return {"error": err}
    delivery = 0.0
    tax = 0.0
    total = money(subtotal - discount + delivery + tax)
    return {
        "lines": lines,
        "subtotal": subtotal,
        "discount": discount,
        "deliveryCharge": delivery,
        "tax": tax,
        "total": total,
        "couponCode": coupon.code if coupon else None,
        "couponId": coupon.id if coupon else None,
    }


DETAIL_FIELDS = ["name", "email", "phone", "addressLine1", "addressLine2", "city", "state", "pincode"]


def clean_details(form) -> tuple[dict, str | None]:
    """Read and check name, phone and address fields. Returns (details, error message)."""
    d = {f: (form.get(f) or "").strip() for f in DETAIL_FIELDS}
    d["name"] = d["name"] or (form.get("customerName") or "").strip()
    d["email"] = (d["email"] or (form.get("customerEmail") or "")).strip().lower()
    phone = re.sub(r"\D", "", d["phone"])
    if len(phone) == 12 and phone.startswith("91"):
        phone = phone[2:]
    d["phone"] = phone
    d["pincode"] = re.sub(r"\D", "", d["pincode"])
    if len(d["name"]) < 2:
        return d, "Please enter your full name."
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", d["email"]):
        return d, "Please enter a valid email address, for example name@gmail.com."
    if len(phone) != 10:
        return d, "Please enter a 10-digit mobile number so the delivery partner can call you."
    if len(d["addressLine1"]) < 5:
        return d, "Please enter your house / flat number and street."
    if len(d["city"]) < 2 or len(d["state"]) < 2:
        return d, "Please enter your city and state."
    if len(d["pincode"]) != 6:
        return d, "Please enter a 6-digit PIN code."
    return d, None


def apply_details(customer: Customer, details: dict) -> None:
    customer.name = details["name"]
    customer.phone = details["phone"]
    customer.addressLine1 = details["addressLine1"]
    customer.addressLine2 = details["addressLine2"] or None
    customer.city = details["city"]
    customer.state = details["state"]
    customer.pincode = details["pincode"]
    customer.country = "India"


def customer_details(customer: Customer | None) -> dict:
    if not customer:
        return {f: "" for f in DETAIL_FIELDS}
    return {
        "name": customer.name or "",
        "email": customer.email or "",
        "phone": customer.phone or "",
        "addressLine1": customer.addressLine1 or "",
        "addressLine2": customer.addressLine2 or "",
        "city": customer.city or "",
        "state": customer.state or "",
        "pincode": customer.pincode or "",
    }


def cart_lines(items: list[dict]) -> list[dict]:
    lines = []
    for item in items:
        unit = line_unit(item)
        qty = int(item.get("quantity") or 1)
        lines.append({**item, "unit": unit, "lineTotal": money(unit * qty)})
    return lines


def reorder_into_cart(session, order) -> tuple[list[str], list[str]]:
    """Put the products of a past order back in the cart at today's price."""
    added, skipped = [], []
    for item in order.items:
        product = Product.query.filter_by(id=item.productId, hidden=False).first() if item.productId else None
        if not product or not product.inStock or product.onDemand:
            skipped.append(item.productName)
            continue
        add_to_cart(session, product, item.weightGrams, item.quantity)
        added.append(product.name)
    return added, skipped


def place_order(form, items: list[dict]):
    quote = build_quote(items, form.get("couponCode") or form.get("coupon"))
    if "error" in quote:
        return None, quote["error"]
    details, error = clean_details(form)
    if error:
        return None, error
    email = details["email"]
    name = details["name"]
    customer = Customer.query.filter_by(email=email).first()
    if not customer:
        customer = Customer(name=name, email=email, orderCount=0, totalSpent=0)
        db.session.add(customer)
    apply_details(customer, details)
    order = Order(
        orderNumber=generate_order_number(),
        customerName=name,
        customerEmail=email,
        addressLine1=details["addressLine1"],
        addressLine2=details["addressLine2"] or None,
        city=details["city"],
        state=details["state"],
        pincode=details["pincode"],
        country="India",
        notes=(form.get("notes") or "").strip() or None,
        couponCode=quote["couponCode"],
        subtotal=quote["subtotal"],
        discount=quote["discount"],
        deliveryCharge=quote["deliveryCharge"],
        tax=quote["tax"],
        total=quote["total"],
        estimatedDelivery=estimate_delivery(),
        customer=customer,
        status="PENDING",
    )
    db.session.add(order)
    db.session.flush()
    for line in quote["lines"]:
        db.session.add(
            OrderItem(
                orderId=order.id,
                productId=line["productId"],
                productName=line["productName"],
                imageUrl=line["imageUrl"],
                weightGrams=line["weightGrams"],
                unitPrice=line["unitPrice"],
                lineTotal=line["lineTotal"],
            )
        )
    customer.orderCount = (customer.orderCount or 0) + 1
    customer.totalSpent = to_number(customer.totalSpent) + quote["total"]
    customer.lastOrderAt = datetime.utcnow()
    if quote["couponId"]:
        coupon = db.session.get(Coupon, quote["couponId"])
        if coupon:
            coupon.usedCount = (coupon.usedCount or 0) + 1
    db.session.commit()
    return order, None


def search_products(q="", category="", sort="newest", availability="", premium="", best_seller="", discount=""):
    query = Product.query.filter_by(hidden=False)
    if category:
        query = query.join(Category, Product.categoryId == Category.id).filter(Category.slug == category)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            or_(
                Product.name.ilike(like),
                Product.description.ilike(like),
                Product.alternateNames.ilike(like),
            )
        )
    if availability == "in":
        query = query.filter_by(inStock=True)
    if premium == "1":
        query = query.filter_by(isPremium=True)
    if best_seller == "1":
        query = query.filter_by(isBestSeller=True)
    if discount == "1":
        query = query.filter(Product.discountPercent > 0)
    if sort == "price-asc":
        query = query.order_by(Product.pricePerKg.asc())
    elif sort == "price-desc":
        query = query.order_by(Product.pricePerKg.desc())
    else:
        query = query.order_by(Product.displayOrder.asc(), Product.createdAt.desc())
    return query.all()


def product_matches(product: Product, q: str) -> bool:
    needle = (q or "").lower().strip()
    if not needle:
        return True
    names = [product.name or "", product.description or ""] + parse_names(product.alternateNames)
    return any(needle in (n or "").lower() for n in names)
