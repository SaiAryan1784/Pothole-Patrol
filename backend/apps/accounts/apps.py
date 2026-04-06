from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts'

    def ready(self):
        # Initialize Firebase Admin SDK once at server startup.
        # Guards against double-init on dev server reload.
        from apps.accounts.firebase import initialize_firebase
        try:
            initialize_firebase()
        except Exception:
            # Allow the server to start even if Firebase creds are not yet configured.
            pass
