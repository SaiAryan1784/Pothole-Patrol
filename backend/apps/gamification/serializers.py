from rest_framework import serializers
from apps.gamification.models import UserScore, Badge


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ['id', 'name', 'description', 'icon_url', 'required_points']


class UserScoreSerializer(serializers.ModelSerializer):
    badges = BadgeSerializer(many=True, read_only=True)

    class Meta:
        model = UserScore
        fields = ['total_points', 'badges']
