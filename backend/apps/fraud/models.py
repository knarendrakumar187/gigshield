from django.db import models

from apps.claims.models import Claim


class FraudCheck(models.Model):
    class Decision(models.TextChoices):
        APPROVE = 'approve', 'Approve'
        REVIEW = 'review', 'Review'
        REJECT = 'reject', 'Reject'

    claim = models.OneToOneField(Claim, on_delete=models.CASCADE, related_name='fraud_check')
    gps_match_score = models.FloatField(default=1.0)
    duplicate_flag = models.BooleanField(default=False)
    fraud_flag = models.BooleanField(default=False)
    activity_match_score = models.FloatField(default=1.0)
    anomaly_score = models.FloatField(default=0.0)
    fraud_score = models.IntegerField(default=0)
    decision = models.CharField(max_length=10, choices=Decision.choices, default=Decision.APPROVE)
    reason = models.CharField(max_length=255, blank=True, null=True)
    checked_at = models.DateTimeField(auto_now_add=True)
