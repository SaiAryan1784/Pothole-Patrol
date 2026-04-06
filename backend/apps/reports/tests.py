"""Tests for the reports app."""
import pytest
from django.contrib.gis.geos import Point
from unittest.mock import patch

from apps.reports.models import Report, Upvote, STATUS_CHOICES, SEVERITY_CHOICES


VALID_PAYLOAD = {
    'latitude': 28.6139,
    'longitude': 77.2090,
    'image_url': 'https://example.com/pothole.jpg',
    'severity': 'MEDIUM',
    'confidence': 0.82,
}


@pytest.mark.django_db
class TestReportListCreate:
    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.post('/v1/reports/', VALID_PAYLOAD, format='json')
        assert response.status_code == 401

    def test_valid_payload_creates_report(self, auth_client):
        with patch('apps.reports.views.process_report_ml') as mock_task:
            mock_task.delay = lambda pk: None
            response = auth_client.post('/v1/reports/', VALID_PAYLOAD, format='json')
        assert response.status_code == 201
        data = response.json()
        assert data['severity'] == 'MEDIUM'
        assert data['status'] == 'PENDING'

    def test_invalid_payload_returns_400(self, auth_client):
        bad_payload = {**VALID_PAYLOAD, 'latitude': 999}  # out of range
        response = auth_client.post('/v1/reports/', bad_payload, format='json')
        assert response.status_code == 400

    def test_deduplication_within_50m_increments_upvotes(self, auth_client, verified_report):
        # Submit report at nearly the same location (within 50m)
        payload = {
            **VALID_PAYLOAD,
            'latitude': verified_report.location.y + 0.0001,  # ~11m away
            'longitude': verified_report.location.x,
        }
        response = auth_client.post('/v1/reports/', payload, format='json')
        assert response.status_code == 200
        assert 'Nearby report upvoted' in response.json()['detail']
        verified_report.refresh_from_db()
        assert verified_report.upvotes == 4  # was 3, now 4

    def test_deduplication_beyond_50m_creates_new_report(self, auth_client, verified_report):
        # Submit report far away (~1km north)
        payload = {
            **VALID_PAYLOAD,
            'latitude': verified_report.location.y + 0.01,
            'longitude': verified_report.location.x,
        }
        with patch('apps.reports.views.process_report_ml') as mock_task:
            mock_task.delay = lambda pk: None
            response = auth_client.post('/v1/reports/', payload, format='json')
        assert response.status_code == 201

    def test_rate_limit_blocks_21st_report(self, auth_client):
        # Exhaust the daily limit (20 reports)
        for _ in range(20):
            with patch('apps.reports.views.process_report_ml') as mock_task:
                mock_task.delay = lambda pk: None
                auth_client.post('/v1/reports/', VALID_PAYLOAD, format='json')

        response = auth_client.post('/v1/reports/', VALID_PAYLOAD, format='json')
        assert response.status_code == 403


@pytest.mark.django_db
class TestReportUpvote:
    def test_upvote_own_report_returns_400(self, auth_client, verified_report):
        response = auth_client.post(f'/v1/reports/{verified_report.pk}/upvote/')
        assert response.status_code == 400
        assert 'own report' in response.json()['detail']

    def test_upvote_other_report_increments_count(self, other_auth_client, verified_report):
        initial = verified_report.upvotes
        response = other_auth_client.post(f'/v1/reports/{verified_report.pk}/upvote/')
        assert response.status_code == 200
        assert response.json()['upvotes'] == initial + 1

    def test_upvote_is_idempotent(self, other_auth_client, verified_report):
        initial = verified_report.upvotes
        other_auth_client.post(f'/v1/reports/{verified_report.pk}/upvote/')
        other_auth_client.post(f'/v1/reports/{verified_report.pk}/upvote/')
        verified_report.refresh_from_db()
        assert verified_report.upvotes == initial + 1  # not +2

    def test_upvote_nonexistent_report_returns_404(self, other_auth_client):
        response = other_auth_client.post('/v1/reports/99999/upvote/')
        assert response.status_code == 404
