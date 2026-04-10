from django.contrib.gis.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class SEVERITY_CHOICES(models.TextChoices):
    LOW = 'LOW', _('Low')
    MEDIUM = 'MEDIUM', _('Medium')
    HIGH = 'HIGH', _('High')
    CRITICAL = 'CRITICAL', _('Critical')

class STATUS_CHOICES(models.TextChoices):
    PENDING = 'PENDING', _('Pending')
    NEEDS_REVIEW = 'NEEDS_REVIEW', _('Needs Review')
    VERIFIED = 'VERIFIED', _('Verified')
    REJECTED = 'REJECTED', _('Rejected')
    REPAIRED = 'REPAIRED', _('Repaired')

class Report(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reports'
    )
    
    location = models.PointField(geography=True, spatial_index=True)
    image_url = models.URLField(max_length=500)
    
    description = models.TextField(blank=True, default='')
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES.choices, default=SEVERITY_CHOICES.LOW)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES.choices, default=STATUS_CHOICES.PENDING)
    
    confidence = models.FloatField(help_text="ML generated confidence score")
    upvotes = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Report {self.id} (Status: {self.status})"


class Upvote(models.Model):
    """Tracks per-user upvotes to prevent duplicates."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='upvotes',
    )
    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name='upvote_records',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('user', 'report')]

    def __str__(self):
        return f"Upvote by {self.user} on Report {self.report_id}"
