"""
Shared pytest fixtures for Pothole Patrol backend tests.
"""
import pytest
from django.contrib.gis.geos import Point
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return CustomUser.objects.create(
        firebase_uid='test-uid-001',
        email='test@example.com',
        display_name='Test User',
    )


@pytest.fixture
def other_user(db):
    return CustomUser.objects.create(
        firebase_uid='test-uid-002',
        email='other@example.com',
        display_name='Other User',
    )


@pytest.fixture
def auth_client(api_client, user):
    """APIClient authenticated as `user` by force-authenticating (bypasses Firebase)."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def other_auth_client(api_client, other_user):
    api_client.force_authenticate(user=other_user)
    return api_client


@pytest.fixture
def verified_report(db, user):
    from apps.reports.models import Report, STATUS_CHOICES, SEVERITY_CHOICES
    return Report.objects.create(
        user=user,
        location=Point(77.209, 28.6139, srid=4326),
        image_url='https://example.com/img.jpg',
        severity=SEVERITY_CHOICES.MEDIUM,
        status=STATUS_CHOICES.VERIFIED,
        confidence=0.85,
        upvotes=3,
    )
