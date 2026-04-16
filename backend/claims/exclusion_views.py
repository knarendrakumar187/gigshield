from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from types import SimpleNamespace

from django.utils import timezone

from claims.exclusions import STANDARD_EXCLUSIONS_V1, ExclusionEngine
from triggers.models import DisruptionTrigger


class ExclusionsListView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        return Response(STANDARD_EXCLUSIONS_V1)


class ExclusionCheckView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        tt = request.query_params.get("trigger_type", "RAIN")
        city = request.query_params.get("city", "Mumbai")
        zone = request.query_params.get("zone", "")
        tr = DisruptionTrigger(
            trigger_type=tt if tt in [c[0] for c in DisruptionTrigger.TriggerType.choices] else "RAIN",
            city=city,
            zone=zone or city,
            severity=3,
            threshold_value=50,
            actual_value=60,
            triggered_at=None,
        )
        if tr.triggered_at is None:
            tr.triggered_at = timezone.now()
        pol = SimpleNamespace(created_at=timezone.now())
        eng = ExclusionEngine()
        r = eng.check_claim(None, tr, pol)
        return Response({"trigger_type": tt, "zone": zone, "result": r})
