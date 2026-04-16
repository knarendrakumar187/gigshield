from django.db import models


class Claim(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        MANUAL_REVIEW = "MANUAL_REVIEW", "Manual Review"

    worker = models.ForeignKey("workers.User", on_delete=models.CASCADE, related_name="claims")
    policy = models.ForeignKey("policies.WeeklyPolicy", on_delete=models.CASCADE, related_name="claims")
    trigger = models.ForeignKey("triggers.DisruptionTrigger", on_delete=models.CASCADE, related_name="claims")
    claimed_amount = models.DecimalField(max_digits=10, decimal_places=2)
    approved_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fraud_score = models.FloatField(default=0)
    fraud_flags = models.JSONField(default=list, blank=True)
    fraud_model_version = models.CharField(max_length=20, blank=True, default="")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    auto_processed = models.BooleanField(default=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    payout_ref = models.CharField(max_length=50, null=True, blank=True)
    exclusion_check_passed = models.BooleanField(default=True)
    exclusion_reason = models.CharField(max_length=255, null=True, blank=True)
    exclusion_id = models.CharField(max_length=20, null=True, blank=True)
    appeal_allowed = models.BooleanField(default=True)
    appeal_submitted_at = models.DateTimeField(null=True, blank=True)
    appeal_resolution = models.CharField(max_length=255, null=True, blank=True)
    payout_calculation = models.JSONField(default=dict, blank=True)
    related_trigger_ids = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class FraudLog(models.Model):
    class CheckType(models.TextChoices):
        GPS = "GPS", "GPS"
        BEHAVIORAL = "BEHAVIORAL", "Behavioral"
        TEMPORAL = "TEMPORAL", "Temporal"
        DUPLICATE = "DUPLICATE", "Duplicate"
        CLUSTER = "CLUSTER", "Cluster"
        EARNINGS_INFLATION = "EARNINGS_INFLATION", "Earnings Inflation"

    class Result(models.TextChoices):
        PASS = "PASS", "Pass"
        FAIL = "FAIL", "Fail"
        WARNING = "WARNING", "Warning"

    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name="fraud_logs")
    check_type = models.CharField(max_length=30, choices=CheckType.choices)
    result = models.CharField(max_length=10, choices=Result.choices)
    confidence = models.FloatField(default=0.5)
    details = models.JSONField(default=dict, blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)
    model_version = models.CharField(max_length=20, blank=True, default="")
