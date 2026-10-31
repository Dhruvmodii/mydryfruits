import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app
from app.extensions import db
from app.models import HomepageSection

HERO = {
    "autoScroll": True,
    "scrollInterval": 4500,
    "slides": [
        {
            "badge": "Welcome Offer",
            "headline": "Get 10% Off Your First Order",
            "subheading": "Fresh, hand-sorted dry fruits delivered to your door. Use code WELCOME10 on orders above ₹500.",
            "highlight": "Code: WELCOME10",
            "ctaPrimary": {"label": "Shop & Save", "href": "/shop"},
            "ctaSecondary": {"label": "View Offers", "href": "/offers"},
            "imageUrl": "https://shreejifoods.in/cdn/shop/products/Dried-mixed-fruits.jpg?v=1616404516",
            "background": "linear-gradient(135deg, #f7f4ee 0%, #efe3c8 100%)",
        },
        {
            "badge": "Bestseller",
            "headline": "Mamra Almonds — Nature's Superfood",
            "subheading": "Rich, naturally oily Mamra badam. Hand-picked, crunchy and packed fresh.",
            "highlight": "₹4,000 / kg",
            "ctaPrimary": {"label": "Buy Now", "href": "/product/almond-mamra"},
            "ctaSecondary": {"label": "All Almonds", "href": "/shop/almonds"},
            "imageUrl": "https://royalfantasy.in/cdn/shop/products/Almond-Mamra-Jumbo-1.jpg?v=1627547263",
            "background": "linear-gradient(135deg, #f7f4ee 0%, #ece2d0 100%)",
        },
        {
            "badge": "Jumbo Size",
            "headline": "King-Size W210 Cashews",
            "subheading": "Creamy, crunchy kaju — perfect for snacking, sweets and festive gifting.",
            "highlight": "₹1,400 / kg",
            "ctaPrimary": {"label": "Buy Now", "href": "/product/cashew-210"},
            "ctaSecondary": {"label": "All Cashews", "href": "/shop/cashews"},
            "imageUrl": "https://royalfantasy.in/cdn/shop/products/Cashew-Nuts-Jumbo-1.jpg?v=1627469989",
            "background": "linear-gradient(135deg, #f7f4ee 0%, #f1e6d6 100%)",
        },
        {
            "badge": "Premium",
            "headline": "Irani Pistachios, Ready to Eat",
            "subheading": "Shell-free, naturally green and full of flavour. No cracking needed.",
            "highlight": "₹2,700 / kg",
            "ctaPrimary": {"label": "Buy Now", "href": "/product/irani-pista-without-shell"},
            "ctaSecondary": {"label": "All Pistachios", "href": "/shop/pistachios"},
            "imageUrl": "https://5.imimg.com/data5/SELLER/Default/2025/7/527530488/KH/KX/JA/234594437/pista-irani-plain-without-shell-500x500.jpg",
            "background": "linear-gradient(135deg, #f3f6ee 0%, #e2ead6 100%)",
        },
        {
            "badge": "Natural Energy",
            "headline": "Soft & Juicy Medjool Dates",
            "subheading": "Nature's own sweet — rich in fibre, perfect with milk or as a healthy snack.",
            "highlight": "₹1,400 / kg",
            "ctaPrimary": {"label": "Buy Now", "href": "/product/mejdool-dates"},
            "ctaSecondary": {"label": "Dried Fruits", "href": "/shop?category=dried-fruits"},
            "imageUrl": "https://www.aishcart.in/3953-large_default/medjool-dates-1kg.jpg",
            "background": "linear-gradient(135deg, #f7f1ea 0%, #ead8c8 100%)",
        },
        {
            "badge": "Festivals & Corporate",
            "headline": "Gift Boxes & Bulk Orders",
            "subheading": "Custom quantities at family rates for weddings, Diwali and office gifting. Ask us for a quote.",
            "highlight": "Special bulk pricing",
            "ctaPrimary": {"label": "Explore Collections", "href": "/collections"},
            "ctaSecondary": {"label": "Contact Us", "href": "/contact"},
            "imageUrl": "https://in.cherrypick.city/cdn/shop/files/JumboAlmonds_Badam_1024x1024@2x.jpg?v=1703911692",
            "background": "linear-gradient(135deg, #f7f4ee 0%, #e8e0cf 100%)",
        },
    ],
}

app = create_app()
with app.app_context():
    row = HomepageSection.query.filter_by(key="hero").first()
    if not row:
        row = HomepageSection(key="hero", title="Hero", enabled=True, content=HERO)
        db.session.add(row)
    else:
        row.content = HERO
        row.enabled = True
    db.session.commit()
    print("hero saved with", len(HERO["slides"]), "slides")
