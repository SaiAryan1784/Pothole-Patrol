"""
Firebase Admin SDK initializer.
Import this module to guarantee the app is initialized before any SDK calls.
"""
import firebase_admin
from firebase_admin import credentials
from django.conf import settings


def initialize_firebase():
    if not firebase_admin._apps:
        cred_path = getattr(settings, 'FIREBASE_CREDENTIALS_JSON', None)
        if cred_path:
            cred = credentials.Certificate(cred_path)
        else:
            # Fall back to Application Default Credentials (useful in GCP environments)
            cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'storageBucket': getattr(settings, 'FIREBASE_STORAGE_BUCKET', ''),
        })
