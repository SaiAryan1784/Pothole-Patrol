"""
Rate limiting permission: max 20 anonymous report submissions per IP per day.
Uses Redis-backed counter via Django cache.
"""
import logging
from datetime import date, datetime, timezone

from django.core.cache import cache
from rest_framework.permissions import BasePermission

logger = logging.getLogger(__name__)

DAILY_LIMIT = 20


def _get_client_ip(request) -> str:
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')


class AnonDailyRateLimit(BasePermission):
    message = f'Daily report limit of {DAILY_LIMIT} reached. Try again tomorrow.'

    def has_permission(self, request, view):
        # Only enforce on write operations
        if request.method != 'POST':
            return True

        client_ip = _get_client_ip(request)
        today = date.today().isoformat()
        cache_key = f'report_rate_limit:{client_ip}:{today}'

        count = cache.get(cache_key, 0)
        if count >= DAILY_LIMIT:
            return False

        now = datetime.now(timezone.utc)
        midnight = datetime.combine(now.date(), datetime.max.time(), tzinfo=timezone.utc)
        seconds_until_midnight = int((midnight - now).total_seconds()) + 1

        cache.set(cache_key, count + 1, timeout=seconds_until_midnight)
        return True
