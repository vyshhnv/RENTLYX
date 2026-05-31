"""
WSGI config for project1 project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
VENDOR_SITE_PACKAGES = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "vendor_py"))

if os.path.isdir(VENDOR_SITE_PACKAGES) and VENDOR_SITE_PACKAGES not in sys.path:
    sys.path.insert(0, VENDOR_SITE_PACKAGES)

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project1.settings')

application = get_wsgi_application()
