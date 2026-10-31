from __future__ import annotations

from flask import Blueprint, current_app, flash, redirect, render_template, request, session, url_for
from sqlalchemy import func, or_, text

from .. import tracking as order_tracking
from ..commerce import (
    DETAIL_FIELDS,
    add_to_cart,
    apply_details,
    build_quote,
    cart_count,
    cart_from_session,
    cart_lines,
    cart_subtotal,
    clean_details,
    customer_details,
    place_order,
    reorder_into_cart,
    save_cart,
    search_products,
)
from ..customer import current_customer, forget, remember
from ..extensions import db
from ..notify import notify_bulk_inquiry, notify_new_order
from ..models import (
    AnalyticsEvent,
    BulkInquiry,
    Category,
    Collection,
    Customer,
    Faq,
    HomepageSection,
    NewsletterSubscriber,
    Order,
    Product,
    Review,
    SiteSetting,
)
from ..utils import WEIGHT_OPTIONS, format_inr, format_weight, parse_names, price_for_weight, to_number

bp = Blueprint("store", __name__)


def settings_map():
    rows = SiteSetting.query.all()
    return {r.key: r.value for r in rows if r.key != "integrations"}


def nav_categories():
    return Category.query.filter_by(hidden=False).order_by(Category.displayOrder.asc()).all()


@bp.app_template_filter("ist_day")
def ist_day_filter(dt):
    return order_tracking.fmt_day(dt)


@bp.app_template_filter("ist_full")
def ist_full_filter(dt):
    return order_tracking.fmt_full(dt)


@bp.app_context_processor
def inject_globals():
    items = cart_from_session(session)
    branding, policies, cats = {}, {}, []
    try:
        sm = settings_map()
        branding = sm.get("branding") or {}
        policies = sm.get("policies") or {}
        cats = nav_categories()
    except Exception:
        pass
    try:
        customer = current_customer()
    except Exception:
        customer = None
    return {
        "site_name": current_app.config["SITE_NAME"],
        "me": customer,
        "cart_count": cart_count(items),
        "nav_categories": cats,
        "format_inr": format_inr,
        "format_weight": format_weight,
        "favicon_url": (branding or {}).get("faviconUrl"),
        "policies": policies,
        "hide_nav": request.path.startswith("/admin"),
    }


@bp.get("/")
def home():
    sections = {s.key: s for s in HomepageSection.query.filter_by(enabled=True).all()}
    hero = (sections.get("hero").content if sections.get("hero") else None) or {
        "headline": "Premium Dry Fruits Delivered Fresh",
        "subheading": "100% Natural • Fresh Stock • Premium Quality",
    }
    categories = nav_categories()
    featured = (
        Product.query.filter_by(hidden=False)
        .filter(
            or_(
                Product.isFeatured.is_(True),
                Product.isBestSeller.is_(True),
                Product.isTrending.is_(True),
                Product.isNewArrival.is_(True),
            )
        )
        .order_by(Product.displayOrder.asc())
        .limit(12)
        .all()
    )
    reviews = Review.query.filter_by(hidden=False).order_by(Review.displayOrder.asc()).limit(12).all()
    faqs = Faq.query.filter_by(hidden=False).order_by(Faq.displayOrder.asc()).all()
    business = settings_map().get("business") or {}
    return render_template(
        "home.html",
        hero=hero,
        trust=(sections.get("trust").content or {}).get("items") if sections.get("trust") else [],
        categories=categories,
        featured=featured,
        reviews=reviews,
        faqs=faqs,
        years=business.get("yearsInBusiness") or 25,
    )


@bp.get("/shop/<term>")
def shop_term(term):
    category = Category.query.filter_by(slug=term, hidden=False).first()
    if category:
        return redirect(url_for("store.shop", category=category.slug))
    q = term.replace("-", " ")
    if q.endswith("s") and not q.endswith("ss"):
        q = q[:-1]
    return redirect(url_for("store.shop", q=q))


@bp.get("/shop")
def shop():
    products = search_products(
        q=request.args.get("q") or "",
        category=request.args.get("category") or "",
        sort=request.args.get("sort") or "newest",
        availability=request.args.get("availability") or "",
        premium=request.args.get("premium") or "",
        best_seller=request.args.get("bestSeller") or "",
        discount=request.args.get("discount") or "",
    )
    return render_template(
        "shop.html",
        products=products,
        categories=nav_categories(),
        q=request.args.get("q") or "",
        category=request.args.get("category") or "",
        sort=request.args.get("sort") or "newest",
        weights=WEIGHT_OPTIONS,
    )


@bp.get("/product/<slug>")
def product(slug):
    item = Product.query.filter_by(slug=slug, hidden=False).first_or_404()
    related = (
        Product.query.filter(Product.categoryId == item.categoryId, Product.id != item.id, Product.hidden.is_(False))
        .limit(8)
        .all()
    )
    return render_template("product.html", product=item, related=related, weights=WEIGHT_OPTIONS, names=parse_names(item.alternateNames))


@bp.post("/cart/add")
def cart_add():
    product = Product.query.filter_by(id=request.form.get("productId"), hidden=False).first_or_404()
    nxt = request.form.get("next") or url_for("store.cart")
    if not nxt.startswith("/") or nxt.startswith("//"):
        nxt = url_for("store.cart")
    if not product.inStock or product.onDemand:
        flash(f"{product.name} is out of stock right now. Use 'Ask for price / bulk order' on the product page.", "error")
        return redirect(nxt)
    grams = int(request.form.get("weightGrams") or 500)
    add_to_cart(session, product, grams, int(request.form.get("quantity") or 1))
    flash(f"Added {product.name} ({format_weight(grams)}) to your cart.", "cart")
    return redirect(nxt)


@bp.get("/cart")
def cart():
    items = cart_from_session(session)
    return render_template("cart.html", lines=cart_lines(items), subtotal=cart_subtotal(items))


@bp.post("/cart/update")
def cart_update():
    items = cart_from_session(session)
    pid = request.form.get("productId")
    grams = int(request.form.get("weightGrams") or 0)
    action = request.form.get("action")
    if action == "remove":
        items = [i for i in items if not (i["productId"] == pid and int(i["weightGrams"]) == grams)]
        flash("Item removed from your cart.", "success")
    else:
        for i in items:
            if i["productId"] == pid and int(i["weightGrams"]) == grams:
                qty = int(i.get("quantity") or 1)
                if action == "inc":
                    qty += 1
                elif action == "dec":
                    qty -= 1
                else:
                    qty = int(request.form.get("quantity") or qty)
                i["quantity"] = max(1, min(20, qty))
    save_cart(session, items)
    return redirect(url_for("store.cart"))


def _my_order_numbers() -> list[str]:
    return list(session.get("my_orders") or [])


def _remember_order_number(number: str) -> None:
    numbers = [n for n in _my_order_numbers() if n != number]
    session["my_orders"] = ([number] + numbers)[:20]
    session.modified = True


def _lookup_email() -> str:
    return session.get("lookup_email") or ""


def access_level(order: Order) -> str | None:
    """"full" for the device that ordered (or admin), "limited" for an email-only lookup, else None."""
    if session.get("admin_id"):
        return "full"
    customer = current_customer()
    if customer and (order.customerId == customer.id or order.customerEmail == customer.email):
        return "full"
    if order.orderNumber in _my_order_numbers():
        return "full"
    if _lookup_email() and order.customerEmail.lower() == _lookup_email():
        return "limited"
    return None


def can_view(order: Order) -> bool:
    return access_level(order) is not None


def known_orders(active_only: bool = False) -> list[Order]:
    """Every order this visitor may see: this device's orders plus an email lookup, newest first."""
    filters = []
    customer = current_customer()
    if customer:
        filters += [Order.customerId == customer.id, Order.customerEmail == customer.email]
    if _my_order_numbers():
        filters.append(Order.orderNumber.in_(_my_order_numbers()))
    if _lookup_email():
        filters.append(func.lower(Order.customerEmail) == _lookup_email())
    if not filters:
        return []
    query = Order.query.filter(or_(*filters))
    if active_only:
        query = query.filter(Order.status.notin_(["DELIVERED", "CANCELLED"]))
    return query.order_by(Order.createdAt.desc()).all()


@bp.app_template_filter("mask_phone")
def mask_phone(value: str) -> str:
    digits = "".join(ch for ch in (value or "") if ch.isdigit())
    return f"••••••{digits[-4:]}" if len(digits) >= 4 else ""


@bp.app_template_filter("mask_email")
def mask_email(value: str) -> str:
    name, _, domain = (value or "").partition("@")
    if not domain:
        return value or ""
    return f"{name[:2]}{'•' * max(2, len(name) - 2)}@{domain}"


@bp.route("/checkout", methods=["GET", "POST"])
def checkout():
    items = cart_from_session(session)
    if not items:
        flash("Your cart is empty. Add a few products first.", "error")
        return redirect(url_for("store.shop"))
    error = None
    coupon = (request.values.get("coupon") or "").strip()
    details = customer_details(current_customer())
    if request.method == "POST":
        details = {**details, **{f: (request.form.get(f) or "").strip() for f in DETAIL_FIELDS}}
    quote = build_quote(items, coupon or None)
    if request.method == "POST" and request.form.get("place") == "1":
        order, error = place_order(request.form, items)
        if order:
            save_cart(session, [])
            remember(order.customer)
            _remember_order_number(order.orderNumber)
            tracking_view = order_tracking.view(order)
            order.estimatedDelivery = tracking_view["expected"] or order.estimatedDelivery
            db.session.add(AnalyticsEvent(type="order_placed", path="/checkout", meta={"orderNumber": order.orderNumber}))
            db.session.commit()
            try:
                notify_new_order(order)
            except Exception as exc:
                current_app.logger.warning("[notify] order %s: %s", order.orderNumber, exc)
            return redirect(url_for("store.order", order_number=order.orderNumber))
    elif request.method == "POST" and coupon and "error" not in quote:
        flash(f"Coupon {coupon.upper()} applied — you save {format_inr(quote['discount'])}.", "success")
    if "error" in quote:
        error = error or quote["error"]
        quote = build_quote(items, None)
        coupon = ""
    return render_template(
        "checkout.html",
        lines=cart_lines(items),
        quote=quote,
        error=error,
        coupon=coupon,
        details=details,
        remembered=bool(current_customer()),
    )


@bp.get("/order/<order_number>")
def order(order_number):
    row = Order.query.filter_by(orderNumber=order_number).first_or_404()
    level = access_level(row)
    if not level:
        flash("To see this order, enter the email address you used when ordering.", "error")
        return redirect(url_for("store.my_orders"))
    order_tracking.auto_advance(row)
    return render_template("order.html", order=row, t=order_tracking.view(row), limited=level == "limited")


# ── My orders (no login: this device's orders, or look up by email) ─────────────

@bp.get("/my-orders")
def my_orders():
    customer = current_customer()
    orders = known_orders()
    settings = order_tracking.get_settings()
    order_tracking.refresh([o for o in orders if o.status not in ("DELIVERED", "CANCELLED")], settings)
    views = {o.id: order_tracking.view(o, settings) for o in orders}
    levels = {o.id: access_level(o) for o in orders}
    return render_template(
        "my_orders.html",
        customer=customer,
        orders=orders,
        views=views,
        levels=levels,
        lookup_email=_lookup_email(),
    )


LOOKUP_LIMIT = 15


@bp.post("/my-orders/find")
def find_orders():
    email = (request.form.get("email") or "").strip().lower()
    target = url_for("store.track") if request.form.get("next") == "track" else url_for("store.my_orders")
    tries = int(session.get("lookup_tries") or 0)
    if tries >= LOOKUP_LIMIT:
        flash("Too many searches from this browser. Please try again later or contact us.", "error")
        return redirect(target)
    session["lookup_tries"] = tries + 1
    if "@" not in email:
        flash("Please enter the email address you used when ordering.", "error")
        return redirect(target)
    count = Order.query.filter(func.lower(Order.customerEmail) == email).count()
    if not count:
        flash("We couldn't find any orders for that email. Check the spelling, or try the other email you may have used.", "error")
        return redirect(target)
    session["lookup_email"] = email
    flash(f"Showing {count} order{'' if count == 1 else 's'} for {mask_email(email)}.", "success")
    return redirect(target)


@bp.post("/my-orders/clear-lookup")
def clear_lookup():
    session.pop("lookup_email", None)
    return redirect(request.form.get("next") or url_for("store.my_orders"))


@bp.route("/my-details", methods=["GET", "POST"])
def my_details():
    customer = current_customer()
    if not customer:
        flash("Place an order or find your orders first, then you can edit your saved details here.", "error")
        return redirect(url_for("store.my_orders"))
    details = customer_details(customer)
    error = None
    if request.method == "POST":
        form = {**request.form.to_dict(), "email": customer.email}
        details, error = clean_details(form)
        if not error:
            apply_details(customer, details)
            db.session.commit()
            flash("Your details are saved. They will be filled in automatically at checkout.", "success")
            return redirect(url_for("store.my_orders"))
    return render_template("my_details.html", details=details, error=error)


@bp.post("/forget-me")
def forget_me():
    forget()
    session.pop("my_orders", None)
    session.pop("lookup_email", None)
    flash("Done. This device no longer remembers your details.", "success")
    return redirect(url_for("store.home"))


@bp.post("/reorder/<order_number>")
def reorder(order_number):
    row = Order.query.filter_by(orderNumber=order_number).first_or_404()
    if not can_view(row):
        return redirect(url_for("store.my_orders"))
    added, skipped = reorder_into_cart(session, row)
    if added:
        flash("Items from your order are in the cart. Change weights or quantities if you like, then checkout.", "success")
    if skipped:
        flash("Not available right now: " + ", ".join(skipped), "error")
    return redirect(url_for("store.cart"))


# ── Tracking ─────────────────────────────────────────────

@bp.get("/track")
def track():
    settings = order_tracking.get_settings()
    active = known_orders(active_only=True)
    order_tracking.refresh(active, settings)
    active = [o for o in active if o.status not in ("DELIVERED", "CANCELLED")]
    views = {o.id: order_tracking.view(o, settings) for o in active}
    knows_visitor = bool(current_customer() or _my_order_numbers() or _lookup_email())
    return render_template(
        "track.html",
        active=active,
        views=views,
        knows_visitor=knows_visitor,
        lookup_email=_lookup_email(),
        delivered_count=len(known_orders()) - len(active) if knows_visitor else 0,
    )


@bp.get("/track/<order_number>")
def track_order(order_number):
    row = Order.query.filter_by(orderNumber=order_number.upper()).first()
    level = access_level(row) if row else None
    if not level:
        flash("Enter the email address you used when ordering to see your orders.", "error")
        return redirect(url_for("store.track"))
    order_tracking.auto_advance(row)
    return render_template("track_order.html", order=row, t=order_tracking.view(row), limited=level == "limited")


# ── Invoice (printable; "Save as PDF" from the browser) ─────────────

NUM_WORDS = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS_WORDS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def _words_below_100(n: int) -> str:
    if n < 20:
        return NUM_WORDS[n]
    return TENS_WORDS[n // 10] + ("-" + NUM_WORDS[n % 10] if n % 10 else "")


def _words_below_1000(n: int) -> str:
    hundreds, rest = divmod(n, 100)
    parts = [f"{NUM_WORDS[hundreds]} hundred"] if hundreds else []
    if rest:
        parts.append(_words_below_100(rest))
    return " ".join(parts)


def rupees_in_words(amount) -> str:
    n = int(round(float(amount or 0)))
    if n == 0:
        return "Rupees zero only"
    parts = []
    for size, label in ((10_000_000, "crore"), (100_000, "lakh"), (1_000, "thousand")):
        if n >= size:
            parts.append(f"{_words_below_1000(n // size)} {label}")
            n %= size
    if n:
        parts.append(_words_below_1000(n))
    return "Rupees " + " ".join(parts) + " only"


@bp.get("/invoice/<order_number>")
def invoice(order_number):
    row = Order.query.filter_by(orderNumber=order_number.upper()).first()
    level = access_level(row) if row else None
    if not level:
        flash("Enter the email address you used when ordering to see your invoice.", "error")
        return redirect(url_for("store.my_orders"))
    business = settings_map().get("business") or {}
    return render_template(
        "invoice.html",
        order=row,
        business=business if isinstance(business, dict) else {},
        limited=level == "limited",
        amount_words=rupees_in_words(row.total),
    )


@bp.get("/collections")
def collections():
    rows = Collection.query.filter_by(hidden=False).order_by(Collection.displayOrder.asc()).all()
    return render_template("collections.html", collections=rows)


@bp.get("/collections/<slug>")
def collection_detail(slug):
    row = Collection.query.filter_by(slug=slug, hidden=False).first_or_404()
    return render_template("collection.html", collection=row)


@bp.get("/offers")
def offers():
    products = Product.query.filter(Product.hidden.is_(False), Product.discountPercent > 0).all()
    return render_template("offers.html", products=products)


@bp.get("/about")
def about():
    return render_template("about.html", years=(settings_map().get("business") or {}).get("yearsInBusiness") or 25)


@bp.route("/contact", methods=["GET", "POST"])
def contact():
    if request.method == "POST":
        flash("Thanks — we will get back to you shortly.", "success")
        return redirect(url_for("store.contact"))
    biz = settings_map().get("business") or {}
    return render_template("contact.html", biz=biz)


@bp.post("/newsletter")
def newsletter():
    email = (request.form.get("email") or "").strip().lower()
    if email and "@" in email:
        if not NewsletterSubscriber.query.filter_by(email=email).first():
            db.session.add(NewsletterSubscriber(email=email))
            db.session.commit()
        flash("Subscribed to newsletter", "success")
    return redirect(request.referrer or url_for("store.home"))


@bp.post("/bulk")
def bulk():
    inquiry = BulkInquiry(
        name=request.form.get("name") or "",
        email=request.form.get("email") or "",
        productId=request.form.get("productId"),
        productName=request.form.get("productName") or "",
        requiredQuantity=request.form.get("requiredQuantity") or "",
        message=request.form.get("message"),
    )
    db.session.add(inquiry)
    db.session.commit()
    try:
        notify_bulk_inquiry(inquiry)
    except Exception as exc:
        current_app.logger.warning("[notify] bulk inquiry: %s", exc)
    flash("Bulk enquiry sent", "success")
    return redirect(request.referrer or url_for("store.shop"))


@bp.get("/privacy")
def privacy():
    return render_template("legal.html", title="Privacy Policy", body=(settings_map().get("policies") or {}).get("privacy") or "We respect your privacy.")


@bp.get("/terms")
def terms():
    return render_template("legal.html", title="Terms", body=(settings_map().get("policies") or {}).get("terms") or "Standard terms apply.")


@bp.get("/refund")
def refund():
    return render_template("legal.html", title="Refund Policy", body=(settings_map().get("policies") or {}).get("refund") or "Contact us for refunds.")


@bp.get("/health")
def health():
    try:
        db.session.execute(text("SELECT 1"))
        return {"ok": True, "brand": "MyDryFruits", "db": "up"}
    except Exception:
        return {"ok": False, "brand": "MyDryFruits", "db": "down"}, 503


@bp.get("/sitemap.xml")
def sitemap():
    products = Product.query.filter_by(hidden=False).all()
    cats = nav_categories()
    cols = Collection.query.filter_by(hidden=False).all()
    base = current_app.config["SITE_URL"]
    urls = ["", "/shop", "/collections", "/about", "/contact", "/offers"]
    urls += [f"/shop?category={c.slug}" for c in cats]
    urls += [f"/product/{p.slug}" for p in products]
    urls += [f"/collections/{c.slug}" for c in cols]
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    xml += [f"<url><loc>{base}{u}</loc></url>" for u in urls]
    xml.append("</urlset>")
    return current_app.response_class("\n".join(xml), mimetype="application/xml")


@bp.get("/robots.txt")
def robots():
    return current_app.response_class(
        f"User-agent: *\nAllow: /\nSitemap: {current_app.config['SITE_URL']}/sitemap.xml\n",
        mimetype="text/plain",
    )
