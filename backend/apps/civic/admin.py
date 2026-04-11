from django.contrib import admin

from apps.civic.models import CivicBody


@admin.register(CivicBody)
class CivicBodyAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_email', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'contact_email']
