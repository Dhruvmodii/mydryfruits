# Publish on AWS Free Tier + Hostinger domain

You already have:

- EC2 `mydryfruits` (Ubuntu, Node 20, Nginx, MySQL, PM2)
- Code under `/var/www/mydryfruits`
- Domain `dhruvmodi.online` on Hostinger

Finish with the steps below. No email / SendGrid / Cloudinary required.

---

## 0. On your Windows PC — push latest helpers

```powershell
cd "C:\Users\dhruv\OneDrive\Desktop\new mydryfruits"
git add deploy/write-env.sh deploy/FREE_PUBLISH.md deploy/AWS_FREE.md .env.example apps/web/next.config.ts packages/db/prisma/schema.prisma package.json package-lock.json
git status
git commit -m "Add AWS free-tier env helper and publish steps"
git push origin main
```

---

## 1. Open EC2 terminal

1. AWS → **EC2** → **Instances** → `mydryfruits`
2. Must be **Running** (Start if Stopped)
3. Copy **Public IPv4 address** (write it down)
4. **Connect** → **EC2 Instance Connect** → user `ubuntu` → **Connect**

---

## 2. Refresh project files on the server

```bash
cd /tmp
rm -rf mydryfruits
git clone https://github.com/Dhruvmodii/mydryfruits.git
cp -a /tmp/mydryfruits/. /var/www/mydryfruits/
cd /var/www/mydryfruits
ls deploy/write-env.sh
```

---

## 3. Write `.env` (easy — no nano)

Use the MySQL password from when you ran `CREATE USER`.  
If you left the example, it is `CHANGE_THIS_PASSWORD`.

```bash
cd /var/www/mydryfruits
bash deploy/write-env.sh 'CHANGE_THIS_PASSWORD' 'Admin12345'
```

- Arg 1 = MySQL password  
- Arg 2 = admin panel password (invent any; write it on paper)

Admin login later:

- Email: `admin@dhruvmodi.online` (username only — no mailbox needed)  
- Password: `Admin12345` (or what you set)

---

## 4. Install, database, build, start

```bash
cd /var/www/mydryfruits
npm ci
npm run generate -w @mydryfruits/db
npm run db:migrate:deploy || npm run db:push
npm run db:seed
npm run build
mkdir -p logs uploads
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Run the `sudo env PATH=...` command PM2 prints, then:

```bash
curl -s http://127.0.0.1:4000/health
curl -I http://127.0.0.1:3000
```

Need: `"ok":true` and `"db":"up"`.

---

## 5. Nginx

```bash
sudo cp /var/www/mydryfruits/deploy/nginx.mydryfruits.conf /etc/nginx/sites-available/mydryfruits
sudo ln -sf /etc/nginx/sites-available/mydryfruits /etc/nginx/sites-enabled/mydryfruits
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Browser test: `http://YOUR_PUBLIC_IP`

---

## 6. Hostinger DNS

1. https://hpanel.hostinger.com → Domains → **dhruvmodi.online** → **DNS / DNS Zone**
2. Set A records:

| Type | Name | Points to |
|------|------|-----------|
| A | `@` | your EC2 Public IP |
| A | `www` | same IP |

3. Remove old A/CNAME records that conflict (Hostinger parking, etc.)
4. Wait 5–60 minutes. Do **not** buy Hostinger hosting.

Optional: AWS → Elastic IP → allocate one → associate to instance → use that IP in DNS (IP stays after stop/start).

---

## 7. Free HTTPS

After `ping dhruvmodi.online` shows your EC2 IP:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d dhruvmodi.online -d www.dhruvmodi.online
cd /var/www/mydryfruits
npm run build -w @mydryfruits/web
pm2 restart all
```

Certbot email = any email for expiry notices (not required on your domain).

---

## 8. Done

- Store: https://dhruvmodi.online  
- Admin: https://dhruvmodi.online/admin/login  

Stay free: only 1× `t2.micro`, no RDS, no Load Balancer. Details: `deploy/AWS_FREE.md`.
