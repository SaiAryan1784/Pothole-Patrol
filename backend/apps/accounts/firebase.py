"""
Firebase Admin SDK initializer.
Import this module to guarantee the app is initialized before any SDK calls.

Credential resolution order:
1. FIREBASE_CREDENTIALS_B64 env var — base64-encoded service account JSON (Railway/production)
2. FIREBASE_CREDENTIALS_JSON setting — file path (local dev)
3. Application Default Credentials — GCP environments
"""
import base64
import json
import os

import firebase_admin
from firebase_admin import credentials
from django.conf import settings


def initialize_firebase():
    if firebase_admin._apps:
        return

    b64_creds = os.environ.get('FIREBASE_CREDENTIALS_B64')
    if b64_creds:
        creds_dict = json.loads(base64.b64decode(b64_creds).decode('utf-8'))
        cred = credentials.Certificate(creds_dict)
    else:
        cred_path = getattr(settings, 'FIREBASE_CREDENTIALS_JSON', None)
        if cred_path:
            cred = credentials.Certificate(cred_path)
        else:
            cred = credentials.ApplicationDefault()

    firebase_admin.initialize_app(cred, {
        'storageBucket': getattr(settings, 'FIREBASE_STORAGE_BUCKET', ''),
    })
