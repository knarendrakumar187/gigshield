from django.db import models


class TriggerEvent(models.Model):
    class TriggerType(models.TextChoices):
        HEAVY_RAIN = 'heavy_rain', 'Heavy Rain'
        FLOOD_ALERT = 'flood_alert', 'Flood Alert'
        EXTREME_HEAT = 'extreme_heat', 'Extreme Heat'
        SEVERE_AQI = 'severe_aqi', 'Severe AQI'
        ZONE_CLOSURE = 'zone_closure', 'Zone Closure'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        CLOSED = 'closed', 'Closed'

    trigger_type = models.CharField(max_length=30, choices=TriggerType.choices)
    city = models.CharField(max_length=80)
    zone = models.CharField(max_length=120)
    source_type = models.CharField(max_length=50, default='mock')
    source_value = models.JSONField(default=dict)
    threshold_value = models.JSONField(default=dict)
    event_start = models.DateTimeField()
    event_end = models.DateTimeField()
    severity = models.IntegerField(default=1)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)


class ZoneRiskScore(models.Model):
    city = models.CharField(max_length=80)
    zone = models.CharField(max_length=120)
    rain_risk_score = models.FloatField(default=0.0)
    heat_risk_score = models.FloatField(default=0.0)
    aqi_risk_score = models.FloatField(default=0.0)
    flood_risk_score = models.FloatField(default=0.0)
    closure_risk_score = models.FloatField(default=0.0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('city', 'zone')


class CrowdsourcedReport(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        VERIFIED = 'verified', 'Verified'
        REJECTED = 'rejected', 'Rejected'

    worker = models.ForeignKey('workers.WorkerProfile', on_delete=models.CASCADE, related_name='reports')
    trigger_type = models.CharField(max_length=30, choices=TriggerEvent.TriggerType.choices)
    city = models.CharField(max_length=80)
    zone = models.CharField(max_length=120)
    message = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    confidence_score = models.FloatField(default=0.0)
    reported_at = models.DateTimeField(auto_now_add=True)
    trigger_event = models.ForeignKey(TriggerEvent, on_delete=models.SET_NULL, null=True, blank=True, related_name='evidence_reports')

    def __str__(self):
        return f"{self.worker.user.username} - {self.trigger_type} ({self.zone})"

