from urllib.parse import parse_qs

from channels.auth import AuthMiddlewareStack
from django.contrib.auth import get_user_model
from django.db import close_old_connections
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.tokens import UntypedToken

User = get_user_model()


class JWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    def __call__(self, scope):
        return JWTAuthMiddlewareInstance(scope, self.inner)


class JWTAuthMiddlewareInstance:
    def __init__(self, scope, inner):
        self.scope = dict(scope)
        self.inner = inner

    async def __call__(self, receive, send):
        query = parse_qs(self.scope.get("query_string", b"").decode())
        token = (query.get("token") or [None])[0]

        user = None
        if token:
            try:
                UntypedToken(token)
                from rest_framework_simplejwt.backends import TokenBackend

                tb = TokenBackend(
                    algorithm=jwt_settings.ALGORITHM,
                    signing_key=jwt_settings.SIGNING_KEY,
                    verifying_key=jwt_settings.VERIFYING_KEY,
                    audience=jwt_settings.AUDIENCE,
                    issuer=jwt_settings.ISSUER,
                    jti_claim=jwt_settings.JTI_CLAIM,
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
        self.scope["user"] = user
        inner = self.inner(self.scope)
        return await inner(receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(AuthMiddlewareStack(inner))
