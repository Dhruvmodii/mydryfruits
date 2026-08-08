# MyDryFruits — AWS EC2 (Ubuntu) production deployment

This guide deploys the existing stack without architecture changes:

- **Web:** Next.js (`apps/web`) on port **3000**
- **API:** Express + Prisma (`apps/api`) on port **4000**
- **DB:** MySQL 8
- **Process manager:** PM2
- **Reverse proxy:** Nginx (recommended)

---

## 1. Launch EC2

1. Create an Ubuntu 22.04/24.04 LTS instance (t3.small or larger recommended).
2. Open security group ports: **22**, **80**, **443** (and temporarily **3000/4000** only for testing).
3. Attach an Elastic IP (optional but recommended).
4. SSH in:

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## 2. Install system packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx mysql-server

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # should be v20+
npm -v

# PM2
sudo npm install -g pm2
```

---

## 3. Configure MySQL

```bash
sudo mysql
```

In the MySQL shell:

```sql
CREATE DATABASE mydryfruits CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mydryfruits'@'localhost' IDENTIFIED BY 'CHANGE_ME_DB_PASSWORD';
GRANT ALL PRIVILEGES ON mydryfruits.* TO 'mydryfruits'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Test:

```bash
mysql -u mydryfruits -p mydryfruits -e "SELECT 1;"
```

*(Optional)* Or use Docker MySQL from the repo:

```bash
cd /var/www/mydryfruits
sudo docker compose up -d
```

---

## 4. Clone the project

```bash
sudo mkdir -p /var/www/mydryfruits /var/www/mydryfruits/uploads /var/www/mydryfruits/logs
sudo chown -R ubuntu:ubuntu /var/www/mydryfruits
cd /var/www
git clone YOUR_REPO_URL mydryfruits
cd /var/www/mydryfruits
```

If you upload a zip instead of git:

```bash
cd /var/www/mydryfruits
# unzip / copy project files here
```

---

## 5. Create production `.env`

```bash
cd /var/www/mydryfruits
cp .env.example .env
nano .env
```

**Required values (minimum):**

| Variable | Example |
|----------|---------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `mysql://mydryfruits:PASSWORD@127.0.0.1:3306/mydryfruits` |
| `JWT_SECRET` | long random 32+ chars |
| `CORS_ORIGIN` | `https://yourdomain.com` |
| `SITE_URL` | `https://yourdomain.com` |
| `PUBLIC_API_URL` | `https://yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | `https://yourdomain.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` |
| `UPLOAD_DRIVER` | `local` |
| `UPLOAD_DIR` | `/var/www/mydryfruits/uploads` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | used by seed |

Also set email (`SENDGRID_*` or `SMTP_*`) and optionally `RAZORPAY_*` / Cloudinary.

> **Important:** `NEXT_PUBLIC_*` variables are baked in at **build time**. Set them in `.env` **before** `npm run build`.

Generate a strong JWT secret:

```bash
openssl rand -hex 32
```

---

## 6. Install dependencies

```bash
cd /var/www/mydryfruits
npm ci
```

`postinstall` runs `prisma generate` automatically.

---

## 7. Run database migrations + seed

Preferred (Prisma migrations):

```bash
cd /var/www/mydryfruits
# Prisma reads env from packages/db — link root .env there
ln -sf /var/www/mydryfruits/.env /var/www/mydryfruits/packages/db/.env
# Next.js also reads env from apps/web during build
ln -sf /var/www/mydryfruits/.env /var/www/mydryfruits/apps/web/.env.production
npm run db:migrate:deploy
npm run db:seed
```

Fallback if migrate has issues on a fresh DB:

```bash
npm run db:push
npm run db:seed
```

Change the default admin password immediately after first login  
(`admin@mydryfruits.com` / value from `ADMIN_PASSWORD` in seed / `.env`).

---

## 8. Build for production

```bash
cd /var/www/mydryfruits
npm run build
```

This builds:

1. Prisma client (`@mydryfruits/db`)
2. API TypeScript → `apps/api/dist`
3. Next.js → `apps/web/.next`

Verify:

```bash
test -f apps/api/dist/index.js && echo "API build OK"
test -d apps/web/.next && echo "Web build OK"
```

---

## 9. Start with PM2

```bash
cd /var/www/mydryfruits
mkdir -p logs uploads
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs
pm2 save
pm2 startup
# run the command PM2 prints (sudo env PATH=...)
```

Health check:

```bash
curl -s http://127.0.0.1:4000/health
# expect: {"ok":true,"db":"up",...}
```

Storefront (local):

```bash
curl -I http://127.0.0.1:3000
```

---

## 10. Configure Nginx

```bash
sudo cp /var/www/mydryfruits/deploy/nginx.mydryfruits.conf /etc/nginx/sites-available/mydryfruits
sudo nano /etc/nginx/sites-available/mydryfruits   # set yourdomain.com
sudo ln -sf /etc/nginx/sites-available/mydryfruits /etc/nginx/sites-enabled/mydryfruits
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### TLS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

After HTTPS works, ensure `.env` uses `https://` URLs, then rebuild web:

```bash
cd /var/www/mydryfruits
nano .env   # https:// URLs
npm run build -w @mydryfruits/web
pm2 restart mydryfruits-web
```

---

## 11. Same-origin API via Nginx (recommended)

With the provided Nginx config, browsers can call the API on the **same domain**:

```env
NEXT_PUBLIC_API_URL="https://yourdomain.com"
PUBLIC_API_URL="https://yourdomain.com"
CORS_ORIGIN="https://yourdomain.com"
SITE_URL="https://yourdomain.com"
```

Nginx routes:

| Path | Backend |
|------|---------|
| `/` | Next.js `:3000` |
| `/api/*` | Express `:4000` |
| `/uploads/*` | Express `:4000` |
| `/health` | Express `:4000` |

---

## 12. Deploy updates (later)

```bash
cd /var/www/mydryfruits
git pull
npm ci
npm run db:migrate:deploy
npm run build
pm2 restart all
pm2 save
```

---

## 13. Useful PM2 / ops commands

```bash
pm2 status
pm2 logs mydryfruits-api --lines 100
pm2 logs mydryfruits-web --lines 100
pm2 restart mydryfruits-api
pm2 restart mydryfruits-web
pm2 stop all
```

Disk uploads live in `UPLOAD_DIR` (default `/var/www/mydryfruits/uploads`).  
Back them up with your DB dumps.

```bash
# MySQL backup example
mysqldump -u mydryfruits -p mydryfruits > backup-$(date +%F).sql
```

---

## 14. Environment variable checklist

See root `.env.example` for the full list. Summary:

### Required
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `SITE_URL`
- `PUBLIC_API_URL`
- `PORT` (API, default 4000)
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SITE_NAME`
- `UPLOAD_DRIVER` (`local` or `cloudinary`)
- `UPLOAD_DIR` (for local uploads)

### Email (at least one path)
- `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL` (+ optional `SENDGRID_FROM_NAME`)
- **or** `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`

### Optional
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (seed)
- `JWT_EXPIRES_IN`
- `TRUST_PROXY`
- `PAYMENTS_ENABLED`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_PAYMENTS_ENABLED`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` (docker compose only)

---

## 15. Manual configuration still required before go-live

- [ ] Real domain DNS A/AAAA records pointing to the EC2 Elastic IP
- [ ] Production `.env` filled (no localhost URLs)
- [ ] Strong `JWT_SECRET` and MySQL password
- [ ] Admin password changed after seed
- [ ] SendGrid (or SMTP) sender identity / domain authentication verified
- [ ] TLS certificate via Certbot
- [ ] Security group locked down (no public 3000/4000 if Nginx is used)
- [ ] Uploads directory writable by the PM2 user (`ubuntu`)
- [ ] Razorpay live keys only if `PAYMENTS_ENABLED=true`
- [ ] Rotate any API keys that were ever committed or shared in chat
- [ ] Confirm `/health` returns `db: "up"`
- [ ] Place a test order and verify emails + invoice PDF
- [ ] Upload a test image in Admin → Media and confirm `/uploads/...` loads
