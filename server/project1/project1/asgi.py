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
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
VENDOR_SITE_PACKAGES = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "vendor_py"))

if os.path.isdir(VENDOR_SITE_PACKAGES) and VENDOR_SITE_PACKAGES not in sys.path:
    sys.path.insert(0, VENDOR_SITE_PACKAGES)

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
