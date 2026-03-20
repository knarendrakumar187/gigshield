from rest_framework import serializers

from .models import Payout


class PayoutSerializer(serializers.ModelSerializer):
    trigger_type = serializers.CharField(source='claim.trigger_event.trigger_type', read_only=True)
    lost_hours = serializers.FloatField(source='claim.estimated_lost_hours', read_only=True)
    
    class Meta:
        model = Payout
        fields = (
            'id',
            'claim_id',
            'worker_id',
            'payout_channel',
            'payout_status',
            'transaction_ref',
            'payout_amount',
            'processed_at',
            'trigger_type',
            'lost_hours',
        )

