from .settings_base import *  # noqa: F403, F401
from django.core.management.utils import get_random_secret_key

DEBUG = True

if not SECRET_KEY:  # noqa: F405
    SECRET_KEY = get_random_secret_key()
    # SECURITY WARNING: Automatically write the generated secret key
    # to a .env file if it doesn't exist
    env_path = BASE_DIR / ".env"  # noqa: F405
    if not env_path.exists():
        with open(env_path, "a") as env_file:
            env_file.write(f"DJANGO_SECRET_KEY={SECRET_KEY}\n")

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

# Vite dev server
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False

# SQLite DB
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}

# Debug extension
INSTALLED_APPS += ["django_extensions"]  # noqa: F405
