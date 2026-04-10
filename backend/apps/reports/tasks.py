"""
ML verification task.

After a report is submitted, this task:
1. Downloads the report image and runs server-side YOLOv8 inference.
2. Updates report.confidence with the server-derived score.
3. Evaluates confidence against thresholds from settings.
4. Updates the report status accordingly.
5. Awards gamification points for auto-verified reports.
6. Dispatches to civic body if confidence is high enough.
"""
import logging
import os
import tempfile

import requests
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

AUTO_VERIFY = settings.ML_CONFIDENCE_THRESHOLD_AUTO_VERIFY  # default 0.70
REVIEW_MIN = settings.ML_CONFIDENCE_THRESHOLD_REVIEW        # default 0.50

POINTS_PER_VERIFIED_REPORT = 10


def _run_yolo_inference(image_url: str) -> float | None:
    """
    Download image from Firebase Storage URL and run YOLOv8 inference.

    Returns max detection confidence (0.0–1.0), or None if the model is
    unavailable so the caller can fall back to the client-submitted value.
    """
    model_path = settings.ML_MODEL_PATH
    if not model_path or not os.path.exists(model_path):
        logger.warning('_run_yolo_inference: model not found at %r, skipping server-side inference', model_path)
        return None

    response = requests.get(image_url, timeout=30)
    response.raise_for_status()

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        from ultralytics import YOLO
        model = YOLO(model_path)
        results = model(tmp_path, verbose=False)

        confidences = [
            box.conf.max().item()
            for r in results
            for box in [r.boxes]
            if len(box.conf)
        ]
        server_confidence = max(confidences) if confidences else 0.0
        logger.info('_run_yolo_inference: server_confidence=%.4f for %s', server_confidence, image_url)
        return server_confidence
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def process_report_ml(self, report_id: int) -> dict:
    """
    Run server-side ML inference, then transition report status.

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

    # Run server-side inference. If the model is unavailable, route to NEEDS_REVIEW
    # rather than trusting the client-submitted confidence (which is trivially spoofable).
    model_available = True
    try:
        server_confidence = _run_yolo_inference(report.image_url)
        if server_confidence is not None:
            report.confidence = server_confidence
            report.save(update_fields=['confidence', 'updated_at'])
        else:
            model_available = False
    except requests.RequestException as exc:
        logger.warning('process_report_ml: image download failed for report %s: %s — retrying', report_id, exc)
        raise self.retry(exc=exc)
    except Exception as exc:
        logger.exception('process_report_ml: inference error for report %s: %s — flagging for review', report_id, exc)
        model_available = False

    # If ML is unavailable, send to human review queue — never auto-verify on client confidence.
    if not model_available:
        report.status = STATUS_CHOICES.NEEDS_REVIEW
        report.save(update_fields=['status', 'updated_at'])
        logger.info('Report %s → NEEDS_REVIEW (ML model unavailable)', report_id)
        return {'report_id': report_id, 'status': report.status, 'confidence': report.confidence}

    confidence = report.confidence

    if confidence >= AUTO_VERIFY:
        report.status = STATUS_CHOICES.VERIFIED
        report.save(update_fields=['status', 'updated_at'])
        logger.info('Report %s auto-verified (confidence=%.2f)', report_id, confidence)

        # Award points only if the report was submitted by a logged-in user
        if report.user is not None:
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
