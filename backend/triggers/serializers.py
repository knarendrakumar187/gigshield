from rest_framework import serializers

from triggers.models import DisruptionTrigger


class DisruptionTriggerSerializer(serializers.ModelSerializer):
    class Meta:
        model = DisruptionTrigger
        fields = "__all__"


class SimulateTriggerSerializer(serializers.Serializer):
    trigger_type = serializers.ChoiceField(choices=[x[0] for x in DisruptionTrigger.TriggerType.choices])
    city = serializers.CharField()
    zone = serializers.CharField()
    severity = serializers.IntegerField(min_value=1, max_value=5, default=3)
    duration_hours = serializers.FloatField(default=4)
    actual_value = serializers.FloatField(default=100)
    threshold_value = serializers.FloatField(default=50)
    source = serializers.CharField(default="MANUAL")
    affected_lat = serializers.FloatField(required=False, allow_null=True)
    affected_lon = serializers.FloatField(required=False, allow_null=True)
    radius_km = serializers.FloatField(required=False, allow_null=True)
