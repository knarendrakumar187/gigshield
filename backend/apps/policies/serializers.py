from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from apps.workers.models import WorkerProfile

from .models import Policy, PremiumHistory
from .pricing import TIERS, calculate_weekly_premium


class PolicyQuoteRequestSerializer(serializers.Serializer):
    tier = serializers.ChoiceField(choices=[(k, k) for k in TIERS.keys()], required=False)


class PolicyQuoteTierSerializer(serializers.Serializer):
    tier = serializers.CharField()
    weekly_premium = serializers.FloatField()
    max_covered_hours = serializers.IntegerField()
    coverage_ratio = serializers.FloatField()
    included_triggers = serializers.ListField(child=serializers.CharField())
    risk_score = serializers.FloatField()
    pricing_factors = serializers.DictField()


class PolicyQuoteResponseSerializer(serializers.Serializer):
    recommended_tier = serializers.CharField()
    tiers = PolicyQuoteTierSerializer(many=True)


class PolicyCreateSerializer(serializers.Serializer):
    tier = serializers.ChoiceField(choices=[(k, k) for k in TIERS.keys()])

    def create(self, validated_data):
        request = self.context['request']
        worker = WorkerProfile.objects.get(user=request.user)
        tier = validated_data['tier']

        suspicious_history = worker.claims.filter(claim_status__in=['rejected', 'review']).exists()
        premium, risk_score, factors = calculate_weekly_premium(worker, tier=tier, suspicious_history=suspicious_history)
        cfg = TIERS[tier]

        now = timezone.now()
        policy = Policy.objects.create(
            worker=worker,
            coverage_tier=tier,
            weekly_premium=premium,
            max_covered_hours=cfg.max_covered_hours,
            coverage_ratio=cfg.coverage_ratio,
            active_from=now,
            active_to=now + timedelta(days=7),
            policy_status=Policy.Status.ACTIVE,
        )

        PremiumHistory.objects.create(
            worker=worker,
            week_start=now.date(),
            premium_amount=premium,
            risk_score=risk_score,
            pricing_factors_json=factors,
        )

        return policy


class PolicySerializer(serializers.ModelSerializer):
    tier = serializers.CharField(source='coverage_tier', read_only=True)
    status = serializers.CharField(source='policy_status', read_only=True)
    total_payouts = serializers.SerializerMethodField()
    claims_count = serializers.SerializerMethodField()

    class Meta:
        model = Policy
        fields = (
            'id',
            'tier',
            'weekly_premium',
            'max_covered_hours',
            'coverage_ratio',
            'active_from',
            'active_to',
            'status',
            'total_payouts',
            'claims_count',
            'created_at',
        )

    def to_representation(self, instance):
        """Override to ensure proper decimal formatting"""
        data = super().to_representation(instance)
        # Ensure numeric fields are properly formatted
        if 'weekly_premium' in data:
            data['weekly_premium'] = float(data['weekly_premium'])
        if 'coverage_ratio' in data:
            data['coverage_ratio'] = float(data['coverage_ratio'])
        if 'total_payouts' in data:
            data['total_payouts'] = float(data['total_payouts'])
        return data

    def get_total_payouts(self, obj):
        """Calculate total payouts for this policy"""
        from apps.claims.models import Claim
        from apps.payouts.models import Payout
        
        try:
            # Get all claims for this policy period
            claims = Claim.objects.filter(
                worker=obj.worker,
                created_at__gte=obj.active_from,
                created_at__lte=obj.active_to
            )
            
            # Sum up all successful payouts for these claims
            total = 0
            for claim in claims:
                payouts = Payout.objects.filter(claim=claim, status='success')
                total += sum(float(p.amount) for p in payouts)
            
            return float(total)
        except Exception:
            return 0.0

    def get_claims_count(self, obj):
        """Get number of claims for this policy period"""
        from apps.claims.models import Claim
        
        try:
            return Claim.objects.filter(
                worker=obj.worker,
                created_at__gte=obj.active_from,
                created_at__lte=obj.active_to
            ).count()
        except Exception:
            return 0

