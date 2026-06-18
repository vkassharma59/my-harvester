# Deploying Wheat Harvester (API + Web admin) on EC2

> **Setting up a brand-new server from scratch?** Follow the step-by-step
> [SERVER_SETUP.md](SERVER_SETUP.md) (DB + API + web dashboard). This file is the
> quick reference / architecture overview.

This deploys two things to an Ubuntu EC2 instance:

- **API** — the NestJS server (`@wh/api`), run by **PM2** on port `3000`, prefix `/api/v1`.
- **Web admin** — the Vite build (`@wh/web`), served as static files by **nginx**, which also reverse-proxies `/api` and `/uploads` to the API.

The **mobile app is not deployed here** — it's an Expo/React Native app shipped via EAS / the app stores. It just points at this server's public URL.

Architecture:

```
            ┌────────────────── EC2 (Ubuntu) ──────────────────┐
 Browser ──▶ nginx :80  ──/──────▶ /var/www/myharvester-web (SPA)
 (admin)     nginx :80  ──/api──▶ 127.0.0.1:3000  (NestJS, PM2)
                        ──/uploads▶ 127.0.0.1:3000
 Mobile  ──────────────────────▶  http(s)://<host>/api/v1
                                          │
                                          ▼
                                     MySQL :3306
```

---

## 0. Prerequisites on the EC2 box

- Ubuntu 22.04+ instance; **Security Group** allows inbound **22** (SSH), **80** (HTTP), and **443** (if you add TLS).
- A MySQL database — either local MySQL on the box, or **Amazon RDS** (recommended for prod).

Install Node 20 LTS, build tools, nginx, PM2, and (optional) local MySQL:

```bash
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential git nginx

# PM2 (process manager) + rsync
sudo npm install -g pm2
sudo apt-get install -y rsync

# Optional: local MySQL (skip if using RDS)
sudo apt-get install -y mysql-server
```

If using **local MySQL**, create the user the API will use (it needs to create
its own database on first boot):

```sql
sudo mysql
CREATE USER 'myharvester'@'localhost' IDENTIFIED BY 'a-strong-password';
GRANT ALL PRIVILEGES ON *.* TO 'myharvester'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

> The API auto-creates the database + tables on startup (`ensureDatabase` +
> TypeORM `synchronize`), so no manual migrations are needed.

---

## 1. Get the code

```bash
cd ~
git clone https://github.com/vkassharma59/my-harvester.git
cd my-harvester
git checkout master
```

## 2. Configure the API environment

```bash
cp deploy/api.env.example apps/api/.env
nano apps/api/.env      # set MYSQL_*, JWT_SECRET, SUPER_ADMIN_* at minimum
```

- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` become your **web console login**
  (seeded once on a fresh DB).
- `JWT_SECRET` — generate with `openssl rand -hex 32`.

## 3. First deploy

```bash
bash deploy/deploy.sh
```

This pulls `master`, installs deps, builds shared/API/web, copies the web bundle
to `/var/www/myharvester-web`, and starts the API under PM2. Then make PM2
restart the API on reboot:

```bash
pm2 startup           # run the command it prints (sets up the systemd hook)
pm2 save
```

## 4. Configure nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/myharvester
sudo ln -sf /etc/nginx/sites-available/myharvester /etc/nginx/sites-enabled/myharvester
sudo rm -f /etc/nginx/sites-enabled/default     # optional: drop the default site
# edit server_name in the file to your domain / EC2 public DNS
sudo nginx -t && sudo systemctl reload nginx
```

Visit `http://<EC2-public-DNS>/` — the web admin loads and logs in with the
`SUPER_ADMIN_*` credentials. The mobile app should set its API URL to
`http://<EC2-public-DNS>/api/v1`.

## 5. (Recommended) HTTPS

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Then set the mobile app's API URL to `https://your-domain.com/api/v1`.

---

## Redeploys (after pushing to `master`)

```bash
cd ~/my-harvester
bash deploy/deploy.sh
```

That's the whole loop: it pulls, rebuilds, republishes the web bundle, and
reloads the API with zero extra steps. Schema changes apply automatically on
API restart.

## Operating the API

```bash
pm2 status                 # process state
pm2 logs myharvester-api   # tail logs
pm2 restart myharvester-api
```

Prefer **systemd** over PM2? Use [`myharvester-api.service`](myharvester-api.service)
instead (instructions inside) and drop the `pm2 ...` lines from the deploy step.

---

## Notes & gotchas

- **`npm ci` installs all workspaces**, including the (heavy) Expo mobile deps.
  It's harmless but slow on a small instance; a `t3.small`+ is comfortable.
- **`.env` is read from `apps/api`** — that's why PM2/systemd set the working
  directory there. Uploaded files also live in `apps/api/uploads`.
- **CORS**: the web admin is same-origin (served by nginx), so it needs no CORS
  entry. Only add origins if something calls the API cross-origin.
- **Web API base**: the build bakes in `VITE_API_BASE_URL` (default `/api/v1`,
  same-origin). If you serve the API on a different host, set it before building:
  `VITE_API_BASE_URL=https://api.example.com/api/v1 bash deploy/deploy.sh`.
