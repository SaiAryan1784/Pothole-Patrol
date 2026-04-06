"""
Firebase ID Token authentication backend for DRF.

Every protected API endpoint expects:
    Authorization: Bearer <firebase-id-token>

The token is verified server-side via Firebase Admin SDK. On success, the
corresponding CustomUser is fetched or created (lazy provisioning).
"""
from firebase_admin import auth as firebase_auth
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from apps.accounts.models import CustomUser
from apps.accounts.firebase import initialize_firebase


class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None  # Let other authenticators handle it or return 401

        id_token = auth_header.split('Bearer ')[1].strip()
        if not id_token:
            return None

        initialize_firebase()

        try:
            decoded_token = firebase_auth.verify_id_token(id_token)
        except firebase_auth.ExpiredIdTokenError:
            raise AuthenticationFailed('Firebase ID token has expired.')
        except firebase_auth.InvalidIdTokenError:
            raise AuthenticationFailed('Firebase ID token is invalid.')
        except Exception as exc:
            raise AuthenticationFailed(f'Firebase token verification failed: {exc}')

        firebase_uid = decoded_token.get('uid')
        email = decoded_token.get('email', '')
        name = decoded_token.get('name', '')
        picture = decoded_token.get('picture', '')

        user, _ = CustomUser.objects.get_or_create(
            firebase_uid=firebase_uid,
            defaults={
                'email': email,
                'display_name': name,
                'avatar_url': picture,
            },
        )

        return (user, None)

    def authenticate_header(self, request):
        return 'Bearer realm="api"'
