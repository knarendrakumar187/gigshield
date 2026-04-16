from django.db import models


class WeeklyPolicy(models.Model):
    class Tier(models.TextChoices):
        BASIC = "BASIC", "Basic"
        STANDARD = "STANDARD", "Standard"
        PREMIUM = "PREMIUM", "Premium"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"

    worker = models.ForeignKey("workers.User", on_delete=models.CASCADE, related_name="weekly_policies")
    week_start = models.DateField()
    week_end = models.DateField()
    premium_paid = models.DecimalField(max_digits=10, decimal_places=2)
    coverage_amount = models.DecimalField(max_digits=10, decimal_places=2)
    tier = models.CharField(max_length=10, choices=Tier.choices)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)
    exclusions_acknowledged = models.BooleanField(default=False)
    exclusions_version = models.CharField(max_length=10, default="v1.0")
    created_at = models.DateTimeField(auto_now_add=True)
    auto_renew = models.BooleanField(default=True)
    cancellation_reason = models.CharField(max_length=255, null=True, blank=True)
    expected_loss_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    zone_risk_multiplier = models.FloatField(null=True, blank=True)
    premium_breakdown = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-week_start"]
        indexes = [
            models.Index(fields=["worker", "status", "week_start", "week_end"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["worker", "week_start"],
                condition=models.Q(status="ACTIVE"),
                name="weeklypolicy_worker_week_active_uniq",
            ),
        ]

    def __str__(self):
        return f"{self.worker_id} {self.week_start}"


class ExclusionAcknowledgment(models.Model):
    worker = models.ForeignKey("workers.User", on_delete=models.CASCADE, related_name="exclusion_acks")
    policy = models.ForeignKey(WeeklyPolicy, on_delete=models.CASCADE, related_name="acknowledgments")
    exclusions_version = models.CharField(max_length=10, default="v1.0")
    acknowledged_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_fingerprint = models.CharField(max_length=64, blank=True, default="")


class ActuarialReserve(models.Model):
    week_start = models.DateField(unique=True)
    total_premiums_collected = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_claims_paid = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_claims_pending = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    loss_ratio = models.FloatField(default=0)
    expense_ratio = models.FloatField(default=0.20)
    combined_ratio = models.FloatField(default=0)
    reserve_held = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    solvency_margin = models.FloatField(default=0)
    computed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-week_start"]
