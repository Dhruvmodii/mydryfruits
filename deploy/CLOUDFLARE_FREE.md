# Cloudflare Tunnel + Hostinger (₹0, no AWS)

Publish `dhruvmodi.online` from **this Windows PC**.  
Site works only while the PC is on.

---

## Before you start

Install on Windows if missing:

1. **Node.js 20** — https://nodejs.org  
2. **MySQL** — easiest: [XAMPP](https://www.apachefriends.org/) → start **MySQL** in the control panel  
3. This project folder: `C:\Users\dhruv\OneDrive\Desktop\new mydryfruits`

Open **PowerShell**.

---

## Step 1 — MySQL database (once)

Open XAMPP → Start **MySQL**.  
Open phpMyAdmin (http://localhost/phpmyadmin) or MySQL client and run:

```sql
CREATE DATABASE mydryfruits CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

XAMPP default user is usually `root` with **empty password**.

---

## Step 2 — Create `.env` (PowerShell)

```powershell
cd "C:\Users\dhruv\OneDrive\Desktop\new mydryfruits"
powershell -ExecutionPolicy Bypass -File .\deploy\write-env-local.ps1
```

That script writes `.env` for `dhruvmodi.online` with:

- MySQL: `root` / empty password (XAMPP default)
- Admin user: `admin@dhruvmodi.online` / `Admin12345`
- Same-origin API (browser calls `https://dhruvmodi.online/api/...`, Next proxies to port 4000)

Change the admin password later in `.env` if you want.

---

## Step 3 — Install, DB, build, run the app

```powershell
cd "C:\Users\dhruv\OneDrive\Desktop\new mydryfruits"
npm ci
npm run generate -w @mydryfruits/db
npm run db:push
npm run db:seed
npm run build
npm start
```

Leave this PowerShell window **open**.

Check:

- http://localhost:3000 → website  
- http://localhost:4000/health → `"ok":true`

---

## Step 4 — Cloudflare account (free)

1. Go to https://dash.cloudflare.com/sign-up  
2. Sign up with any free email (Gmail is fine).  
3. **Add a site** → enter `dhruvmodi.online` → plan **Free**  
4. Cloudflare shows two nameservers, for example:
   - `ada.ns.cloudflare.com`
   - `bob.ns.cloudflare.com`  
   (yours will be different — copy **exactly**)

---

## Step 5 — Hostinger nameservers

1. Log in https://hpanel.hostinger.com  
2. **Domains** → **dhruvmodi.online** → **DNS / Nameservers**  
3. Choose **Change nameservers** / custom nameservers  
4. Paste the **two Cloudflare nameservers**  
5. Save  

Wait until Cloudflare dashboard says the domain is **Active** (10 minutes to 24 hours).  
Do **not** buy Hostinger hosting.

---

## Step 6 — Install cloudflared (Windows)

1. Download: https://github.com/cloudflare/cloudflared/releases  
   File: `cloudflared-windows-amd64.exe`  
2. Create folder `C:\cloudflared\`  
3. Put the exe there and rename to `cloudflared.exe`

---

## Step 7 — Login + create tunnel

Open a **second** PowerShell (keep `npm start` running in the first):

```powershell
cd C:\cloudflared
.\cloudflared.exe tunnel login
```

Browser opens → pick zone **dhruvmodi.online** → Authorize.

```powershell
.\cloudflared.exe tunnel create mydryfruits
```

It prints a **Tunnel ID** (long UUID) and creates a JSON file under  
`C:\Users\dhruv\.cloudflared\<TUNNEL_ID>.json`

```powershell
.\cloudflared.exe tunnel route dns mydryfruits dhruvmodi.online
.\cloudflared.exe tunnel route dns mydryfruits www.dhruvmodi.online
```

---

## Step 8 — Tunnel config file

Create `C:\cloudflared\config.yml`  
Replace `TUNNEL_ID` with your real id from step 7:

```yaml
tunnel: TUNNEL_ID
credentials-file: C:\Users\dhruv\.cloudflared\TUNNEL_ID.json

ingress:
  - hostname: dhruvmodi.online
    service: http://127.0.0.1:3000
  - hostname: www.dhruvmodi.online
    service: http://127.0.0.1:3000
  - service: http_status:404
```

(You only need port 3000. Next.js rewrites `/api` and `/uploads` to the API on 4000.)

---

## Step 9 — Start the tunnel

```powershell
cd C:\cloudflared
.\cloudflared.exe tunnel --config C:\cloudflared\config.yml run
```

Leave this window open too.

---

## Step 10 — Open the live site

- https://dhruvmodi.online  
- https://dhruvmodi.online/admin/login  
  - Email: `admin@dhruvmodi.online`  
  - Password: `Admin12345` (or what you set in `.env`)

---

## Every time you want the site online

1. Start XAMPP **MySQL**  
2. PowerShell 1:

```powershell
cd "C:\Users\dhruv\OneDrive\Desktop\new mydryfruits"
npm start
```

3. PowerShell 2:

```powershell
cd C:\cloudflared
.\cloudflared.exe tunnel --config C:\cloudflared\config.yml run
```

4. Do not sleep the PC (Power Options → prevent sleep while publishing).

---

## Optional helper

```powershell
cd "C:\Users\dhruv\OneDrive\Desktop\new mydryfruits"
powershell -ExecutionPolicy Bypass -File .\deploy\start-public.ps1
```

(Starts tunnel instructions reminder; app must already be built.)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Cloudflare domain not Active | Wait; check Hostinger nameservers match Cloudflare exactly |
| 502 Bad Gateway | `npm start` not running, or wrong port in config.yml |
| DB errors | XAMPP MySQL not started; check `DATABASE_URL` in `.env` |
| Admin login fails | Re-run seed: `npm run db:seed` after `.env` `ADMIN_PASSWORD` is set |
| Site down overnight | PC slept or tunnel window closed — expected for this free path |
