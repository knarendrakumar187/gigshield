from rest_framework import serializers

from claims.models import Claim, FraudLog
from payouts.serializers import PayoutSerializer
from workers.serializers import UserSerializer


class FraudLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FraudLog
        fields = "__all__"


class ClaimSerializer(serializers.ModelSerializer):
    # Helps the worker UI render claim progress + payout timeline.
    worker = UserSerializer(read_only=True)
    payout = PayoutSerializer(read_only=True)

    class Meta:
        model = Claim
        fields = "__all__"
