"""Top-level pytest conftest to ensure Django settings are available early.

Pytest will load this file before package-level conftest.py files, so this
ensures DJANGO_SETTINGS_MODULE is set and Django is initialized for imports
that happen at module import time in tests or serializers.
"""

import os

import pytest

# Ensure the local settings are used when running tests locally
# Note: PR #208 moved CI test configuration to settings_local.py
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings_local")
pytest_plugins = ("pytest_asyncio",)

try:
    import django

    if not django.apps.apps.ready:
        django.setup()
except Exception:
    # If setup fails, let pytest-django attempt normal configuration and show
    # the original error. We don't raise here to avoid masking underlying
    # configuration issues.
    pass


@pytest.fixture(autouse=True)
def _media_settings(tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path / "media"
    return settings
