"""
ASGI config for project1 project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

# your_project/asgi.py
# project1/asgi.py
# project1/asgi.py
# project1/asgi.py
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project1.settings')

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

# ✅ get_asgi_application() FIRST — loads the app registry
django_asgi_app = get_asgi_application()

# ✅ Import routing AFTER app registry is ready
import chat_app.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": URLRouter(
        chat_app.routing.websocket_urlpatterns
    ),
})