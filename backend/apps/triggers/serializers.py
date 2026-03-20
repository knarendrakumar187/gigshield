from rest_framework import serializers

from .models import TriggerEvent, ZoneRiskScore


class TriggerEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = TriggerEvent
        fields = (
            'id',
            'trigger_type',
            'city',
            'zone',
            'source_type',
            'source_value',
            'threshold_value',
            'event_start',
            'event_end',
            'severity',
            'status',
            'created_at',
        )


class ZoneRiskScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZoneRiskScore
        fields = (
            'id',
            'city',
            'zone',
            'rain_risk_score',
            'heat_risk_score',
            'aqi_risk_score',
            'flood_risk_score',
            'closure_risk_score',
            'updated_at',
        )

