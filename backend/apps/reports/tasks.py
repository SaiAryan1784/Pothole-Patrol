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


def _delete_cloudinary_image(image_url: str) -> None:
    """
    Delete a Cloudinary image by its secure URL.

    Cloudinary URLs look like:
      https://res.cloudinary.com/<cloud>/image/upload/v1234/pothole-patrol/abc.jpg
    The public_id is everything after /upload/v<version>/ without the extension.
    """
    try:
        after_upload = image_url.split('/upload/')[1]
        parts = after_upload.split('/')
        if parts[0].startswith('v') and parts[0][1:].isdigit():
            parts = parts[1:]
        last = parts[-1]
        parts[-1] = last.rsplit('.', 1)[0]
        public_id = '/'.join(parts)

        import cloudinary.uploader
        cloudinary.uploader.destroy(public_id, resource_type='image')
        logger.info('_delete_cloudinary_image: deleted %s', public_id)
    except Exception as exc:
        logger.warning('_delete_cloudinary_image: failed for %s: %s', image_url, exc)


def _reverse_geocode(lat: float, lng: float) -> tuple[str, str]:
    """
    Call Google Maps Geocoding API to get human-readable area name and city.

    Returns (area_name, city). Falls back to empty strings on any error so
    the caller never has to handle an exception path.
    """
    api_key = settings.GOOGLE_MAPS_API_KEY
    if not api_key:
        return ('', '')
    try:
        resp = requests.get(
            'https://maps.googleapis.com/maps/api/geocode/json',
            params={'latlng': f'{lat},{lng}', 'key': api_key},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get('status') != 'OK' or not data.get('results'):
            return ('', '')

        components = data['results'][0].get('address_components', [])
        area_name = ''
        city = ''
        for comp in components:
            types = comp.get('types', [])
            if not area_name and ('sublocality' in types or 'neighborhood' in types or 'sublocality_level_1' in types):
                area_name = comp['long_name']
            if not city and ('locality' in types or 'administrative_area_level_2' in types):
                city = comp['long_name']
        return (area_name, city)
    except Exception as exc:
        logger.warning('_reverse_geocode: failed for (%s, %s): %s', lat, lng, exc)
        return ('', '')


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
        lat = report.location.y
        lng = report.location.x
        area_name, city = _reverse_geocode(lat, lng)
        report.area_name = area_name
        report.city = city
        report.save(update_fields=['status', 'area_name', 'city', 'updated_at'])
        logger.info('Report %s auto-verified (confidence=%.2f, area=%r, city=%r)', report_id, confidence, area_name, city)

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
        logger.info('Report %s rejected (confidence=%.2f) — scheduled for deletion in 5 h', report_id, confidence)
        # Keep the record for 5 hours so the user can see the rejection on the
        # status screen, then purge both the DB row and the Cloudinary image.
        delete_rejected_report.apply_async(args=[report_id], countdown=5 * 60 * 60)

    return {'report_id': report_id, 'status': report.status, 'confidence': confidence}


@shared_task
def delete_rejected_report(report_id: int) -> dict:
    """
    Purge a REJECTED report 5 hours after it was rejected.

    Deletes the Cloudinary image first (best-effort), then the DB row.
    Only acts on reports still in REJECTED status — if an admin manually
    changed the status in the meantime, the record is left alone.
    """
    from apps.reports.models import Report, STATUS_CHOICES

    try:
        report = Report.objects.get(pk=report_id, status=STATUS_CHOICES.REJECTED)
    except Report.DoesNotExist:
        logger.info('delete_rejected_report: report %s not found or no longer REJECTED — skipping', report_id)
        return {'skipped': True}

    image_url = report.image_url
    report.delete()
    logger.info('delete_rejected_report: deleted report %s from DB', report_id)

    _delete_cloudinary_image(image_url)
    return {'report_id': report_id, 'deleted': True}
