from .settings_base import *  # noqa: F403, F401
import os

DEBUG = True

# Avoid cache issues
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"

ALLOWED_HOSTS = [
    "nyu-marketplace-dev.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com",
    os.environ.get("nyu-marketplace-dev-test.elasticbeanstalk.com"),
    "localhost",
]

CORS_ALLOWED_ORIGINS = [
    "http://nyu-marketplace-dev.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "http://nyu-marketplace-dev.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# MySQL
DATABASES = {
    "default": {
        "ENGINE": os.getenv("DB_ENGINE", "django.db.backends.mysql"),
        "NAME": os.environ.get("DB_NAME", "nyu_marketplace_dev"),
        "USER": os.environ.get("DB_USER", "nyu_app"),
        "PASSWORD": os.environ.get("DB_PASSWORD", "yourpassword"),
        "HOST": os.environ.get(
            "DB_HOST",
            "nyu-marketplace-dev-mysql.c4d68gyyij18.us-east-1.rds.amazonaws.com",
        ),
        "PORT": os.environ.get("DB_PORT", "3306"),
        "OPTIONS": {
            "init_command": "SET sql_mode='STRICT_ALL_TABLES'",
        },
    }
}

SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "us-east-1")
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME")
