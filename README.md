# MyDryFruits

Premium dry fruits e-commerce platform — guest checkout storefront + full admin CMS.

## Stack

- **Web:** Next.js 15, Tailwind CSS, Framer Motion, Zustand
- **API:** Express, Prisma, MySQL (phpMyAdmin), JWT admin auth
- **Integrations:** Cloudinary, Nodemailer, PDF invoices, Excel export
- **Payments:** Razorpay stubbed (`PAYMENTS_ENABLED=false`)

## Production (free, no AWS)

See **[deploy/CLOUDFLARE_FREE.md](./deploy/CLOUDFLARE_FREE.md)** — Hostinger domain + Cloudflare Tunnel + this PC (₹0).

Optional VPS/EC2 docs (not required): `DEPLOYMENT.md`, `deploy/AWS_FREE.md`.

```bash
cp .env.example .env   # fill production values
npm ci
ln -sf "$(pwd)/.env" packages/db/.env
npm run db:migrate:deploy
npm run db:seed
npm run build
pm2 start ecosystem.config.cjs
```

### Environment variables (required)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Admin JWT signing (32+ chars in production) |
| `CORS_ORIGIN` / `SITE_URL` | Public site origin |
| `PUBLIC_API_URL` / `NEXT_PUBLIC_API_URL` | Public API base URL |
| `UPLOAD_DRIVER` / `UPLOAD_DIR` | Local disk uploads (`local`) |
| `SENDGRID_*` or `SMTP_*` | Transactional email |
| `RAZORPAY_*` / `PAYMENTS_ENABLED` | Payments (optional) |

Full list: `.env.example`

## Quick start (local)

### 1. Prerequisites

- Node.js 20+
- MySQL on port 3306 (XAMPP / phpMyAdmin)

### 2. Environment

```bash
cp .env.example .env
```

Default DB URL: `mysql://root@localhost:3306/mydryfruits`

### 3. Install & seed

```bash
npm install
npm run db:push
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

- Storefront: http://localhost:3000
- API: http://localhost:4000
- Admin: http://localhost:3000/admin/login  
  - Email: `admin@mydryfruits.com`  
  - Password: `Admin@12345`

## Features

- Guest checkout (name, email, address only) — order in ~30 seconds
- Weight tiers 250g–4kg; bulk inquiry above 4kg
- Alternate-name search (badam / baadam / almond, etc.)
- Curated collections (Brain Booster, Gift Box, …)
- Admin: products, categories, collections, orders, coupons, homepage builder, reviews, FAQ, email templates, media, SEO, analytics, settings
- Order emails + next-day PDF invoice cron (9:00 AM)

## Monorepo layout

```
apps/web          Next.js storefront + admin UI
apps/api          Express API
packages/db       Prisma schema + seed
```
