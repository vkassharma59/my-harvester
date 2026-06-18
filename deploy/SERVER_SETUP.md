# Wheat Harvester — Fresh Ubuntu Server Setup

End-to-end steps to stand up the **database**, **API**, and **web dashboard** on
a brand-new Ubuntu server. Copy-paste friendly; takes ~20 minutes.

What you'll run on the box:

| Component | What | Served by |
| --- | --- | --- |
| **Database** | MySQL 8 (schema auto-created by the API) | `mysqld` on `:3306` |
| **API** | NestJS (`@wh/api`), prefix `/api/v1` | `node` on `:3000`, managed by **PM2** |
| **Web dashboard** | Vite/React build (`@wh/web`), static files | **nginx** (also reverse-proxies `/api` + `/uploads` → the API) |

```
                ┌──────────────── Ubuntu server ────────────────┐
 Browser ─▶ nginx :80/443 ─/───────▶ /var/www/myharvester-web (SPA)
 (admin)    nginx          ─/api───▶ 127.0.0.1:3000  (NestJS via PM2)
                           ─/uploads▶ 127.0.0.1:3000
 Mobile app ───────────────────────▶ http(s)://<host>/api/v1
                                            │
                                            ▼
                                       MySQL :3306
```

> The **mobile app is not hosted here** — it's an Expo/React Native app shipped
> via EAS / the app stores. It only needs this server's public URL as its API base.

---

## 0. Before you start

- An Ubuntu **22.04 or newer** server with sudo access.
- Open these inbound ports (cloud firewall / AWS Security Group / `ufw`):
  - **22** (SSH), **80** (HTTP), **443** (HTTPS, if you add TLS).
- A domain name pointed at the server's public IP (optional, but required for HTTPS).

If you use `ufw` on the box:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

---

## 1. Install system packages

```bash
sudo apt-get update

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Build tools, git, nginx, rsync
sudo apt-get install -y build-essential git nginx rsync

# PM2 process manager (keeps the API running + restarts on reboot/crash)
sudo npm install -g pm2

# Sanity check
node -v   # v20.x
npm -v
nginx -v
```

---

## 2. Install MySQL and create the database user

```bash
sudo apt-get install -y mysql-server
sudo systemctl enable --now mysql
sudo mysql_secure_installation   # optional but recommended (set root password, remove test db)
```

Create the application's database user. The API **auto-creates the database and
all tables on first boot** (TypeORM `synchronize` + an `ensureDatabase` step), so
the user needs privileges to create a database:

```bash
sudo mysql <<'SQL'
CREATE USER IF NOT EXISTS 'myharvester'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON *.* TO 'myharvester'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
SQL
```

> Prefer least-privilege? Pre-create the DB and scope the grant instead:
> ```sql
> CREATE DATABASE myharvester_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
> GRANT ALL PRIVILEGES ON myharvester_prod.* TO 'myharvester'@'localhost';
> ```
> (Using a managed DB like Amazon RDS instead? Skip this section and point the
> `MYSQL_*` values in step 4 at the RDS endpoint.)

---

## 3. Get the code

```bash
cd ~
git clone https://github.com/vkassharma59/my-harvester.git
cd my-harvester
git checkout master
```

---

## 4. Configure the API environment

```bash
cp deploy/api.env.example apps/api/.env
nano apps/api/.env
```

Fill in at least these:

```dotenv
PORT=3000
NODE_ENV=production

# Same-origin web admin needs no CORS entry; '*' is fine behind nginx.
CORS_ORIGINS=*

# MySQL (must match the user/password from step 2)
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=myharvester
MYSQL_PASSWORD=CHANGE_ME_STRONG_PASSWORD
MYSQL_DATABASE=myharvester_prod

# Auth — generate with:  openssl rand -hex 32
JWT_SECRET=PASTE_A_LONG_RANDOM_STRING
JWT_EXPIRES_IN=7d

# Platform operator seeded on first boot — THIS is your web-console login.
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD
SUPER_ADMIN_NAME=Platform Admin

# Free-trial length (days) for newly onboarded owners
SUBSCRIPTION_TRIAL_DAYS=365

# Outbound email (optional — leave blank to disable owner welcome emails)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Wheat Harvester <no-reply@yourdomain.com>
```

> `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` are seeded **once** on a fresh DB
> and become your login for the web dashboard.

---

## 5. Build and start (database + API + web)

The repo ships a deploy script that builds the shared types, API, and web bundle,
publishes the web files to nginx's web root, and (re)starts the API under PM2:

```bash
bash deploy/deploy.sh
```

What it does on first run:
- `npm ci` — install dependencies
- builds `@wh/shared`, `@wh/api`, and `@wh/web` (web baked with `VITE_API_BASE_URL=/api/v1`)
- copies the web build to **`/var/www/myharvester-web`**
- starts the API with PM2 (process **`myharvester-api`**, cwd `apps/api`, port 3000)

On API startup it also **creates the database, all tables, and the SUPER_ADMIN**
account automatically — no migrations to run.

Make PM2 restart the API automatically after a reboot:

```bash
pm2 startup    # run the exact command it prints
pm2 save
```

---

## 6. Configure nginx (serve the dashboard + proxy the API)

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/myharvester
sudo ln -sf /etc/nginx/sites-available/myharvester /etc/nginx/sites-enabled/myharvester
sudo rm -f /etc/nginx/sites-enabled/default          # optional: drop nginx's default site

# Edit server_name to your domain or public IP
sudo nano /etc/nginx/sites-available/myharvester

sudo nginx -t && sudo systemctl reload nginx
```

Visit **`http://<server-ip-or-domain>/`** — the web dashboard loads. Log in with
the `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from step 4.

For the mobile app, set its API base URL to **`http://<server-ip-or-domain>/api/v1`**.

---

## 7. (Recommended) Enable HTTPS

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot edits the nginx site for TLS and sets up auto-renewal. Then point the
mobile app at `https://your-domain.com/api/v1`.

---

## 8. Verify

```bash
# API up?
curl -s http://127.0.0.1:3000/api/v1/health           # {"status":"ok",...}
# Through nginx (public)
curl -s -o /dev/null -w '%{http_code}\n' http://<host>/api/v1/health   # 200
curl -s -o /dev/null -w '%{http_code}\n' http://<host>/                # 200 (dashboard)

# Database created with tables?
mysql -u myharvester -p myharvester_prod -e "SHOW TABLES;"

# API process
pm2 status
pm2 logs myharvester-api --lines 50
```

---

## 9. Updating later (redeploys)

Whenever new changes land on `master`:

```bash
cd ~/my-harvester
bash deploy/deploy.sh
```

It pulls `master`, rebuilds everything, republishes the web bundle, and reloads
the API. Schema changes apply automatically on the API restart.

> Local changes blocking the pull? `deploy.sh` resets `package-lock.json`
> automatically; for anything else run `git stash` first.

---

## 10. Operating & troubleshooting

```bash
pm2 status                      # process state
pm2 logs myharvester-api        # tail API logs
pm2 restart myharvester-api     # restart API
sudo systemctl reload nginx     # reload web/proxy config
sudo tail -f /var/log/nginx/error.log
```

Common issues:

- **Dashboard loads but API calls fail / "Failed to load"** — the API isn't
  running or nginx can't reach it. Check `pm2 status` and `curl 127.0.0.1:3000/api/v1/health`.
- **API won't boot, MySQL errors** — wrong `MYSQL_*` in `apps/api/.env`, or the
  user lacks privileges (see step 2). Check `pm2 logs myharvester-api`.
- **Login fails on a fresh DB** — `SUPER_ADMIN_EMAIL/PASSWORD` weren't set before
  first boot. Set them in `apps/api/.env` and `pm2 restart myharvester-api`
  (the seed runs only when no super-admin exists yet).
- **413 on file upload** — raise `client_max_body_size` in the nginx site
  (uploads are capped at 5 MB by the API).

---

## Reference: customising paths

`deploy/deploy.sh` accepts overrides if your layout differs:

```bash
WEB_ROOT=/var/www/wh-web VITE_API_BASE_URL=/api/v1 BRANCH=master bash deploy/deploy.sh
```

Files used by this guide live in [`deploy/`](.):
`deploy.sh` (build/publish/restart), `ecosystem.config.cjs` (PM2), `nginx.conf`
(web + proxy), `api.env.example` (env template), `myharvester-api.service`
(systemd alternative to PM2).
