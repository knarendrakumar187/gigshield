from rest_framework import serializers

from policies.models import ExclusionAcknowledgment, WeeklyPolicy


class WeeklyPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyPolicy
        fields = "__all__"
        read_only_fields = ("worker", "created_at", "premium_breakdown")


class PurchaseSerializer(serializers.Serializer):
    tier = serializers.ChoiceField(choices=["basic", "standard", "premium", "BASIC", "STANDARD", "PREMIUM"])
    week_start = serializers.DateField(required=False)
    exclusions_acknowledged = serializers.BooleanField()
    exclusions_version = serializers.CharField(default="v1.0")
    ip_address = serializers.IPAddressField(required=False, allow_null=True)
    device_fingerprint = serializers.CharField(required=False, allow_blank=True, default="")
    upi_id = serializers.CharField(required=False, allow_blank=True, max_length=50, default="")


class ExclusionAckSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExclusionAcknowledgment
        fields = "__all__"
        read_only_fields = ("acknowledged_at",)
