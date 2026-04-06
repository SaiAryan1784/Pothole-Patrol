"""
Notification tasks — FCM push notifications via Firebase Admin SDK.
"""
import logging

from celery import shared_task
from firebase_admin import messaging

from apps.accounts.firebase import initialize_firebase

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_push_notification(self, user_id: str, title: str, body: str, data: dict = None) -> dict:
    """
    Send an FCM push notification to all active devices registered for a user.
    Deactivates stale tokens (registration-not-registered errors) automatically.
    """
    from apps.notifications.models import FCMDevice

    initialize_firebase()

    devices = FCMDevice.objects.filter(user_id=user_id, is_active=True)
    if not devices.exists():
        logger.info('send_push_notification: No active devices for user %s', user_id)
        return {'sent': 0}

    sent = 0
    failed_tokens = []

    for device in devices:
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            token=device.token,
        )
        try:
            messaging.send(message)
            sent += 1
        except messaging.UnregisteredError:
            logger.warning('Stale FCM token %s — deactivating', device.token[:12])
            failed_tokens.append(device.token)
        except Exception as exc:
            logger.error('FCM send failed for token %s: %s', device.token[:12], exc)

    if failed_tokens:
        FCMDevice.objects.filter(token__in=failed_tokens).update(is_active=False)

    logger.info('send_push_notification: %d/%d messages sent for user %s', sent, devices.count(), user_id)
    return {'sent': sent, 'deactivated': len(failed_tokens)}
