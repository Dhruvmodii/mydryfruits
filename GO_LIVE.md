# Go live on dhruvmodi.online

A domain name is only an address. This project also needs:

1. A **MySQL database**
2. A **Node.js API** (Express, always running)
3. A **Next.js website**
4. DNS records that point `dhruvmodi.online` at that hosting

Vercel cannot run the Express API + MySQL by itself.

## Free publish (no AWS)

You refused AWS. The only ₹0 path for this full stack is:

**Your Windows PC + Cloudflare Tunnel + Hostinger nameservers**

→ Follow **[`deploy/CLOUDFLARE_FREE.md`](./deploy/CLOUDFLARE_FREE.md)**  
→ Short summary: **[`deploy/FREE_PUBLISH.md`](./deploy/FREE_PUBLISH.md)**

| Piece | Free service |
|--------|----------------|
| Server | This PC (`npm start`) |
| Database | XAMPP MySQL on this PC |
| Public HTTPS | Cloudflare Tunnel |
| Domain DNS | Hostinger → Cloudflare nameservers |
| Email / Cloudinary / payments | Not required |

### Other free options (worse fit)

| Option | Catch |
|--------|--------|
| **Vercel Hobby** (website only) | Does not run Express or MySQL. API still needs another host. |
| **Render / Koyeb free API** | Often sleeps; first click is slow or times out. |
| **TiDB Cloud Serverless** (MySQL-compatible) | Free DB, but you still need a free server for the API. |
| **GitHub Student Pack** | If you have a `.edu` / student ID: free credits (DigitalOcean, etc.). |

There is no good “all click, always free, never sleeps” cloud host like Railway without a card.

## No credit card (use this)

Oracle, AWS, Railway, and most VPS hosts **require a card**. Without one, the only real way to put this shop on `dhruvmodi.online` is:

**Your PC runs the app + MySQL. Cloudflare (free, email only) puts the domain in front.**

The site is live only while this computer is on and connected to the internet.

### 1. Cloudflare account (no card)

1. Sign up at https://dash.cloudflare.com/sign-up (email + password).
2. **Add a site** → `dhruvmodi.online` → choose the **Free** plan.
3. Cloudflare shows two **nameservers** (like `ada.ns.cloudflare.com`).
4. At the place you bought the domain, change nameservers to those two. Wait until Cloudflare says the domain is **Active** (can take minutes to 24 hours).

### 2. App already running locally

You need MySQL (XAMPP) and:

```powershell
cd "C:\Users\dhruv\OneDrive\Desktop\new mydryfruits"
copy .env.example .env
# edit .env: DATABASE_URL for your local MySQL, JWT_SECRET, then:
npm ci
npm run generate -w @mydryfruits/db
npm run db:push
npm run db:seed
npm run build
npm start
```

Leave that window open. Site: http://localhost:3000  API: http://localhost:4000

### 3. Install cloudflared (Windows)

1. Download: https://github.com/cloudflare/cloudflared/releases (file `cloudflared-windows-amd64.exe`)
2. Rename it to `cloudflared.exe` and put it in a folder, e.g. `C:\cloudflared\`
3. In PowerShell:

```powershell
cd C:\cloudflared
.\cloudflared.exe tunnel login
```

A browser opens. Pick the `dhruvmodi.online` zone.

```powershell
.\cloudflared.exe tunnel create mydryfruits
.\cloudflared.exe tunnel route dns mydryfruits dhruvmodi.online
.\cloudflared.exe tunnel route dns mydryfruits www.dhruvmodi.online
.\cloudflared.exe tunnel route dns mydryfruits api.dhruvmodi.online
```

Create `C:\cloudflared\config.yml` (replace `TUNNEL_ID` with the id printed after `tunnel create`):

```yaml
tunnel: TUNNEL_ID
credentials-file: C:\Users\dhruv\.cloudflared\TUNNEL_ID.json

ingress:
  - hostname: dhruvmodi.online
    service: http://127.0.0.1:3000
  - hostname: www.dhruvmodi.online
    service: http://127.0.0.1:3000
  - hostname: api.dhruvmodi.online
    service: http://127.0.0.1:4000
  - service: http_status:404
```

Start the tunnel (keep this window open too):

```powershell
.\cloudflared.exe tunnel --config C:\cloudflared\config.yml run
```

### 4. Local `.env` for the public domain

Set these, then **rebuild** (`npm run build`) and `npm start` again:

```
CORS_ORIGIN=https://dhruvmodi.online,https://www.dhruvmodi.online
SITE_URL=https://dhruvmodi.online
PUBLIC_API_URL=https://api.dhruvmodi.online
NEXT_PUBLIC_API_URL=https://api.dhruvmodi.online
NEXT_PUBLIC_SITE_URL=https://dhruvmodi.online
```

### If you have UPI (not a credit card)

A cheap Indian VPS (Hostinger, etc.) can often be paid with **UPI**. That is not free, but the site stays up when your PC is off. Still no credit card.

### If you are a student

[GitHub Student Pack](https://education.github.com/pack) can give free server credits without you buying Railway.

---

## What you must create (I cannot log in as you)

| Account | Why |
|---------|-----|
| [GitHub](https://github.com) | Hosts the code (you already have this repo) |
| [Railway](https://railway.com) | Runs MySQL + API + website |
| [Cloudinary](https://cloudinary.com) (free) | Product images (Railway disk is temporary) |

Then you will add DNS records at the company where you bought `dhruvmodi.online`.

---

## A. Push this code to GitHub

From your PC, in the project folder:

```powershell
git add -A
git commit -m "Prepare production deploy for dhruvmodi.online"
git push origin main
```

---

## B. Railway — MySQL + API + Web

### 1. New project

1. Open https://railway.com and sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select `mydryfruits`.
3. If it tries to auto-deploy one service, that is fine — you will add two more.

### 2. Add MySQL

1. In the project: **+ New** → **Database** → **MySQL**.
2. Wait until it is **Online**.
3. Open the MySQL service → **Variables** → copy `DATABASE_URL`.

### 3. API service

**+ New** → **GitHub Repo** → same repo.

Settings:

| Setting | Value |
|---------|--------|
| Root Directory | *(leave empty — repository root)* |
| Build command | `npm ci && npm run build:api` |
| Start command | `npm run start:api:prod` |

Variables for **API** service:

```
NODE_ENV=production
DATABASE_URL=<paste from MySQL>
JWT_SECRET=<see command below>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://dhruvmodi.online,https://www.dhruvmodi.online
SITE_URL=https://dhruvmodi.online
PUBLIC_API_URL=https://api.dhruvmodi.online
TRUST_PROXY=true
ADMIN_EMAIL=admin@dhruvmodi.online
ADMIN_PASSWORD=<strong password you will remember>
UPLOAD_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Do **not** set `PORT`. Railway injects it. Express already reads `process.env.PORT`.

Generate `JWT_SECRET` on your PC:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

After the API is online: **Settings** → **Networking** → **Generate domain**.  
You will later replace this with `api.dhruvmodi.online`.

### 4. Create tables + admin user (once)

In the API service, run:

```bash
npm run db:migrate:deploy
npm run db:seed
```

If migrate fails on a brand-new database:

```bash
npm run db:push
npm run db:seed
```

Admin login:

- URL: `https://dhruvmodi.online/admin/login`
- Email: value of `ADMIN_EMAIL`
- Password: value of `ADMIN_PASSWORD`

### 5. Web (Next.js) service

**+ New** → **GitHub Repo** → same repo.

| Setting | Value |
|---------|--------|
| Root Directory | *(empty — repository root)* |
| Build command | `npm ci && npm run build:web` |
| Start command | `npm run start:web:prod` |

Variables for **WEB** service (must exist **before** the first successful build):

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.dhruvmodi.online
NEXT_PUBLIC_SITE_URL=https://dhruvmodi.online
NEXT_PUBLIC_SITE_NAME=MyDryFruits
NEXT_PUBLIC_PAYMENTS_ENABLED=false
```

Generate a Railway domain for this service too.

**First deploy:** you will not have `api.dhruvmodi.online` yet. Temporarily set:

- API `PUBLIC_API_URL` = the Railway API domain (`https://….up.railway.app`)
- Web `NEXT_PUBLIC_API_URL` = that same Railway API domain
- API `CORS_ORIGIN` = the Railway **web** domain

After DNS for `dhruvmodi.online` works, change those variables to the `dhruvmodi.online` values above and **redeploy both services**.

---

## C. Point dhruvmodi.online at Railway

In Railway:

1. **Web** service → **Settings** → **Networking** → **Custom domain** → `dhruvmodi.online`  
   Also add `www.dhruvmodi.online`.
2. **API** service → **Custom domain** → `api.dhruvmodi.online`.

Railway will show DNS records. At your registrar (GoDaddy, Namecheap, Hostinger, etc.):

1. Open **DNS** for `dhruvmodi.online`.
2. Add **exactly** the records Railway shows (usually CNAME for `www`, `api`, and ALIAS/`@` for the root).
3. Wait 5–60 minutes, then click **Check DNS** in Railway.

HTTPS is issued automatically after DNS verifies.

---

## D. Cloudinary (images)

1. Create a free Cloudinary account.
2. Copy Cloud name, API key, and API secret into the **API** service variables.
3. Redeploy the API.

Until this is set, admin image uploads will not persist on Railway.

---

## E. Confirm it works

1. `https://api.dhruvmodi.online/health` → `"ok": true`, `"db": "up"`
2. `https://dhruvmodi.online` → storefront
3. `https://dhruvmodi.online/admin/login` → log in and change the admin password

---

## If you would rather use a VPS

You still need to **buy a server**. Then follow `DEPLOYMENT.md`. Nginx is already set to `dhruvmodi.online` in `deploy/nginx.mydryfruits.conf`.

---

## What I cannot do from this computer

- Create your Railway / Cloudinary accounts
- Enter a credit card if the host requires one
- Log into your domain registrar and save DNS
- Provision MySQL on a server you do not have
