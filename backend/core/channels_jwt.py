from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.db import close_old_connections


@database_sync_to_async
def get_user(token_key):
    # Lazily import all Django/DRF JWT bits so this module can be imported
    from django.contrib.auth import get_user_model
    from django.contrib.auth.models import AnonymousUser
    from rest_framework_simplejwt.tokens import UntypedToken
    from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
    from rest_framework_simplejwt.backends import TokenBackend
    from rest_framework_simplejwt.settings import api_settings

    try:
        # This will raise if token is malformed / invalid
        UntypedToken(token_key)

        tb = TokenBackend(
            algorithm=api_settings.ALGORITHM,
            signing_key=api_settings.SIGNING_KEY,
            verifying_key=api_settings.VERIFYING_KEY,
            audience=api_settings.AUDIENCE,
            issuer=api_settings.ISSUER,
        )

        payload = tb.decode(token_key, verify=True)
        user_id = payload.get("user_id")

        if not user_id:
            return AnonymousUser()

        User = get_user_model()
        return User.objects.get(pk=user_id)

    except (InvalidToken, TokenError, Exception):
        # On any failure, return anonymous user instead of blowing up
        from django.contrib.auth.models import AnonymousUser

        return AnonymousUser()


class JWTAuthMiddleware:
    """
    Custom JWT auth middleware for Django Channels.

    Expects the JWT in the websocket query string as ?token=<JWT>.
    Sets scope["user"] to the authenticated user or AnonymousUser.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        from django.contrib.auth.models import AnonymousUser

        # Make sure we don't reuse DB connections across events
        await database_sync_to_async(close_old_connections)()

        try:
            query_string = scope.get("query_string", b"").decode()
            query_params = parse_qs(query_string)
            token = query_params.get("token", [None])[0]

            if token:
                scope["user"] = await get_user(token)
            else:
                scope["user"] = AnonymousUser()
        except Exception:
            scope["user"] = AnonymousUser()

        return await self.app(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """
    Convenience wrapper so we can plug this in like AuthMiddlewareStack.
    """
    return JWTAuthMiddleware(inner)
