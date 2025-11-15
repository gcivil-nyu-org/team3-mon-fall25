"""
Ensure Django settings are loaded early when running tests locally/CI.

This file is intentionally small and only used during test runs where the
current working directory includes the `backend/` folder on sys.path. It sets
DJANGO_SETTINGS_MODULE if missing and attempts to call django.setup(). This
prevents import-time errors in test files that import Django/DRF modules at
module scope (common in conftest.py fixtures).

NOTE: This is a low-risk test-harness shim to make the test-run environment
behave like CI. If you prefer a different approach, we can remove this later.
"""

import os

if "DJANGO_SETTINGS_MODULE" not in os.environ:
    # Use the local settings by default for tests
    # Note: PR #208 moved CI test configuration to settings_local.py
    os.environ["DJANGO_SETTINGS_MODULE"] = "core.settings_local"

try:
    # Delay import until after env var is set
    import django

    # Only call setup if apps registry is not ready
    try:
        if not django.apps.apps.ready:
            django.setup()
    except Exception:
        # If setup fails here, let pytest handle it and show the original error
        pass
except Exception:
    # Keep silent — this file is only a convenience for test runs
    pass
