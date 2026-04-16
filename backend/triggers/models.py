from django.db import models


class City(models.Model):
    name = models.CharField(max_length=100, unique=True)
    lat = models.FloatField()
    lon = models.FloatField()
    monitoring_active = models.BooleanField(default=True)
    default_zone = models.CharField(max_length=100, blank=True, default="", help_text="Fallback zone label for city-wide triggers")

    class Meta:
        verbose_name_plural = "cities"

    def __str__(self):
        return self.name


class GovernmentAlert(models.Model):
    class AlertType(models.TextChoices):
        EPIDEMIC = "EPIDEMIC", "Epidemic"
        LOCKDOWN = "LOCKDOWN", "Lockdown"
        DISASTER_ACT = "DISASTER_ACT", "Disaster Act"

    city = models.CharField(max_length=100)
    alert_type = models.CharField(max_length=20, choices=AlertType.choices)
    is_active = models.BooleanField(default=True)
    declared_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, default="")

    def __str__(self):
        return f"{self.city} {self.alert_type}"


class MunicipalAlert(models.Model):
    city = models.CharField(max_length=100)
    zone = models.CharField(max_length=100, blank=True, default="")
    alert_type = models.CharField(max_length=20, default="FLOOD")
    is_active = models.BooleanField(default=True)
    severity = models.IntegerField(default=2)

    def __str__(self):
        return f"{self.city}/{self.zone} {self.alert_type}"


class DisruptionTrigger(models.Model):
    class TriggerType(models.TextChoices):
        ALL = "ALL", "All"
        RAIN = "RAIN", "Rain"
        HEAT = "HEAT", "Heat"
        AQI = "AQI", "AQI"
        FLOOD = "FLOOD", "Flood"
        ZONE_CLOSURE = "ZONE_CLOSURE", "Zone Closure"
        CURFEW = "CURFEW", "Curfew"

    trigger_type = models.CharField(max_length=20, choices=TriggerType.choices)
    city = models.CharField(max_length=100)
    zone = models.CharField(max_length=100)
    severity = models.IntegerField(default=1)
    threshold_value = models.FloatField(default=0)
    actual_value = models.FloatField(default=0)
    triggered_at = models.DateTimeField()
    duration_hours = models.FloatField(default=1)
    source = models.CharField(max_length=40, default="open_meteo")
    is_active = models.BooleanField(default=True)
    affected_workers_count = models.IntegerField(default=0)
    total_payout_triggered = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    is_excluded_event = models.BooleanField(default=False)
    exclusion_reason = models.CharField(max_length=255, blank=True, null=True)
    announcement_at = models.DateTimeField(null=True, blank=True, help_text="For EX-06: before policy purchase if announced early")
    affected_lat = models.FloatField(null=True)    # Epicenter of the disruption
    affected_lon = models.FloatField(null=True)
    radius_km = models.FloatField(default=5.0)     # Affected radius (default 5km = zone-level)
    affected_cell_ids = models.JSONField(default=list)  # Grid cells hit by this trigger

    class Meta:
        ordering = ["-triggered_at"]

    def __str__(self):
        return f"{self.trigger_type} {self.city} {self.zone}"
