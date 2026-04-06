from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin

from apps.reports.models import Report


@admin.register(Report)
class ReportAdmin(GISModelAdmin):
    list_display = ['id', 'user', 'severity', 'status', 'confidence', 'upvotes', 'created_at']
    list_filter = ['status', 'severity']
    search_fields = ['user__email', 'user__display_name']
    readonly_fields = ['created_at', 'updated_at', 'confidence']
    ordering = ['-created_at']
