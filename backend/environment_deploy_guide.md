# NYU Marketplace – Environment & Deployment Guide

This doc explains how we run the app in **local**, **dev**, and **production**, plus how to deploy to each one. Everyone on the team should follow this so we don't accidentally break prod.

---

## 1. Environments (high level)

### Local (your laptop)
- Purpose: day-to-day development.
- Django settings: `core.settings_local`
- DB: local SQLite (file `db.sqlite3`).
- Frontend:
  - Option A (recommended for normal dev): Vite dev server on `http://localhost:5173`.
  - Option B ("prod-like"): Django also serves the built React app.
- Security: DEBUG = True, permissive CORS for localhost.
- Nothing here should depend on AWS.

### Dev(Elastic Beanstalk env: `nyu-marketplace-dev`)
- Purpose: shared testing before we ship to prod.
- Django settings: `core.settings_dev`
- DB: dedicated **dev RDS MySQL**.
- S3: `nyu-marketplace-dev-images` bucket.
- DEBUG = True (so we can still debug in staging).
- Externally reachable by the team (Elastic Beanstalk URL).
- Safe place to test login, listings CRUD, S3 upload, etc.

### Production (Elastic Beanstalk env: `nyu-marketplace-env`)
- Purpose: real / demo / users.
- Django settings: `core.settings_prod`
- DB: **prod RDS MySQL** (Multi-AZ, backups, not public).
- S3: `nyu-marketplace-prod-images` bucket.
- DEBUG = False, security headers on, CORS/CSRF locked down, HTTPS (eventually with ACM cert).
- This must stay stable.

---

## 2. Settings files layout

We split Django settings to avoid hardcoding prod creds in code:

- `core/settings_base.py`
  - Shared stuff (INSTALLED_APPS, MIDDLEWARE, REST_FRAMEWORK, SIMPLE_JWT, etc.).
  - Defines `BASE_DIR`, loads `.env` if present.

- `core/settings_local.py`
  - `from .settings_base import *`
  - DEBUG=True
  - SQLite database:
    ```python
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
    ```
  - CORS/CSRF allows `http://localhost:5173`.
  - TEMPLATES[0]["DIRS"] points at `staticfiles/` so Django can serve the built SPA if we want.

- `core/settings_dev.py`
  - `from .settings_base import *`
  - DEBUG=True
  - MySQL pointing at **dev RDS**. Values come from EB env vars:
    `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`.
  - S3 bucket name from `AWS_STORAGE_BUCKET_NAME = nyu-marketplace-dev-images`.
  - CORS/CSRF allows localhost AND the dev-test EB domain.

- `core/settings_prod.py`
  - `from .settings_base import *`
  - DEBUG=False
  - Uses **prod RDS** creds from EB env vars.
  - Uses **prod S3 bucket**.
  - ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS, CSRF_TRUSTED_ORIGINS set to the prod EB domain (and later our custom domain).
  - Security flags like `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, etc. are enabled here.
  - `SECRET_KEY` is required from environment (no fallback).

The key idea:
- We NEVER hardcode DB passwords, AWS keys, etc. in Git.
- Each EB environment (dev-test / prod) injects its own environment variables under "Configuration → Software → Environment properties".

---

## 3. Local workflow (day-to-day dev)

### 3.1 Initial setup

1. Create and activate your Python venv.
2. Install backend deps:
   ```bash
   pip install -r requirements.txt
   ```
3. Run migrations locally (this creates/updates `db.sqlite3`):
   ```bash
   python manage.py migrate
   ```

4. (Optional first-time) Create a superuser so you can log in:
   ```bash
   python manage.py createsuperuser
   ```

### 3.2 Frontend during development

**Recommended (fast dev mode):**
- Run Vite dev server separately:
  ```bash
  cd frontend   # whatever the frontend folder is called
  npm install
  npm run dev   # serves at http://localhost:5173
  ```
- Run Django API:
  ```bash
  python manage.py runserver  # http://127.0.0.1:8000
  ```
- Frontend talks to backend using `VITE_API_BASE_URL=http://127.0.0.1:8000`.
- You open the site at `http://localhost:5173` (React dev server), not Django.

### 3.3 When do I run `migrate` and `collectstatic` locally?

- `python manage.py migrate`:
  - Run this **any time** you pull new code that includes new migrations, or you changed models.
  - This syncs your local SQLite schema.

- `python manage.py collectstatic`:
  - This copies Django's static assets (admin CSS, DRF assets, etc.) into `staticfiles/`.
  - You usually do this locally only when you're testing the "prod-like" mode where Django serves everything (see above). For normal dev mode (using Vite at :5173), you don't need it.

Summary:
- Normal daily development (split frontend/backend): you mostly just `migrate`.
- Prod-like preview from Django: run `collectstatic`, then copy frontend_build → staticfiles.

---

## 4. Dev (EB env: `nyu-marketplace-dev`)

### Purpose
- Shared sandbox for the team.
- QA before promoting to prod.

### Infra settings
- Environment name in EB: `nyu-marketplace-dev`
- Instance type: t3.micro (single instance, cost-effective)
- DEBUG=True (because settings_devtest)
- Publicly reachable (Elastic Beanstalk URL)
- Has its own RDS MySQL
- Has its own S3 bucket (ex: `nyu-marketplace-dev-images`)
- Security group on the RDS only allows inbound MySQL (3306) from the EB instance SG, not from the whole internet.

### EB environment properties (Configuration → Software → Environment properties)
These MUST exist for dev-test:

- `DJANGO_SETTINGS_MODULE = core.settings_dev`
- `DJANGO_SECRET_KEY = <dev-secret>`
- `DB_HOST = <dev RDS endpoint>`
- `DB_NAME = nyu_marketplace_dev`
- `DB_USER = nyu_app`
- `DB_PASSWORD = <dev db password>`
- `DB_PORT = 3306`
- `AWS_STORAGE_BUCKET_NAME = nyu-marketplace-dev-images`
- `AWS_ACCESS_KEY_ID = <dev key>`
- `AWS_SECRET_ACCESS_KEY = <dev key secret>`
- `AWS_S3_REGION_NAME = us-east-1`

This is how `settings_devtest.py` knows how to connect.

### Deploying to dev
1. Make sure you're on the branch you want to test (usually `develop`). Pull latest.
2. Build frontend:
   ```bash
   ./build_frontend.sh
   ```
   This generates/updates `backend/frontend_build/`.

3. Commit the built frontend (important: EB deploy bundles Git content):
   ```bash
   git add backend/frontend_build
   git commit -m "build: frontend for dev-test deploy"
   ```

4. Tell EB CLI to target the dev-test environment:
   ```bash
   eb use nyu-marketplace-dev
   ```

5. Deploy:
   ```bash
   eb deploy
   ```

### What happens on deploy
- EB uploads our code as a zip.
- EB creates/updates the EC2.
- EB installs Python deps from `requirements.txt`.
- EB runs `collectstatic`.
- EB runs our hook `.platform/hooks/postdeploy/90_sync_vite_assets.sh`, which copies `frontend_build` → `staticfiles/` on the instance.
- Django starts with `DJANGO_SETTINGS_MODULE=core.settings_devtest`.

If the site 500s on `/` after deploy, 99% of the time it's because `frontend_build/` was not committed before `eb deploy`.

---

## 5. Production (EB env: `nyu-marketplace-env`)

### Purpose
- Stable environment for demos / real use.
- No DEBUG, locked CORS/CSRF, separate DB and S3.

### Infra settings
- Environment name in EB console: `nyu-marketplace-env`
- Usually at least t3.small or bigger.
- We will enable load balancer + auto scaling later (min 2 instances, CPU alarms, etc.).
- Production RDS MySQL with automated backups / Multi-AZ.
- S3 bucket `nyu-marketplace-prod-images`.
- HTTPS will be enforced here with ACM cert and `SECURE_SSL_REDIRECT = True` once we have a real domain.

### EB environment properties (Configuration → Software → Environment properties)
Prod MUST have:

- `DJANGO_SETTINGS_MODULE = core.settings_prod`
- `DJANGO_SECRET_KEY = <prod-secret>`  (must NOT rotate randomly)
- `DB_HOST = <prod RDS endpoint>`
- `DB_NAME = nyu_marketplace_prod`
- `DB_USER = nyu_app`
- `DB_PASSWORD = <prod db password>`
- `DB_PORT = 3306`
- `AWS_STORAGE_BUCKET_NAME = nyu-marketplace-prod-images`
- `AWS_ACCESS_KEY_ID = <prod key>`
- `AWS_SECRET_ACCESS_KEY = <prod key secret>`
- `AWS_S3_REGION_NAME = us-east-1`

### Deploying to prod
1. Checkout the release branch (usually `main`). Pull latest.
2. Build frontend and commit it (same steps as dev-test):
   ```bash
   ./build_frontend.sh
   git add backend/frontend_build
   git commit -m "build: frontend for prod release"
   ```

3. Point EB CLI at prod:
   ```bash
   eb use nyu-marketplace-env
   ```

4. Deploy:
   ```bash
   eb deploy
   ```

After deploy, prod runs with `core.settings_prod`: DEBUG=False, stricter security, prod DB/S3.

---

## 6. Common commands cheat sheet

Local dev API only:
```bash
python manage.py migrate          # sync DB schema
python manage.py runserver        # backend on http://127.0.0.1:8000
cd frontend && npm run dev        # frontend on http://localhost:5173
```

Local prod-like preview:
```bash
./build_frontend.sh               # build React -> backend/frontend_build/
cd backend
mkdir -p staticfiles
cp -f frontend_build/index.html staticfiles/index.html
rsync -a --delete frontend_build/assets/ staticfiles/assets/
[ -f frontend_build/vite.svg ] && cp -f frontend_build/vite.svg staticfiles/vite.svg
python manage.py collectstatic --noinput
python manage.py runserver        # now http://127.0.0.1:8000 serves full app
```

Deploy to dev:
```bash
git checkout develop
git pull origin develop
./build_frontend.sh
git add backend/frontend_build
git commit -m "build: frontend for dev deploy"
eb use nyu-marketplace-dev
eb deploy
```

Deploy to prod:
```bash
git checkout main
git pull origin main
./build_frontend.sh
git add backend/frontend_build
git commit -m "build: frontend for prod release"
eb use nyu-marketplace-env
eb deploy
```

---

## 7. FAQ / gotchas

### Q: I did `eb deploy` and staging returned 500 at `/`.
Most common cause: `frontend_build/` was NOT committed before deploy, so the postdeploy hook had nothing to copy into `staticfiles/`.

Fix:
1. Run `./build_frontend.sh`
2. `git add backend/frontend_build`
3. Commit
4. `eb use nyu-marketplace-dev && eb deploy`

### Q: Local `runserver` complains about missing `static` folder.
Create it:
```bash
cd backend
mkdir static
```
(or update `settings_local.py` to only include STATICFILES_DIRS if that folder exists.)

### Q: When do we run `python manage.py migrate`?
- Locally: whenever models/migrations change.
- In EB: the platform will run migrations on deploy if we include that in our deploy hook (we can add a hook like `manage.py migrate`). If it's not automated yet, SSH into the instance for dev-test and run `python manage.py migrate` manually. For prod we should add a safe migration step during deploy.

---

## 8. Summary

- **Local** = fast iteration, SQLite, DEBUG=True, usually hit frontend at `localhost:5173`.
- **Dev** (`nyu-marketplace-dev`) = shared staging on EB with dev RDS + dev S3.
- **Prod** (`nyu-marketplace-env`) = locked down, prod RDS + prod S3.

- Always run `./build_frontend.sh` and commit `backend/frontend_build/` **before any `eb deploy`**.
- Use `eb use <env>` to pick which environment you are about to deploy to.
- Never hardcode secrets in Git. Put them in EB → Configuration → Software → Environment properties.

