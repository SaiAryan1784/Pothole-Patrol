from django.db import models
from django.conf import settings

class Badge(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon_url = models.URLField(max_length=500, blank=True)
    required_points = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.name

class UserScore(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='score_profile'
    )
    total_points = models.PositiveIntegerField(default=0)
    badges = models.ManyToManyField(Badge, blank=True)
    
    def __str__(self):
        return f"{self.user} - {self.total_points} pts"
