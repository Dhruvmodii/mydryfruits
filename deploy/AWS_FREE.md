# AWS — stay on Free / credits (dhruvmodi.online)

Goal: **one** small Ubuntu computer, MySQL on that same computer, Nginx, your app.  
If you create extra AWS products, you **will** get a bill.

---

## 0. Rules (read before you click)

**Create only**

- 1 EC2 instance (`t3.micro` or `t2.micro`, **Free tier eligible**)
- 1 security group (ports 22, 80, 443)
- Optional: 1 Elastic IP (needed so the domain IP does not change)

**Do not create (these cost money)**

- RDS / Aurora (database service)
- Load Balancer (ALB / NLB)
- NAT Gateway
- Lightsail (if you already use EC2)
- A second EC2
- Extra EBS volumes or snapshots you do not need
- Elastic IPs that are **not** attached to the running instance

**Instance size**

- Choose **t3.micro** (or **t2.micro** if that is what the console marks Free tier eligible).
- Disk: **gp3, 20 GB** (never more than 30 GB).
- **One** instance, left running = about 750 hours/month (the usual free allowance). A second instance doubles hours and can bill.

**Public IP**

- AWS may charge ~**$0.005/hour** per public IPv4 (~₹300/month) **after** Free Tier / credits.
- Set a **$0 budget alert** below so you see this early.

---

## 1. Lock billing first (do this before EC2)

1. Top search bar → type **Billing** → **Billing and Cost Management**.
2. Confirm the account email and that **credits** show under **Credits** (if you have a coupon).
3. Left menu → **Budgets** → **Create budget**.
   - Budget type: **Cost budget**
   - Period: **Monthly**
   - Amount: **1** (USD)  *(AWS often will not allow 0)*
   - Alert: **50%** and **80%** and **100%** → your email
4. Search **IAM** → enable **MFA** on the root user (Security credentials).

If the console says you are on a **Free plan** (new accounts): you generally are not billed until you **upgrade to Paid**. Do **not** upgrade.

---

## 2. Pick a region

Top-right region menu → **Asia Pacific (Mumbai) `ap-south-1`**.  
Stay in this region for everything.

---

## 3. Create a key pair (login key)

1. Search **EC2** → open EC2.
2. Left: **Key Pairs** → **Create key pair**.
3. Name: `mydryfruits-key`
4. Type: **RSA**
5. Format: **`.pem`** (Windows can use this with PuTTY or the new OpenSSH).
6. **Create**. The file downloads once. Keep it. If you lose it you cannot SSH.

---

## 4. Launch the free EC2

1. EC2 → **Instances** → **Launch instance**.
2. **Name:** `mydryfruits`
3. **Application and OS Images:**
   - **Ubuntu**
   - **Ubuntu Server 24.04 LTS** (or 22.04)
   - Architecture: **64-bit (x86)**
   - Must show **Free tier eligible**
4. **Instance type:** `t3.micro` (or `t2.micro` if labelled Free tier eligible).  
   If you pick `t3.small`, `t3.medium`, `t2.small`, you can get charged.
5. **Key pair:** `mydryfruits-key`
6. **Network settings** → **Edit**:
   - Auto-assign public IP: **Enable**
   - Firewall: **Create security group**
   - Name: `mydryfruits-sg`
   - Inbound rules (only these three):

   | Type | Port | Source |
   |------|------|--------|
   | SSH | 22 | **My IP** (safer) or Anywhere `0.0.0.0/0` if you need to log in from college/phone |
   | HTTP | 80 | Anywhere `0.0.0.0/0` |
   | HTTPS | 443 | Anywhere `0.0.0.0/0` |

   Do **not** open 3000 or 4000 to the internet.
7. **Configure storage:**
   - **1x 20 GiB gp3**
   - Delete on termination: you can leave checked
8. Right panel: confirm **Number of instances = 1**.
9. **Launch instance**.
10. Wait until **Instance state = Running** and **Status check = 2/2**.
11. Select the instance → copy **Public IPv4 address**. Example: `13.x.x.x`

---

## 5. Optional but recommended: Elastic IP (stable for DNS)

Without this, **Stop** then **Start** gives a **new** IP and the domain breaks.

1. EC2 left menu → **Elastic IPs** → **Allocate Elastic IP address**.
2. Network border group: default → **Allocate**.
3. Select the new IP → **Actions** → **Associate Elastic IP address**.
4. Instance: `mydryfruits` → **Associate**.
5. Use **this** IP for DNS. You should have **exactly one** Elastic IP, associated.

Never leave an Elastic IP **unassociated** (that bills).

---

## 6. Open a terminal on the server

### Option A — browser (easiest)

EC2 → instance → **Connect** → **EC2 Instance Connect** → **Connect**.  
User name: `ubuntu`.

### Option B — your Windows PC (PowerShell)

```powershell
ssh -i "$env:USERPROFILE\Downloads\mydryfruits-key.pem" ubuntu@YOUR_PUBLIC_IP
```

If Windows complains about key permissions:

```powershell
icacls "$env:USERPROFILE\Downloads\mydryfruits-key.pem" /inheritance:r
icacls "$env:USERPROFILE\Downloads\mydryfruits-key.pem" /grant:r "$($env:USERNAME):(R)"
```

First time type `yes`.

You should see `ubuntu@ip-...:~$`

---

## 7. Install Node, Nginx, MySQL, PM2 (on the server)

Paste one block at a time.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx mysql-server
```

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
sudo npm install -g pm2
```

---

## 8. MySQL on this same machine (do not use RDS)

```bash
sudo mysql
```

In MySQL:

```sql
CREATE DATABASE mydryfruits CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mydryfruits'@'localhost' IDENTIFIED BY 'PickAStrongPasswordHere';
GRANT ALL PRIVILEGES ON mydryfruits.* TO 'mydryfruits'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Use a real password. Remember it for `DATABASE_URL`.

---

## 9. Put the project on the server

Use **your** GitHub URL.

```bash
sudo mkdir -p /var/www/mydryfruits /var/www/mydryfruits/uploads /var/www/mydryfruits/logs
sudo chown -R ubuntu:ubuntu /var/www/mydryfruits
cd /var/www
git clone https://github.com/Dhruvmodii/mydryfruits.git mydryfruits
cd /var/www/mydryfruits
```

If GitHub is private, create a [personal access token](https://github.com/settings/tokens) and use it as the password when `git clone` asks.

---

## 10. Production `.env`

```bash
cd /var/www/mydryfruits
cp .env.example .env
nano .env
```

Set at least:

```
NODE_ENV=production
DATABASE_URL="mysql://mydryfruits:PickAStrongPasswordHere@127.0.0.1:3306/mydryfruits"
JWT_SECRET="paste-64-hex-chars"
JWT_EXPIRES_IN=7d
CORS_ORIGIN="https://dhruvmodi.online,https://www.dhruvmodi.online"
SITE_URL="https://dhruvmodi.online"
PUBLIC_API_URL="https://dhruvmodi.online"
TRUST_PROXY=true
ADMIN_EMAIL="admin@dhruvmodi.online"
ADMIN_PASSWORD="your-admin-password"
UPLOAD_DRIVER=local
UPLOAD_DIR="/var/www/mydryfruits/uploads"
NEXT_PUBLIC_API_URL="https://dhruvmodi.online"
NEXT_PUBLIC_SITE_URL="https://dhruvmodi.online"
NEXT_PUBLIC_SITE_NAME="MyDryFruits"
NEXT_PUBLIC_PAYMENTS_ENABLED=false
```

Create JWT secret on the server:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save in nano: `Ctrl+O`, Enter, `Ctrl+X`.

```bash
ln -sf /var/www/mydryfruits/.env /var/www/mydryfruits/packages/db/.env
ln -sf /var/www/mydryfruits/.env /var/www/mydryfruits/apps/web/.env.production
```

---

## 11. Install, database, build, start

```bash
cd /var/www/mydryfruits
npm ci
npm run generate -w @mydryfruits/db
npm run db:migrate:deploy || npm run db:push
npm run db:seed
npm run build
mkdir -p logs uploads
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Run the `sudo env PATH=...` command **PM2 prints**, then:

```bash
curl -s http://127.0.0.1:4000/health
```

You want `"ok":true` and `"db":"up"`.

---

## 12. Nginx (same domain for site + API)

```bash
sudo cp /var/www/mydryfruits/deploy/nginx.mydryfruits.conf /etc/nginx/sites-available/mydryfruits
sudo ln -sf /etc/nginx/sites-available/mydryfruits /etc/nginx/sites-enabled/mydryfruits
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 13. Point the domain (your registrar, not AWS)

You do **not** need AWS Route 53 (Route 53 can bill).

At the company where you bought `dhruvmodi.online`, DNS:

| Type | Name | Value |
|------|------|--------|
| A | `@` | `YOUR_ELASTIC_OR_PUBLIC_IP` |
| A | `www` | same IP |

Wait 5–60 minutes. Test:

```bash
ping dhruvmodi.online
```

Browser: `http://dhruvmodi.online` (HTTP first).

---

## 14. HTTPS (free Let’s Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d dhruvmodi.online -d www.dhruvmodi.online
```

Use your email, agree to terms. Certbot edits Nginx.

Then:

```bash
cd /var/www/mydryfruits
# confirm .env uses https://dhruvmodi.online
npm run build -w @mydryfruits/web
pm2 restart mydryfruits-web
```

Admin: `https://dhruvmodi.online/admin/login`

---

## 15. Check you are not creating extra cost

EC2 → **Instances**: only `mydryfruits`.  
EC2 → **Elastic IPs**: only one, **Associated**.  
RDS: **no databases**.  
Load Balancers: **none**.  
Billing → **Bills** / **Free Tier**: watch daily.

If the instance is **Stopped**, the website is down, but compute hours pause. **Do not Stop** if you want the shop online 24/7 (one micro 24/7 is the normal free-hour budget).

---

## If something is already billing

1. EC2 → instance → **Instance state** → **Stop** (site goes down).
2. Release unused Elastic IPs.
3. Delete RDS / Load Balancers if you created them by mistake.
4. Open **Bills** and see which line item it is.
