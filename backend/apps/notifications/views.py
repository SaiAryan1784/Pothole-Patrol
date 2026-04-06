"""
Notification views — registering FCM tokens for push notifications.
"""
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.notifications.models import FCMDevice
from apps.notifications.serializers import FCMDeviceSerializer


class FCMDeviceCreateView(generics.CreateAPIView):
    """
    POST /v1/notifications/devices/
    Register a new FCM token for the authenticated user.
    If the token already exists for another user, it updates ownership.
    """
    serializer_class = FCMDeviceSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        token = self.request.data.get('token')
        # Handle token migration if it exists for a different user
        FCMDevice.objects.filter(token=token).delete()
        serializer.save(user=self.request.user)
