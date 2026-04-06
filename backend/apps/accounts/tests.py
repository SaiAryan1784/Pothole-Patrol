"""Tests for the accounts app."""
import pytest
from unittest.mock import patch
from firebase_admin import auth as firebase_auth
from rest_framework.exceptions import AuthenticationFailed

from apps.accounts.authentication import FirebaseAuthentication


@pytest.mark.django_db
class TestMeView:
    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get('/v1/accounts/me/')
        assert response.status_code == 401

    def test_authenticated_returns_profile_shape(self, auth_client, user):
        response = auth_client.get('/v1/accounts/me/')
        assert response.status_code == 200
        data = response.json()
        assert 'firebase_uid' in data
        assert 'email' in data
        assert 'display_name' in data
        assert data['firebase_uid'] == user.firebase_uid

    def test_patch_updates_display_name(self, auth_client, user):
        response = auth_client.patch('/v1/accounts/me/', {'display_name': 'New Name'}, format='json')
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.display_name == 'New Name'


class TestFirebaseAuthentication:
    def test_expired_token_raises_authentication_failed(self):
        from django.test import RequestFactory
        request = RequestFactory().get('/', HTTP_AUTHORIZATION='Bearer some-expired-token')
        auth = FirebaseAuthentication()
        with patch('apps.accounts.authentication.firebase_auth.verify_id_token',
                   side_effect=firebase_auth.ExpiredIdTokenError('expired', None)):
            with pytest.raises(AuthenticationFailed, match='expired'):
                auth.authenticate(request)

    def test_invalid_token_raises_authentication_failed(self):
        from django.test import RequestFactory
        request = RequestFactory().get('/', HTTP_AUTHORIZATION='Bearer bad-token')
        auth = FirebaseAuthentication()
        with patch('apps.accounts.authentication.firebase_auth.verify_id_token',
                   side_effect=firebase_auth.InvalidIdTokenError('invalid')):
            with pytest.raises(AuthenticationFailed, match='invalid'):
                auth.authenticate(request)

    def test_no_bearer_header_returns_none(self):
        from django.test import RequestFactory
        request = RequestFactory().get('/')
        auth = FirebaseAuthentication()
        assert auth.authenticate(request) is None
