"""
ML verification task.

After a report is submitted, this task:
1. Evaluates the stored confidence score against thresholds from settings.
2. Updates the report status accordingly.
3. Awards gamification points for auto-verified reports.
4. Dispatches to civic body if confidence is high enough.
"""
import logging

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

AUTO_VERIFY = settings.ML_CONFIDENCE_THRESHOLD_AUTO_VERIFY  # default 0.70
REVIEW_MIN = settings.ML_CONFIDENCE_THRESHOLD_REVIEW        # default 0.50

POINTS_PER_VERIFIED_REPORT = 10


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def process_report_ml(self, report_id: int) -> dict:
    """
    Evaluate ML confidence and transition report status.

    Returns a dict summarising the outcome so Celery results can be inspected.
    """
    from apps.reports.models import Report, STATUS_CHOICES
    from apps.gamification.tasks import award_points_for_report
    from apps.civic.tasks import dispatch_report_to_civic_body

    try:
        report = Report.objects.select_related('user').get(pk=report_id)
    except Report.DoesNotExist:
        logger.error('process_report_ml: Report %s not found', report_id)
        return {'error': 'report_not_found'}

    confidence = report.confidence

    if confidence >= AUTO_VERIFY:
        report.status = STATUS_CHOICES.VERIFIED
        report.save(update_fields=['status', 'updated_at'])
        logger.info('Report %s auto-verified (confidence=%.2f)', report_id, confidence)

        # Award points and dispatch to civic body asynchronously
        award_points_for_report.delay(report_id)
        dispatch_report_to_civic_body.delay(report_id)

    elif confidence >= REVIEW_MIN:
        report.status = STATUS_CHOICES.NEEDS_REVIEW
        report.save(update_fields=['status', 'updated_at'])
        logger.info('Report %s flagged for review (confidence=%.2f)', report_id, confidence)

    else:
        report.status = STATUS_CHOICES.REJECTED
        report.save(update_fields=['status', 'updated_at'])
        logger.info('Report %s rejected (confidence=%.2f)', report_id, confidence)

    return {'report_id': report_id, 'status': report.status, 'confidence': confidence}
