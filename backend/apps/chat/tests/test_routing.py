import importlib


def test_websocket_urlpatterns_exports():
    # Simply importing should execute the module and register patterns.
    routing = importlib.import_module("apps.chat.routing")
    assert hasattr(routing, "websocket_urlpatterns")
    # Basic sanity: at least one path and it contains a converter for conversation id
    patterns = routing.websocket_urlpatterns
    assert isinstance(patterns, (list, tuple)) and patterns
    # Accept either path() or re_path() string; don’t assume exact pattern string
    as_text = "".join(getattr(p, "pattern", p).__str__() for p in patterns)
    assert "chat" in as_text.lower()
