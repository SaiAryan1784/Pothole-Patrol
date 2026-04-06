from rest_framework import serializers
from apps.accounts.models import CustomUser


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['firebase_uid', 'email', 'display_name', 'phone_number', 'avatar_url', 'date_joined']
        read_only_fields = ['firebase_uid', 'date_joined']
