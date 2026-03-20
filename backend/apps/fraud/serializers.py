from rest_framework import serializers

from .models import FraudCheck


class FraudCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = FraudCheck
        fields = (
            'id',
            'claim_id',
            'gps_match_score',
            'duplicate_flag',
            'activity_match_score',
            'anomaly_score',
            'fraud_score',
            'decision',
            'checked_at',
        )

