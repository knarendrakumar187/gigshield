from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response

from apps.workers.models import WorkerProfile

from .models import Policy
from .pricing import TIERS, calculate_weekly_premium
from .serializers import PolicyCreateSerializer, PolicySerializer


INCLUDED_TRIGGERS = [
    'heavy_rain',
    'flood_alert',
    'extreme_heat',
    'severe_aqi',
    'zone_closure',
]


class PolicyQuoteView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        worker = WorkerProfile.objects.get(user=request.user)
        suspicious_history = worker.claims.filter(claim_status__in=['rejected', 'review']).exists()

        tiers = []
        scored = []
        for tier_key, cfg in TIERS.items():
            premium, risk_score, factors = calculate_weekly_premium(worker, tier=tier_key, suspicious_history=suspicious_history)
            tiers.append(
                {
                    'tier': tier_key,
                    'weekly_premium': premium,
                    'max_covered_hours': cfg.max_covered_hours,
                    'coverage_ratio': cfg.coverage_ratio,
                    'included_triggers': INCLUDED_TRIGGERS,
                    'risk_score': risk_score,
                    'pricing_factors': factors,
                }
            )
            scored.append((tier_key, premium, risk_score))

        # Simple recommendation heuristic for demo.
        # - Default to standard
        # - Upgrade to plus if risk is high or income exposure is high
        # - Downgrade to basic if very low exposure and low risk
        base_risk = next((r for t, _, r in scored if t == 'standard'), 0.4)
        if worker.avg_weekly_income >= 7000 or base_risk >= 0.65:
            recommended = 'plus'
        elif worker.avg_weekly_income <= 4000 and base_risk <= 0.35:
            recommended = 'basic'
        else:
            recommended = 'standard'

        return Response({'recommended_tier': recommended, 'tiers': tiers})


class PolicyCreateView(generics.CreateAPIView):
    serializer_class = PolicyCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        policy = serializer.save()
        return Response(PolicySerializer(policy).data)


class ActivePolicyView(generics.GenericAPIView):
    def get(self, request, *args, **kwargs):
        worker = WorkerProfile.objects.get(user=request.user)
        now = timezone.now()
        policy = (
            Policy.objects.filter(worker=worker, policy_status=Policy.Status.ACTIVE, active_from__lte=now, active_to__gte=now)
            .order_by('-active_from')
            .first()
        )
        return Response(PolicySerializer(policy).data if policy else None)


class PolicyHistoryView(generics.ListAPIView):
    serializer_class = PolicySerializer

    def get_queryset(self):
        worker = WorkerProfile.objects.get(user=self.request.user)
        return Policy.objects.filter(worker=worker).order_by('-created_at')

from django.shortcuts import render

# Create your views here.
