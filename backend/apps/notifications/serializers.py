from rest_framework import serializers
from apps.notifications.models import FCMDevice


class FCMDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = FCMDevice
        fields = ['id', 'token', 'is_active', 'created_at']
        read_only_fields = ['id', 'is_active', 'created_at']
