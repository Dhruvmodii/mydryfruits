from datetime import datetime

from .extensions import db
from .utils import new_id


class Admin(db.Model):
    __tablename__ = "Admin"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    email = db.Column(db.String(191), unique=True, nullable=False)
    passwordHash = db.Column(db.String(191), nullable=False)
    name = db.Column(db.String(191), default="Admin")
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Category(db.Model):
    __tablename__ = "Category"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    name = db.Column(db.String(191), nullable=False)
    slug = db.Column(db.String(191), unique=True, nullable=False)
    description = db.Column(db.Text)
    imageUrl = db.Column(db.String(512))
    iconUrl = db.Column(db.String(512))
    bannerUrl = db.Column(db.String(512))
    seoTitle = db.Column(db.String(191))
    seoDescription = db.Column(db.Text)
    productCount = db.Column(db.Integer, default=0)
    displayOrder = db.Column(db.Integer, default=0)
    hidden = db.Column(db.Boolean, default=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    products = db.relationship("Product", backref="category", lazy="dynamic")


class Product(db.Model):
    __tablename__ = "Product"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    name = db.Column(db.String(191), nullable=False)
    slug = db.Column(db.String(191), unique=True, nullable=False)
    description = db.Column(db.Text)
    localName = db.Column(db.String(191))
    pricePerKg = db.Column(db.Numeric(12, 2), nullable=False)
    imageUrl = db.Column(db.String(1024))
    alternateNames = db.Column(db.Text, default="[]")
    benefits = db.Column(db.Text)
    storageTips = db.Column(db.Text)
    nutrition = db.Column(db.JSON)
    origin = db.Column(db.String(191))
    shelfLife = db.Column(db.String(191))
    inStock = db.Column(db.Boolean, default=True)
    stockQty = db.Column(db.Integer, default=100)
    hidden = db.Column(db.Boolean, default=False)
    onDemand = db.Column(db.Boolean, default=False)
    isFeatured = db.Column(db.Boolean, default=False)
    isBestSeller = db.Column(db.Boolean, default=False)
    isTrending = db.Column(db.Boolean, default=False)
    isNewArrival = db.Column(db.Boolean, default=False)
    isPremium = db.Column(db.Boolean, default=False)
    discountPercent = db.Column(db.Integer, default=0)
    displayOrder = db.Column(db.Integer, default=0)
    rating = db.Column(db.Float, default=4.8)
    reviewCount = db.Column(db.Integer, default=0)
    categoryId = db.Column(db.String(191), db.ForeignKey("Category.id"), nullable=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    images = db.relationship("ProductImage", backref="product", cascade="all, delete-orphan")


class ProductImage(db.Model):
    __tablename__ = "ProductImage"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    url = db.Column(db.String(1024), nullable=False)
    alt = db.Column(db.String(191))
    sortOrder = db.Column(db.Integer, default=0)
    productId = db.Column(db.String(191), db.ForeignKey("Product.id"), nullable=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)


class Collection(db.Model):
    __tablename__ = "Collection"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    name = db.Column(db.String(191), nullable=False)
    slug = db.Column(db.String(191), unique=True, nullable=False)
    description = db.Column(db.Text)
    imageUrl = db.Column(db.String(1024))
    benefitTag = db.Column(db.String(191))
    price = db.Column(db.Numeric(12, 2))
    hidden = db.Column(db.Boolean, default=False)
    displayOrder = db.Column(db.Integer, default=0)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    items = db.relationship("CollectionItem", backref="collection", cascade="all, delete-orphan")


class CollectionItem(db.Model):
    __tablename__ = "CollectionItem"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    collectionId = db.Column(db.String(191), db.ForeignKey("Collection.id"), nullable=False)
    productId = db.Column(db.String(191), db.ForeignKey("Product.id"), nullable=False)
    weightGrams = db.Column(db.Integer, default=250)
    product = db.relationship("Product")


class Customer(db.Model):
    __tablename__ = "Customer"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    name = db.Column(db.String(191), nullable=False)
    email = db.Column(db.String(191), unique=True, nullable=False)
    phone = db.Column(db.String(64))
    addressLine1 = db.Column(db.Text)
    addressLine2 = db.Column(db.Text)
    city = db.Column(db.String(191))
    state = db.Column(db.String(191))
    pincode = db.Column(db.String(32))
    country = db.Column(db.String(64), default="India")
    totalSpent = db.Column(db.Numeric(12, 2), default=0)
    orderCount = db.Column(db.Integer, default=0)
    lastOrderAt = db.Column(db.DateTime)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    orders = db.relationship("Order", backref="customer")


class Order(db.Model):
    __tablename__ = "Order"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    orderNumber = db.Column(db.String(64), unique=True, nullable=False)
    status = db.Column(db.String(32), default="PENDING")
    customerName = db.Column(db.String(191), nullable=False)
    customerEmail = db.Column(db.String(191), nullable=False)
    addressLine1 = db.Column(db.String(512), nullable=False)
    addressLine2 = db.Column(db.String(512))
    city = db.Column(db.String(191), nullable=False)
    state = db.Column(db.String(191), nullable=False)
    pincode = db.Column(db.String(32), nullable=False)
    country = db.Column(db.String(64), default="India")
    subtotal = db.Column(db.Numeric(12, 2), nullable=False)
    discount = db.Column(db.Numeric(12, 2), default=0)
    deliveryCharge = db.Column(db.Numeric(12, 2), default=0)
    tax = db.Column(db.Numeric(12, 2), default=0)
    total = db.Column(db.Numeric(12, 2), nullable=False)
    couponCode = db.Column(db.String(64))
    estimatedDelivery = db.Column(db.String(191))
    notes = db.Column(db.Text)
    invoiceSentAt = db.Column(db.DateTime)
    customerId = db.Column(db.String(191), db.ForeignKey("Customer.id"))
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    items = db.relationship("OrderItem", backref="order", cascade="all, delete-orphan")


class OrderItem(db.Model):
    __tablename__ = "OrderItem"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    orderId = db.Column(db.String(191), db.ForeignKey("Order.id"), nullable=False)
    productId = db.Column(db.String(191), db.ForeignKey("Product.id"))
    productName = db.Column(db.String(191), nullable=False)
    imageUrl = db.Column(db.String(1024))
    weightGrams = db.Column(db.Integer, nullable=False)
    unitPrice = db.Column(db.Numeric(12, 2), nullable=False)
    lineTotal = db.Column(db.Numeric(12, 2), nullable=False)

    @property
    def quantity(self) -> int:
        unit = float(self.unitPrice or 0)
        return max(1, round(float(self.lineTotal or 0) / unit)) if unit else 1


class OrderTracking(db.Model):
    """Delivery window, courier info and auto-update switch for one order (all times UTC)."""

    __tablename__ = "OrderTracking"
    __table_args__ = {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"}
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    orderId = db.Column(db.String(191), db.ForeignKey("Order.id", ondelete="CASCADE"), unique=True, nullable=False)
    autoUpdate = db.Column(db.Boolean, default=True)
    estimatedFrom = db.Column(db.DateTime)
    estimatedTo = db.Column(db.DateTime)
    customerNote = db.Column(db.Text)
    courierName = db.Column(db.String(191))
    trackingUrl = db.Column(db.String(1024))
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    order = db.relationship("Order", backref=db.backref("tracking", uselist=False))


class OrderStatusEvent(db.Model):
    """One row each time an order changes status. source is system, auto or admin."""

    __tablename__ = "OrderStatusEvent"
    __table_args__ = {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"}
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    orderId = db.Column(db.String(191), db.ForeignKey("Order.id", ondelete="CASCADE"), nullable=False, index=True)
    status = db.Column(db.String(32), nullable=False)
    note = db.Column(db.Text)
    source = db.Column(db.String(16), default="system")
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)


class BulkInquiry(db.Model):
    __tablename__ = "BulkInquiry"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    name = db.Column(db.String(191), nullable=False)
    email = db.Column(db.String(191), nullable=False)
    productId = db.Column(db.String(191))
    productName = db.Column(db.String(191), nullable=False)
    requiredQuantity = db.Column(db.String(191), nullable=False)
    message = db.Column(db.Text)
    status = db.Column(db.String(32), default="NEW")
    convertedOrderId = db.Column(db.String(191))
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Coupon(db.Model):
    __tablename__ = "Coupon"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    code = db.Column(db.String(64), unique=True, nullable=False)
    type = db.Column(db.String(32), nullable=False)
    value = db.Column(db.Numeric(12, 2), nullable=False)
    minPurchase = db.Column(db.Numeric(12, 2), default=0)
    maxUses = db.Column(db.Integer)
    usedCount = db.Column(db.Integer, default=0)
    startsAt = db.Column(db.DateTime)
    expiresAt = db.Column(db.DateTime)
    active = db.Column(db.Boolean, default=True)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Review(db.Model):
    __tablename__ = "Review"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    customerName = db.Column(db.String(191), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=False)
    productName = db.Column(db.String(191))
    hidden = db.Column(db.Boolean, default=False)
    displayOrder = db.Column(db.Integer, default=0)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Faq(db.Model):
    __tablename__ = "Faq"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    displayOrder = db.Column(db.Integer, default=0)
    hidden = db.Column(db.Boolean, default=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class HomepageSection(db.Model):
    __tablename__ = "HomepageSection"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    key = db.Column(db.String(191), unique=True, nullable=False)
    title = db.Column(db.String(191))
    content = db.Column(db.JSON)
    enabled = db.Column(db.Boolean, default=True)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NewsletterSubscriber(db.Model):
    __tablename__ = "NewsletterSubscriber"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    email = db.Column(db.String(191), unique=True, nullable=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)


class MediaAsset(db.Model):
    __tablename__ = "MediaAsset"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    url = db.Column(db.String(1024), nullable=False)
    publicId = db.Column(db.String(191))
    type = db.Column(db.String(32), default="image")
    alt = db.Column(db.String(191))
    bytes = db.Column(db.Integer)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)


class EmailTemplate(db.Model):
    __tablename__ = "EmailTemplate"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    key = db.Column(db.String(191), unique=True, nullable=False)
    name = db.Column(db.String(191), nullable=False)
    subject = db.Column(db.Text, nullable=False)
    htmlBody = db.Column(db.Text, nullable=False)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SiteSetting(db.Model):
    __tablename__ = "SiteSetting"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    key = db.Column(db.String(191), unique=True, nullable=False)
    value = db.Column(db.JSON)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SeoPage(db.Model):
    __tablename__ = "SeoPage"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    path = db.Column(db.String(191), unique=True, nullable=False)
    title = db.Column(db.String(191))
    description = db.Column(db.Text)
    keywords = db.Column(db.String(512))
    ogImage = db.Column(db.String(1024))
    canonical = db.Column(db.String(512))
    schemaJson = db.Column(db.JSON)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AnalyticsEvent(db.Model):
    __tablename__ = "AnalyticsEvent"
    id = db.Column(db.String(191), primary_key=True, default=new_id)
    type = db.Column(db.String(64), nullable=False)
    path = db.Column(db.String(512))
    meta = db.Column(db.JSON)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
