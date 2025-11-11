from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from django.db import close_old_connections
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.tokens import UntypedToken

User = get_user_model()


class JWTAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        query = parse_qs(scope.get("query_string", b"").decode())
        token = (query.get("token") or [None])[0]

        user = None
        if token:
            try:
                # Quick structural check
                UntypedToken(token)

                # Decode & verify (omit jti_claim – not supported on your version)
                from rest_framework_simplejwt.backends import TokenBackend

                tb = TokenBackend(
                    algorithm=jwt_settings.ALGORITHM,
                    signing_key=jwt_settings.SIGNING_KEY,
                    verifying_key=jwt_settings.VERIFYING_KEY,
                    audience=jwt_settings.AUDIENCE,
                    issuer=jwt_settings.ISSUER,
                )
                payload = tb.decode(token, verify=True)
                uid = str(payload.get("user_id"))
                if uid:
                    try:
                        user = await User.objects.aget(pk=uid)
                    except Exception:
                        user = None
            except (InvalidToken, TokenError):
                user = None

        close_old_connections()
        scope["user"] = user or AnonymousUser()
        return await self.app(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
