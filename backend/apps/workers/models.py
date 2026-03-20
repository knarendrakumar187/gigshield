from django.conf import settings
from django.db import models


class WorkerProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='worker_profile')
    platform_name = models.CharField(max_length=80)
    city = models.CharField(max_length=80)
    primary_zone = models.CharField(max_length=120)
    secondary_zone = models.CharField(max_length=120, blank=True, default='')
    avg_weekly_income = models.PositiveIntegerField()
    avg_weekly_hours = models.PositiveIntegerField()
    preferred_work_start = models.TimeField()
    preferred_work_end = models.TimeField()
    payout_method = models.CharField(max_length=80, default='UPI')
    device_id = models.CharField(max_length=120, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def hourly_earnings(self) -> float:
        if not self.avg_weekly_hours:
            return 0.0
        return float(self.avg_weekly_income) / float(self.avg_weekly_hours)

    def __str__(self) -> str:  # pragma: no cover
        return f'{self.user.username} - {self.city}/{self.primary_zone}'


class ActivityLog(models.Model):
    worker = models.ForeignKey(WorkerProfile, on_delete=models.CASCADE, related_name='activity_logs')
    timestamp = models.DateTimeField()
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    zone = models.CharField(max_length=120)
    status_active = models.BooleanField(default=True)
    order_count = models.PositiveIntegerField(default=0)
