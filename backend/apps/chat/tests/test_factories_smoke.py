import importlib
import pytest


def test_factories_imports_and_has_helpers():
    f = importlib.import_module("apps.chat.tests._factories")
    assert hasattr(f, "make_nyu_user")
    assert callable(f.make_nyu_user)


@pytest.mark.django_db
def test_factories_create_user_object():
    f = importlib.import_module("apps.chat.tests._factories")
    u = f.make_nyu_user("cov@nyu.edu")
    assert u.email.endswith("@nyu.edu")
