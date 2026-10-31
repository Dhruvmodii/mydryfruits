import json
from datetime import datetime
from functools import wraps

import bcrypt
from flask import Blueprint, current_app, flash, redirect, render_template, request, session, url_for
from sqlalchemy import func

from .. import tracking as order_tracking
from ..extensions import db
from ..models import (
    Admin,
    AnalyticsEvent,
    BulkInquiry,
    Category,
    Collection,
    CollectionItem,
    Coupon,
    Customer,
    EmailTemplate,
    Faq,
    HomepageSection,
    MediaAsset,
    Order,
    Product,
    Review,
    SeoPage,
    SiteSetting,
)
from ..notify import (
    EMAIL_PROVIDERS,
    email_ready,
    get_integrations,
    notify_status_change,
    render_text,
    sample_variables,
    save_integrations,
    secret_hint,
    send_email,
    send_whatsapp,
)
from ..uploads import upload_image
from ..utils import slugify, to_number

bp = Blueprint("admin", __name__, url_prefix="/admin")
NAV = [
    ("admin.dashboard", "Dashboard"),
    ("admin.products", "Products"),
    ("admin.categories", "Categories"),
    ("admin.collections", "Collections"),
    ("admin.orders", "Orders"),
    ("admin.tracking_settings", "Order tracking"),
    ("admin.customers", "Customers"),
    ("admin.coupons", "Coupons"),
    ("admin.homepage", "Homepage"),
    ("admin.reviews", "Reviews"),
    ("admin.faqs", "FAQ"),
    ("admin.emails", "Email Builder"),
    ("admin.media", "Media"),
    ("admin.seo", "SEO"),
    ("admin.analytics", "Analytics"),
    ("admin.bulk", "Bulk Orders"),
    ("admin.settings", "Settings"),
]


def login_required(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        if not session.get("admin_id"):
            return redirect(url_for("admin.login"))
        return fn(*args, **kwargs)

    return wrapped


@bp.context_processor
def admin_nav():
    return {"admin_nav": NAV}


@bp.route("/login", methods=["GET", "POST"])
def login():
    if session.get("admin_id"):
        return redirect(url_for("admin.dashboard"))
    error = None
    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        admin = Admin.query.filter_by(email=email).first()
        if admin and bcrypt.checkpw(password.encode(), admin.passwordHash.encode()):
            session["admin_id"] = admin.id
            session["admin_email"] = admin.email
            return redirect(url_for("admin.dashboard"))
        error = "Invalid credentials"
    return render_template("admin/login.html", error=error)


@bp.post("/logout")
@login_required
def logout():
    session.clear()
    return redirect(url_for("admin.login"))


@bp.get("/")
@login_required
def dashboard():
    return render_template(
        "admin/dashboard.html",
        orders=Order.query.count(),
        products=Product.query.filter_by(hidden=False).count(),
        customers=Customer.query.count(),
        revenue=to_number(db.session.query(func.coalesce(func.sum(Order.total), 0)).scalar()),
        recent=Order.query.order_by(Order.createdAt.desc()).limit(8).all(),
    )


@bp.route("/products", methods=["GET", "POST"])
@login_required
def products():
    if request.method == "POST":
        action = request.form.get("action")
        if action == "delete":
            row = db.session.get(Product, request.form.get("id"))
            if row:
                db.session.delete(row)
                db.session.commit()
                flash("Product deleted", "success")
        else:
            pid = request.form.get("id")
            row = db.session.get(Product, pid) if pid else Product()
            row.name = request.form.get("name")
            row.slug = slugify(request.form.get("slug") or row.name)
            row.description = request.form.get("description")
            row.pricePerKg = request.form.get("pricePerKg") or 0
            row.imageUrl = request.form.get("imageUrl")
            row.categoryId = request.form.get("categoryId")
            row.inStock = request.form.get("inStock") == "on"
            row.hidden = request.form.get("hidden") == "on"
            row.isFeatured = request.form.get("isFeatured") == "on"
            row.isBestSeller = request.form.get("isBestSeller") == "on"
            row.discountPercent = int(request.form.get("discountPercent") or 0)
            if not pid:
                db.session.add(row)
            db.session.commit()
            flash("Product saved", "success")
        return redirect(url_for("admin.products"))
    return render_template(
        "admin/products.html",
        items=Product.query.order_by(Product.name.asc()).all(),
        categories=Category.query.order_by(Category.displayOrder.asc()).all(),
    )


@bp.route("/categories", methods=["GET", "POST"])
@login_required
def categories():
    if request.method == "POST":
        if request.form.get("action") == "delete":
            row = db.session.get(Category, request.form.get("id"))
            if row:
                db.session.delete(row)
                db.session.commit()
        else:
            cid = request.form.get("id")
            row = db.session.get(Category, cid) if cid else Category()
            row.name = request.form.get("name")
            row.slug = slugify(request.form.get("slug") or row.name)
            row.description = request.form.get("description")
            row.displayOrder = int(request.form.get("displayOrder") or 0)
            row.hidden = request.form.get("hidden") == "on"
            if not cid:
                db.session.add(row)
            db.session.commit()
        return redirect(url_for("admin.categories"))
    return render_template("admin/simple_list.html", title="Categories", kind="category", items=Category.query.order_by(Category.displayOrder).all())


@bp.route("/collections", methods=["GET", "POST"])
@login_required
def collections():
    if request.method == "POST":
        if request.form.get("action") == "delete":
            row = db.session.get(Collection, request.form.get("id"))
            if row:
                db.session.delete(row)
                db.session.commit()
        else:
            cid = request.form.get("id")
            row = db.session.get(Collection, cid) if cid else Collection()
            row.name = request.form.get("name")
            row.slug = slugify(request.form.get("slug") or row.name)
            row.description = request.form.get("description")
            row.imageUrl = request.form.get("imageUrl")
            if not cid:
                db.session.add(row)
            db.session.commit()
            ids = request.form.getlist("productIds")
            CollectionItem.query.filter_by(collectionId=row.id).delete()
            for pid in ids:
                db.session.add(CollectionItem(collectionId=row.id, productId=pid, weightGrams=250))
            db.session.commit()
        return redirect(url_for("admin.collections"))
    return render_template(
        "admin/collections.html",
        items=Collection.query.order_by(Collection.displayOrder).all(),
        products=Product.query.filter_by(hidden=False).all(),
    )


def _change_status(order, status: str, note: str = "") -> None:
    if order_tracking.set_status(order, status, note, source="admin"):
        settings = order_tracking.get_settings()
        if settings["notifyCustomer"]:
            try:
                notify_status_change(order, order_tracking.view(order, settings))
            except Exception as exc:
                current_app.logger.warning("[notify] status %s: %s", order.orderNumber, exc)
        flash(f"Order {order.orderNumber} is now: {settings['steps'].get(status, {}).get('label', status.title())}", "success")


@bp.route("/orders", methods=["GET", "POST"])
@login_required
def orders():
    if request.method == "POST":
        row = db.session.get(Order, request.form.get("id"))
        if row and request.form.get("status"):
            _change_status(row, request.form["status"])
        return redirect(request.referrer or url_for("admin.orders"))
    status_filter = request.args.get("status") or ""
    query = Order.query
    if status_filter:
        query = query.filter_by(status=status_filter)
    items = query.order_by(Order.createdAt.desc()).all()
    settings = order_tracking.get_settings()
    order_tracking.refresh([o for o in items if o.status not in ("DELIVERED", "CANCELLED")], settings)
    counts = dict(db.session.query(Order.status, func.count(Order.id)).group_by(Order.status).all())
    return render_template(
        "admin/orders.html",
        items=items,
        highlight=request.args.get("highlight"),
        statuses=order_tracking.ALL_STATUSES,
        labels={s: settings["steps"][s]["label"] if s in settings["steps"] else "Cancelled" for s in order_tracking.ALL_STATUSES},
        status_filter=status_filter,
        counts=counts,
        views={o.id: order_tracking.view(o, settings) for o in items},
    )


def _parse_local_dt(value: str):
    value = (value or "").strip()
    if not value:
        return None
    try:
        return order_tracking.from_ist(datetime.fromisoformat(value))
    except ValueError:
        return None


@bp.route("/orders/<order_id>", methods=["GET", "POST"])
@login_required
def order_detail(order_id):
    order = db.session.get(Order, order_id)
    if not order:
        flash("Order not found", "error")
        return redirect(url_for("admin.orders"))
    settings = order_tracking.get_settings()
    tracking = order_tracking.ensure_tracking(order, settings)
    if request.method == "POST":
        action = request.form.get("action")
        if action == "status":
            _change_status(order, request.form.get("status") or order.status, request.form.get("note") or "")
        elif action == "tracking":
            tracking.autoUpdate = request.form.get("autoUpdate") == "on"
            start = _parse_local_dt(request.form.get("estimatedFrom"))
            end = _parse_local_dt(request.form.get("estimatedTo"))
            if start and end and end < start:
                start, end = end, start
            if request.form.get("resetWindow") == "on":
                start, end = order_tracking.default_window(order.createdAt, settings)
            tracking.estimatedFrom = start or tracking.estimatedFrom
            tracking.estimatedTo = end or tracking.estimatedTo
            tracking.courierName = (request.form.get("courierName") or "").strip() or None
            url = (request.form.get("trackingUrl") or "").strip()
            tracking.trackingUrl = url if url.startswith(("http://", "https://")) else None
            tracking.customerNote = (request.form.get("customerNote") or "").strip() or None
            order.estimatedDelivery = order_tracking.fmt_window(tracking.estimatedFrom, tracking.estimatedTo)
            db.session.commit()
            flash("Delivery details saved. The customer sees them on the tracking page.", "success")
        return redirect(url_for("admin.order_detail", order_id=order.id))
    order_tracking.auto_advance(order, settings)
    view = order_tracking.view(order, settings)
    to_input = lambda dt: order_tracking.to_ist(dt).strftime("%Y-%m-%dT%H:%M") if dt else ""
    return render_template(
        "admin/order_detail.html",
        order=order,
        t=view,
        tracking=tracking,
        statuses=order_tracking.ALL_STATUSES,
        labels={s: settings["steps"][s]["label"] if s in settings["steps"] else "Cancelled" for s in order_tracking.ALL_STATUSES},
        est_from=to_input(tracking.estimatedFrom),
        est_to=to_input(tracking.estimatedTo),
        settings=settings,
    )


@bp.route("/tracking", methods=["GET", "POST"])
@login_required
def tracking_settings():
    if request.method == "POST":
        order_tracking.save_settings(request.form)
        flash("Tracking settings saved. They apply to all orders right away.", "success")
        return redirect(url_for("admin.tracking_settings"))
    settings = order_tracking.get_settings()
    sample = Order.query.order_by(Order.createdAt.desc()).first()
    return render_template(
        "admin/tracking.html",
        s=settings,
        statuses=order_tracking.STATUSES,
        sample_window=order_tracking.fmt_window(*order_tracking.default_window(datetime.utcnow(), settings)),
        has_orders=bool(sample),
    )


@bp.get("/customers")
@login_required
def customers():
    return render_template("admin/customers.html", items=Customer.query.order_by(Customer.createdAt.desc()).all())


@bp.route("/coupons", methods=["GET", "POST"])
@login_required
def coupons():
    if request.method == "POST":
        if request.form.get("action") == "delete":
            row = db.session.get(Coupon, request.form.get("id"))
            if row:
                db.session.delete(row)
                db.session.commit()
        else:
            cid = request.form.get("id")
            row = db.session.get(Coupon, cid) if cid else Coupon()
            row.code = (request.form.get("code") or "").strip().upper()
            row.type = request.form.get("type") or "percent"
            row.value = request.form.get("value") or 0
            row.minPurchase = request.form.get("minPurchase") or 0
            row.maxUses = int(request.form.get("maxUses")) if request.form.get("maxUses") else None
            row.active = request.form.get("active") == "on"
            starts = request.form.get("startsAt")
            expires = request.form.get("expiresAt")
            row.startsAt = datetime.fromisoformat(starts) if starts else None
            row.expiresAt = datetime.fromisoformat(expires) if expires else None
            if not cid:
                db.session.add(row)
            db.session.commit()
        return redirect(url_for("admin.coupons"))
    return render_template("admin/coupons.html", items=Coupon.query.order_by(Coupon.createdAt.desc()).all())


@bp.route("/homepage", methods=["GET", "POST"])
@login_required
def homepage():
    section = HomepageSection.query.filter_by(key="hero").first()
    if request.method == "POST":
        raw = request.form.get("content") or "{}"
        try:
            content = json.loads(raw)
        except json.JSONDecodeError:
            flash("Invalid JSON", "error")
            return redirect(url_for("admin.homepage"))
        if not section:
            section = HomepageSection(key="hero", title="Hero", content=content, enabled=True)
            db.session.add(section)
        else:
            section.content = content
        db.session.commit()
        flash("Homepage saved", "success")
        return redirect(url_for("admin.homepage"))
    return render_template("admin/homepage.html", content=json.dumps((section.content if section else {}), indent=2))


@bp.route("/reviews", methods=["GET", "POST"])
@login_required
def reviews():
    if request.method == "POST":
        if request.form.get("action") == "delete":
            row = db.session.get(Review, request.form.get("id"))
            if row:
                db.session.delete(row)
                db.session.commit()
        else:
            row = Review(
                customerName=request.form.get("customerName"),
                rating=int(request.form.get("rating") or 5),
                comment=request.form.get("comment"),
                productName=request.form.get("productName"),
            )
            db.session.add(row)
            db.session.commit()
        return redirect(url_for("admin.reviews"))
    return render_template("admin/reviews.html", items=Review.query.order_by(Review.displayOrder).all())


@bp.route("/faqs", methods=["GET", "POST"])
@login_required
def faqs():
    if request.method == "POST":
        if request.form.get("action") == "delete":
            row = db.session.get(Faq, request.form.get("id"))
            if row:
                db.session.delete(row)
                db.session.commit()
        else:
            db.session.add(Faq(question=request.form.get("question"), answer=request.form.get("answer")))
            db.session.commit()
        return redirect(url_for("admin.faqs"))
    return render_template("admin/faqs.html", items=Faq.query.order_by(Faq.displayOrder).all())


@bp.route("/emails", methods=["GET", "POST"])
@login_required
def emails():
    if request.method == "POST":
        row = EmailTemplate.query.filter_by(key=request.form.get("key")).first()
        if row:
            row.subject = request.form.get("subject") or row.subject
            row.htmlBody = request.form.get("htmlBody") or row.htmlBody
            db.session.commit()
            flash("Template saved", "success")
        return redirect(url_for("admin.emails"))
    cfg = get_integrations()["sendgrid"]
    return render_template(
        "admin/emails.html",
        items=EmailTemplate.query.all(),
        sample=sample_variables(),
        from_name=cfg.get("fromName") or "MyDryFruits",
        from_email=cfg.get("fromEmail") or "orders@yourdomain.com",
        sendgrid_ready=email_ready(cfg),
        email_provider=EMAIL_PROVIDERS.get(cfg.get("provider") or "sendgrid", "Email"),
    )


@bp.post("/emails/test")
@login_required
def email_test():
    to = (request.form.get("to") or "").strip()
    subject = request.form.get("subject") or ""
    body = request.form.get("htmlBody") or ""
    if "@" not in to:
        flash("Enter an email address for the test", "error")
        return redirect(url_for("admin.emails"))
    sample = sample_variables()
    result = send_email(to, "[TEST] " + render_text(subject, sample), render_text(body, sample))
    if result.get("sent"):
        flash(f"Test email sent to {to}", "success")
    else:
        flash(f"Test email not sent: {result.get('reason')}", "error")
    return redirect(url_for("admin.emails"))


@bp.route("/media", methods=["GET", "POST"])
@login_required
def media():
    if request.method == "POST":
        if request.form.get("action") == "delete":
            row = db.session.get(MediaAsset, request.form.get("id"))
            if row:
                db.session.delete(row)
                db.session.commit()
        else:
            f = request.files.get("file")
            try:
                url, public_id = upload_image(f)
                db.session.add(MediaAsset(url=url, publicId=public_id, type="image", bytes=f.content_length))
                db.session.commit()
                flash("Uploaded", "success")
            except Exception as exc:
                flash(str(exc), "error")
        return redirect(url_for("admin.media"))
    return render_template("admin/media.html", items=MediaAsset.query.order_by(MediaAsset.createdAt.desc()).all())


@bp.route("/seo", methods=["GET", "POST"])
@login_required
def seo():
    if request.method == "POST":
        path = request.form.get("path") or "/"
        row = SeoPage.query.filter_by(path=path).first() or SeoPage(path=path)
        row.title = request.form.get("title")
        row.description = request.form.get("description")
        row.keywords = request.form.get("keywords")
        if not row.id:
            db.session.add(row)
        else:
            existing = SeoPage.query.filter_by(path=path).first()
            if existing:
                existing.title = row.title
                existing.description = row.description
                existing.keywords = row.keywords
        db.session.commit()
        flash("SEO saved", "success")
        return redirect(url_for("admin.seo"))
    return render_template("admin/seo.html", items=SeoPage.query.all())


@bp.get("/analytics")
@login_required
def analytics():
    return render_template(
        "admin/analytics.html",
        events=AnalyticsEvent.query.order_by(AnalyticsEvent.createdAt.desc()).limit(50).all(),
    )


@bp.get("/bulk")
@login_required
def bulk():
    return render_template("admin/bulk.html", items=BulkInquiry.query.order_by(BulkInquiry.createdAt.desc()).all())


@bp.route("/settings", methods=["GET", "POST"])
@login_required
def settings():
    if request.method == "POST":
        key = request.form.get("key") or "business"
        raw = request.form.get("value") or "{}"
        try:
            value = json.loads(raw)
        except json.JSONDecodeError:
            flash("Invalid JSON", "error")
            return redirect(url_for("admin.settings"))
        row = SiteSetting.query.filter_by(key=key).first()
        if not row:
            row = SiteSetting(key=key, value=value)
            db.session.add(row)
        else:
            row.value = value
        db.session.commit()
        flash("Settings saved", "success")
        return redirect(url_for("admin.settings"))
    rows = [r for r in SiteSetting.query.all() if r.key != "integrations"]
    integrations = get_integrations()
    return render_template(
        "admin/settings.html",
        items=rows,
        integrations=integrations,
        sendgrid_key_hint=secret_hint(integrations["sendgrid"]["apiKey"]),
        email_secret_hint=secret_hint(integrations["sendgrid"]["apiSecret"]),
        email_ready=email_ready(integrations["sendgrid"]),
        whatsapp_key_hint=secret_hint(integrations["whatsapp"]["apiKey"]),
        whatsapp_secret_hint=secret_hint(integrations["whatsapp"]["apiSecret"]),
    )


@bp.post("/settings/integrations")
@login_required
def settings_integrations():
    save_integrations(request.form)
    flash("Mail & WhatsApp settings saved", "success")
    return redirect(url_for("admin.settings") + "#integrations")


@bp.post("/settings/test-email")
@login_required
def settings_test_email():
    to = (request.form.get("to") or "").strip()
    result = send_email(
        to,
        "MyDryFruits test email",
        "<p>Your SendGrid setup works. Order emails will be sent from this address.</p>",
    )
    if result.get("sent"):
        flash(f"Test email sent to {to}", "success")
    else:
        flash(f"Test email not sent: {result.get('reason')}", "error")
    return redirect(url_for("admin.settings") + "#integrations")


@bp.post("/settings/test-whatsapp")
@login_required
def settings_test_whatsapp():
    to = (request.form.get("to") or "").strip()
    result = send_whatsapp(to, "MyDryFruits test message: WhatsApp alerts are working.")
    if result.get("sent"):
        flash(f"Test WhatsApp sent to {to}", "success")
    else:
        flash(f"Test WhatsApp not sent: {result.get('reason')}", "error")
    return redirect(url_for("admin.settings") + "#integrations")
