from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from claims.models import Claim, FraudLog
from claims.serializers import ClaimSerializer, FraudLogSerializer


class ClaimListView(generics.ListAPIView):
    serializer_class = ClaimSerializer

    def get_queryset(self):
        return Claim.objects.filter(worker=self.request.user).select_related("trigger", "policy")


class ClaimDetailView(generics.RetrieveAPIView):
    serializer_class = ClaimSerializer

    def get_queryset(self):
        return Claim.objects.filter(worker=self.request.user)


class ClaimAuditTrailView(generics.ListAPIView):
    serializer_class = FraudLogSerializer

    def get_queryset(self):
        cid = self.kwargs["pk"]
        return FraudLog.objects.filter(claim_id=cid, claim__worker=self.request.user)


class ClaimAppealView(APIView):
    def post(self, request, pk):
        claim = get_object_or_404(Claim, pk=pk, worker=request.user)
        if not claim.appeal_allowed or claim.status != "REJECTED":
            return Response({"error": "Appeal not allowed"}, status=status.HTTP_400_BAD_REQUEST)
        if claim.appeal_submitted_at:
            return Response({"error": "Already appealed"}, status=status.HTTP_400_BAD_REQUEST)
        from django.utils import timezone

        claim.appeal_submitted_at = timezone.now()
        claim.appeal_allowed = False
        claim.status = Claim.Status.MANUAL_REVIEW
        claim.save(update_fields=["appeal_submitted_at", "appeal_allowed", "status"])
        return Response(ClaimSerializer(claim).data)
