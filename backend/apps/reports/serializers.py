"""
Report serializer and heatmap serializer.

ReportSerializer:
  - Accepts `latitude` + `longitude` as write-only inputs; internally converts
    to a PostGIS Point for the `location` field.
  - On read, exposes `latitude` and `longitude` as flat numeric fields so the
    mobile app never needs to parse GeoJSON.

ReportCreateSerializer:
  - Minimal write-only input for report submission.
  - Triggers ML confidence routing task after successful creation.
"""
from rest_framework import serializers
from django.contrib.gis.geos import Point

from apps.reports.models import Report


class ReportSerializer(serializers.ModelSerializer):
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    user = serializers.StringRelatedField(read_only=True)
    user_has_upvoted = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id', 'user', 'latitude', 'longitude',
            'image_url', 'description', 'severity', 'status',
            'confidence', 'upvotes', 'user_has_upvoted', 'area_name', 'city',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user', 'status', 'upvotes', 'user_has_upvoted',
            'area_name', 'city', 'created_at', 'updated_at',
        ]

    def get_latitude(self, obj) -> float:
        return obj.location.y

    def get_longitude(self, obj) -> float:
        return obj.location.x

    def get_user_has_upvoted(self, obj) -> bool:
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return obj.upvote_records.filter(user=request.user).exists()


class ReportCreateSerializer(serializers.Serializer):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    image_url = serializers.URLField(max_length=500)
    severity = serializers.ChoiceField(choices=['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    confidence = serializers.FloatField(min_value=0.0, max_value=1.0)
    description = serializers.CharField(max_length=1000, required=False, default='')

    def validate(self, data):
        lat = data['latitude']
        lon = data['longitude']
        if not (-90 <= lat <= 90):
            raise serializers.ValidationError({'latitude': 'Must be between -90 and 90.'})
        if not (-180 <= lon <= 180):
            raise serializers.ValidationError({'longitude': 'Must be between -180 and 180.'})
        return data

    def create(self, validated_data):
        location = Point(validated_data.pop('longitude'), validated_data.pop('latitude'), srid=4326)
        return Report.objects.create(location=location, **validated_data)


class HeatmapPointSerializer(serializers.Serializer):
    """Lightweight read-only serializer for heatmap endpoints."""
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    weight = serializers.FloatField()
