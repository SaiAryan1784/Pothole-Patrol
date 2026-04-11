"""
Rate limiting permission: max 20 report submissions per user per day.

Key strategy:
- Authenticated requests (Firebase Anonymous Auth) → keyed by Firebase UID.
  This is the normal production path — every device has a stable anonymous UID
  that persists across app restarts.
- Unauthenticated requests (no Bearer token) → keyed by IP address as a
  fallback safety net. This path should never be hit in production once the
  mobile app always sends a token, but is kept for defence-in-depth.

Redis-backed counter via Django cache.
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

        # Prefer UID-based rate limiting (stable across IPs, accurate per device).
        # Firebase anonymous users are always authenticated — request.user.pk is
        # their firebase_uid (the CustomUser primary key).
        if request.user and request.user.is_authenticated:
            limit_key = f'report_rate_limit:uid:{request.user.pk}'
        else:
            client_ip = _get_client_ip(request)
            limit_key = f'report_rate_limit:ip:{client_ip}'

        today = date.today().isoformat()
        cache_key = f'{limit_key}:{today}'

        count = cache.get(cache_key, 0)
        if count >= DAILY_LIMIT:
            return False

        # Expire the counter at midnight so the count resets each day.
        now = datetime.now(timezone.utc)
        midnight = datetime.combine(now.date(), datetime.max.time(), tzinfo=timezone.utc)
        seconds_until_midnight = int((midnight - now).total_seconds()) + 1

        cache.set(cache_key, count + 1, timeout=seconds_until_midnight)
        return True
