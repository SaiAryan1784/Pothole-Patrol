"""
Celery application instance for Pothole Patrol.
Referenced by celery -A config worker -l info
"""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('pothole_patrol')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
