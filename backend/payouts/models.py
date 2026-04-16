from django.db import models


class Payout(models.Model):
    class Method(models.TextChoices):
        UPI = "UPI", "UPI"
        WALLET = "WALLET", "Wallet"
        BANK = "BANK", "Bank"

    class Status(models.TextChoices):
        INITIATED = "INITIATED", "Initiated"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"

    claim = models.OneToOneField("claims.Claim", on_delete=models.CASCADE, related_name="payout")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=10, choices=Method.choices, default=Method.UPI)
    upi_id = models.CharField(max_length=50)
    transaction_ref = models.CharField(max_length=50)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.INITIATED)
    initiated_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.CharField(max_length=255, null=True, blank=True)
    receipt_url = models.CharField(max_length=500, blank=True, default="")
