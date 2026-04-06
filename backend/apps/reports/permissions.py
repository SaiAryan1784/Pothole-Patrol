"""
Rate limiting permission: max 20 report submissions per user per day.
Uses Redis-backed counter via Django cache.
"""
import logging
from datetime import date

from django.core.cache import cache
from django.conf import settings
from rest_framework.permissions import BasePermission

logger = logging.getLogger(__name__)

DAILY_LIMIT = 20


class DailyReportRateLimit(BasePermission):
    message = f'Daily report limit of {DAILY_LIMIT} reached. Try again tomorrow.'

    def has_permission(self, request, view):
        # Only enforce on write operations
        if request.method != 'POST':
            return True

        user_id = str(request.user.pk)
        today = date.today().isoformat()
        cache_key = f'report_rate_limit:{user_id}:{today}'

        count = cache.get(cache_key, 0)
        if count >= DAILY_LIMIT:
            return False

        # Increment counter; expire at midnight (86400 seconds max)
        import time
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        midnight = datetime.combine(now.date(), datetime.max.time(), tzinfo=timezone.utc)
        seconds_until_midnight = int((midnight - now).total_seconds()) + 1

        cache.set(cache_key, count + 1, timeout=seconds_until_midnight)
        return True
