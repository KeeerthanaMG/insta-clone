import os
from django.core.asgi import get_asgi_application

# Ensure the settings module is set before importing anything else
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "instaclone.settings")

# Initialize Django ASGI application early to ensure the AppRegistry is loaded.
django_asgi_app = get_asgi_application()

# Now import the rest after Django is initialized
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from core.middleware import TokenAuthMiddlewareStack
import core.routing

# Combine WebSocket routing
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        TokenAuthMiddlewareStack(
            URLRouter(core.routing.websocket_urlpatterns)
        )
    ),
})

