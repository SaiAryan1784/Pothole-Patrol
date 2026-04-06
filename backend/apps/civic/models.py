from django.contrib.gis.db import models

class CivicBody(models.Model):
    name = models.CharField(max_length=200, help_text="e.g. GDA, MCD, NMMC")
    region_boundary = models.PolygonField(
        geography=True,
        spatial_index=True,
        null=True,
        blank=True,
        help_text="Spatial boundary of the civic body's jurisdiction"
    )
    contact_email = models.EmailField()
    webhook_url = models.URLField(max_length=500, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name_plural = "Civic Bodies"
        
    def __str__(self):
        return self.name
