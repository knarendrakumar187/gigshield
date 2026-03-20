from django.db import models
from django.utils import timezone

from apps.workers.models import WorkerProfile


class Policy(models.Model):
    class CoverageTier(models.TextChoices):
        BASIC = 'basic', 'Basic'
        STANDARD = 'standard', 'Standard'
        PLUS = 'plus', 'Plus'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        EXPIRED = 'expired', 'Expired'
        CANCELLED = 'cancelled', 'Cancelled'

    worker = models.ForeignKey(WorkerProfile, on_delete=models.CASCADE, related_name='policies')
    coverage_tier = models.CharField(max_length=20, choices=CoverageTier.choices)
    weekly_premium = models.DecimalField(max_digits=8, decimal_places=2)
    max_covered_hours = models.PositiveIntegerField()
    coverage_ratio = models.DecimalField(max_digits=5, decimal_places=2)  # e.g. 0.80
    active_from = models.DateTimeField()
    active_to = models.DateTimeField()
    policy_status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_active_at(self, ts=None) -> bool:
        ts = ts or timezone.now()
        return self.policy_status == self.Status.ACTIVE and self.active_from <= ts <= self.active_to


class PremiumHistory(models.Model):
    worker = models.ForeignKey(WorkerProfile, on_delete=models.CASCADE, related_name='premium_history')
    week_start = models.DateField()
    premium_amount = models.DecimalField(max_digits=8, decimal_places=2)
    risk_score = models.FloatField()
    pricing_factors_json = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
