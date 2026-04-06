"""
Account views — user profile management.
"""
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.accounts.serializers import UserProfileSerializer


class MeView(generics.RetrieveUpdateAPIView):
    """
    GET  /v1/accounts/me/  → Return the authenticated user's profile.
    PATCH /v1/accounts/me/ → Update display_name, phone_number, avatar_url.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
