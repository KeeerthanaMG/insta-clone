from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from rest_framework.authtoken.models import Token


@database_sync_to_async
def get_user_from_token(token_key):
    """
    Get user from DRF token. Returns AnonymousUser if token is invalid.
    """
    try:
        token = Token.objects.select_related('user').get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()


class TokenAuthMiddleware(BaseMiddleware):
    """
    Custom middleware to authenticate WebSocket connections using DRF tokens.
    
    Supports two methods:
    1. Query parameter: ws://host/path/?token=<token_key>
    2. Authorization header: Authorization: Token <token_key>
    """
    
    async def __call__(self, scope, receive, send):
        # Close old database connections to prevent usage of timed out connections
        close_old_connections()
        
        # Try to get token from query string first
        token_key = None
        if scope["query_string"]:
            query_params = parse_qs(scope["query_string"].decode())
            if "token" in query_params:
                token_key = query_params["token"][0]
        
        # If no token in query string, try headers
        if not token_key:
            for header_name, header_value in scope.get("headers", []):
                if header_name == b"authorization":
                    auth_header = header_value.decode()
                    if auth_header.startswith("Token "):
                        token_key = auth_header[6:]  # Remove "Token " prefix
                        break
        
        # Get user from token or set as anonymous
        if token_key:
            scope["user"] = await get_user_from_token(token_key)
        else:
            scope["user"] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)


def TokenAuthMiddlewareStack(inner):
    """
    Convenience function similar to AuthMiddlewareStack but using TokenAuthMiddleware.
    """
    return TokenAuthMiddleware(inner)
