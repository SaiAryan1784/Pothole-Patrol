"""
Civic body dispatch tasks — dispatch verified reports to GDA/MCD/NMMC.

Dispatch strategy (in priority order):
1. REST webhook (if civic body has webhook_url configured).
2. Formatted email (always as fallback).
"""
import logging

import requests
from celery import shared_task
from django.conf import settings
from django.contrib.gis.geos import Point
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _find_civic_body_for_report(report):
    """
    Find the active CivicBody whose region_boundary contains the report location.
    Returns None if no match is found.
    """
    from apps.civic.models import CivicBody

    return CivicBody.objects.filter(
        is_active=True,
        region_boundary__contains=report.location,
    ).first()


@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def dispatch_report_to_civic_body(self, report_id: int) -> dict:
    """
    Route a verified report to the correct civic body via webhook or email.
    """
    from apps.reports.models import Report

    try:
        report = Report.objects.select_related('user').get(pk=report_id)
    except Report.DoesNotExist:
        logger.error('dispatch_report_to_civic_body: Report %s not found', report_id)
        return {'error': 'report_not_found'}

    civic_body = _find_civic_body_for_report(report)
    if not civic_body:
        logger.warning('No civic body found for report %s location', report_id)
        return {'dispatched': False, 'reason': 'no_civic_body_match'}

    # Build a human-readable payload
    lat = report.location.y
    lon = report.location.x
    maps_url = f'https://maps.google.com/?q={lat},{lon}'
    payload = {
        'report_id': report_id,
        'severity': report.severity,
        'status': report.status,
        'confidence': report.confidence,
        'latitude': lat,
        'longitude': lon,
        'image_url': report.image_url,
        'maps_url': maps_url,
        'reported_at': report.created_at.isoformat(),
    }

    # --- Webhook dispatch ---
    if civic_body.webhook_url:
        try:
            response = requests.post(
                civic_body.webhook_url,
                json=payload,
                timeout=10,
                headers={'Content-Type': 'application/json'},
            )
            response.raise_for_status()
            logger.info(
                'Dispatched report %s to %s via webhook (status=%s)',
                report_id, civic_body.name, response.status_code,
            )
            return {'dispatched': True, 'method': 'webhook', 'civic_body': civic_body.name}
        except requests.RequestException as exc:
            logger.error('Webhook dispatch failed for %s: %s', civic_body.name, exc)
            # Fall through to email

    # --- Email dispatch ---
    subject = f'[Pothole Patrol] New {report.severity} Pothole Report #{report_id}'
    message = (
        f'A new pothole report has been submitted and verified in your jurisdiction.\n\n'
        f'  Report ID  : {report_id}\n'
        f'  Severity   : {report.severity}\n'
        f'  Confidence : {report.confidence:.0%}\n'
        f'  Location   : {lat:.6f}, {lon:.6f}\n'
        f'  Google Maps: {maps_url}\n'
        f'  Image      : {report.image_url}\n\n'
        f'Please action this report at your earliest convenience.'
    )
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.CIVIC_EMAIL_SENDER,
            recipient_list=[civic_body.contact_email],
            fail_silently=False,
        )
        logger.info('Dispatched report %s to %s via email', report_id, civic_body.name)
        return {'dispatched': True, 'method': 'email', 'civic_body': civic_body.name}
    except Exception as exc:
        logger.error('Email dispatch failed for %s: %s', civic_body.name, exc)
        raise self.retry(exc=exc)
