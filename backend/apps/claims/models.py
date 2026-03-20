from django.db import models

from apps.policies.models import Policy
from apps.triggers.models import TriggerEvent
from apps.workers.models import WorkerProfile


class Claim(models.Model):
    class Status(models.TextChoices):
        CREATED = 'created', 'Created'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        REVIEW = 'review', 'Review'

    worker = models.ForeignKey(WorkerProfile, on_delete=models.CASCADE, related_name='claims')
    policy = models.ForeignKey(Policy, on_delete=models.CASCADE, related_name='claims')
    trigger_event = models.ForeignKey(TriggerEvent, on_delete=models.CASCADE, related_name='claims')
    estimated_lost_hours = models.DecimalField(max_digits=6, decimal_places=2)
    payout_amount = models.DecimalField(max_digits=10, decimal_places=2)
    claim_status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('worker', 'policy', 'trigger_event')
