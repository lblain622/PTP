from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    hometown = models.CharField(max_length=150, blank=True)


class SocialIdentity(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    provider = models.CharField(max_length=10)
    subject = models.CharField(max_length=255)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['provider', 'subject'], name='unique_social_identity')]


class SocialAttempt(models.Model):
    state = models.CharField(max_length=100, unique=True)
    secret_hash = models.CharField(max_length=64, unique=True)
    nonce = models.CharField(max_length=100)
    provider = models.CharField(max_length=10)
    expires_at = models.DateTimeField()
    claimed = models.BooleanField(default=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.CASCADE)
    error = models.CharField(max_length=255, blank=True)
