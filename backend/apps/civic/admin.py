from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin

from apps.civic.models import CivicBody


@admin.register(CivicBody)
class CivicBodyAdmin(GISModelAdmin):
    list_display = ['name', 'contact_email', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'contact_email']
