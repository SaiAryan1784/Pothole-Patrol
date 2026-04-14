"""
Celery application instance for Pothole Patrol.
Referenced by celery -A config worker -l info
"""
import os
from celery import Celery

# Respect DJANGO_SETTINGS_MODULE from the environment (set to production on Railway).
# Falls back to development only when the env var is not set at all.
os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    os.environ.get('DJANGO_SETTINGS_MODULE', 'config.settings.development'),
)

app = Celery('pothole_patrol')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
