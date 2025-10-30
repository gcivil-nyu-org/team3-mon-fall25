from pathlib import Path
from django.core.management.utils import get_random_secret_key
from datetime import timedelta # JWT settings
from dotenv import load_dotenv
import os
import pymysql


# Set MySQL
pymysql.install_as_MySQLdb()


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Load environment variables from .env file
load_dotenv(BASE_DIR / ".env")


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")

if not SECRET_KEY:
    SECRET_KEY = get_random_secret_key()
    # SECURITY WARNING: Automatically write the generated secret key to a .env file if it doesn't exist
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        with open(env_path, "a") as env_file:
            env_file.write(f"DJANGO_SECRET_KEY={SECRET_KEY}\n")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# ALLOWED_HOSTS = [
#     "127.0.0.1",
#     "localhost",
#     "marketplace-env.eba-2uqrmgb2.us-east-1.elasticbeanstalk.com",
# ]

ALLOWED_HOSTS_ENV = os.environ.get("ALLOWED_HOSTS")
ALLOWED_HOSTS = ["*"]
# I've set : "127.0.0.1,localhost,nyu-marketplace-env.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com"
# to the env ALLOWED_HOSTS.
# if ALLOWED_HOSTS_ENV:
#     ALLOWED_HOSTS = [h.strip() for h in ALLOWED_HOSTS_ENV.split(",")]
#     ALLOWED_HOSTS += ["*"] 
# else:
#     # For development (local runserver)
#     ALLOWED_HOSTS = ["127.0.0.1", "localhost", "*"]

# Application definition
INSTALLED_APPS = [
    "apps.users",
    "apps.listings",
    "rest_framework",
    "corsheaders",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_filters"
]
if DEBUG:
    INSTALLED_APPS += ['django_extensions']

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "frontend_build"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.sqlite3",
#         "NAME": BASE_DIR / "db.sqlite3",
#     }
# }

DATABASES = {
    "default": {
        "ENGINE": os.getenv("DB_ENGINE", "django.db.backends.mysql"),
        "NAME": os.getenv("DB_NAME", "nyu_marketplace"),
        "USER": os.getenv("DB_USER", "nyu_app"),
        "PASSWORD": os.getenv("DB_PASSWORD", "yourpassword"),
        "HOST": os.getenv("DB_HOST", "nyu-marketplace-mysql.c4d68gyyij18.us-east-1.rds.amazonaws.com"),
        "PORT": os.getenv("DB_PORT", "3306"),
        "OPTIONS": {"init_command": "SET sql_mode='STRICT_ALL_TABLES'"},
    }
}


# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [ BASE_DIR / "static" ]
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"
TEMPLATES[0]["DIRS"] = [
    BASE_DIR / "frontend_build",   # index.html from Vite build
    BASE_DIR / "staticfiles",
]

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Custom User Model
AUTH_USER_MODEL = "users.User"

# REST Framework settings
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    # Don't set IsAuthenticated as default - let views control their own permissions
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
}

# JWT settings
SIMPLE_JWT = {
    "USER_ID_FIELD": "user_id",
    "USER_ID_CLAIM": "user_id",
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "user_id",  # Use user_id instead of id
    "USER_ID_CLAIM": "user_id",  # Use user_id in JWT payload
}

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
    "https://nyu-marketplace-env.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com",
]

CORS_ALLOW_CREDENTIALS = True

# CSRF settings - trust frontend origin
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://nyu-marketplace-env.eba-vjpy9jfw.us-east-1.elasticbeanstalk.com",
]

# For development, we can also exempt API endpoints from CSRF
# Since we're using JWT tokens for authentication
CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "us-east-1")
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME")
