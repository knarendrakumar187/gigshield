from rest_framework import serializers

from .models import Claim


class ClaimSerializer(serializers.ModelSerializer):
    trigger_type = serializers.CharField(source='trigger_event.trigger_type', read_only=True)
    city = serializers.CharField(source='trigger_event.city', read_only=True)
    zone = serializers.CharField(source='trigger_event.zone', read_only=True)

    class Meta:
        model = Claim
        fields = (
            'id',
            'policy_id',
            'trigger_event_id',
            'trigger_type',
            'city',
            'zone',
            'estimated_lost_hours',
            'payout_amount',
            'claim_status',
            'created_at',
        )

