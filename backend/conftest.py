import os
import pytest

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings_ci")


@pytest.fixture(autouse=True)
def _media_settings(tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path / "media"
    return settings
