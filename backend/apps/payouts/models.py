from django.db import models

from apps.claims.models import Claim
from apps.workers.models import WorkerProfile


class Payout(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'

    claim = models.OneToOneField(Claim, on_delete=models.CASCADE, related_name='payout')
    worker = models.ForeignKey(WorkerProfile, on_delete=models.CASCADE, related_name='payouts')
    payout_channel = models.CharField(max_length=30, default='UPI')
    payout_status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    transaction_ref = models.CharField(max_length=120, blank=True, default='')
    payout_amount = models.DecimalField(max_digits=10, decimal_places=2)
    processed_at = models.DateTimeField(null=True, blank=True)
