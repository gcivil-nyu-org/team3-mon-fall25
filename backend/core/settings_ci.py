from .settings_base import BASE_DIR

# Use SQLite for CI tests (no MySQL needed)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test.sqlite3",
    }
}

# Ensure STORAGES exists (Django 5+), then force local disk backends for CI
try:
    STORAGES  # type: ignore[name-defined]
except NameError:
    STORAGES = {}

STORAGES["default"] = {
    "BACKEND": "django.core.files.storage.FileSystemStorage",
}
STORAGES["staticfiles"] = {
    "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
}

# Also set legacy vars for any code/plugins that still read them
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

STATIC_ROOT = BASE_DIR / "staticfiles_ci"

# Channels – in-memory layer for tests
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}

# REST Framework sane defaults for tests
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]
