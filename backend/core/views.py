"""
InstaCam Views Router
====================

This file serves as a router that imports all views from:
- core_views.py: Normal application logic (posts, feeds, profiles, etc.)
- ctf_views.py: CTF/vulnerability challenge endpoints

This modular approach separates production-safe features from intentional
vulnerabilities, making the codebase more maintainable and educational.
"""

# Import all core application views (production-safe)
from .core_views import *

# Import all CTF challenge views (intentionally vulnerable for education)
from .ctf_views import *
