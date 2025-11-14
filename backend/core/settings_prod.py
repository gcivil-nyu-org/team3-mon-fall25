import os

from .settings_base import *  # noqa: F403, F401

DEBUG = False

# Avoid cache issues
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"

ALLOWED_HOSTS = [
    "nyumarketplace.me",
    "www.nyumarketplace.me",
    "nyu-marketplace-env.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com",
    ".elasticbeanstalk.com",  # allow any EB CNAME
    ".elb.amazonaws.com",  # allow the ALB health checker hostname
]

CORS_ALLOWED_ORIGINS = [
    "https://nyumarketplace.me",
    "https://www.nyumarketplace.me",
    "http://nyu-marketplace-env.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com",
    "https://nyu-marketplace-env.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com",
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "https://nyumarketplace.me",
    "https://www.nyumarketplace.me",
    "http://nyu-marketplace-env.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com",
    "https://nyu-marketplace-env.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com",
]

DATABASES = {
    "default": {
        "ENGINE": os.getenv("DB_ENGINE", "django.db.backends.mysql"),
        "NAME": os.getenv("DB_NAME", "nyu_marketplace"),
        "USER": os.getenv("DB_USER", "nyu_app"),
        "PASSWORD": os.getenv("DB_PASSWORD", "yourpassword"),
        "HOST": os.getenv(
            "DB_HOST", "nyu-marketplace-mysql.c4d68gyyij18.us-east-1.rds.amazonaws.com"
        ),
        "PORT": os.getenv("DB_PORT", "3306"),
        "OPTIONS": {"init_command": "SET sql_mode='STRICT_ALL_TABLES'"},
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
