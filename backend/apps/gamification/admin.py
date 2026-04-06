from django.contrib import admin

from apps.gamification.models import Badge, UserScore


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['name', 'required_points']
    ordering = ['required_points']


@admin.register(UserScore)
class UserScoreAdmin(admin.ModelAdmin):
    list_display = ['user', 'total_points']
    list_filter = ['badges']
    ordering = ['-total_points']
    raw_id_fields = ['user']
