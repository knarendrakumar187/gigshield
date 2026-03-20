from uuid import uuid4

from django.utils import timezone
from rest_framework import generics
from rest_framework.response import Response

from apps.claims.models import Claim
from apps.workers.models import WorkerProfile

from .models import Payout
from .serializers import PayoutSerializer


class PayoutProcessView(generics.GenericAPIView):
    def post(self, request, *args, **kwargs):
        claim_id = request.data.get('claim_id')
        if not claim_id:
            return Response({'error': 'claim_id is required'}, status=400)

        claim = Claim.objects.get(id=claim_id)
        payout, _ = Payout.objects.update_or_create(
            claim=claim,
            defaults={
                'worker': claim.worker,
                'payout_channel': claim.worker.payout_method or 'UPI',
                'payout_status': Payout.Status.SUCCESS,
                'transaction_ref': f'MOCK-{uuid4().hex[:12].upper()}',
                'payout_amount': claim.payout_amount,
                'processed_at': timezone.now(),
            },
        )
        return Response(PayoutSerializer(payout).data)


class WorkerPayoutHistoryView(generics.ListAPIView):
    serializer_class = PayoutSerializer

    def get_queryset(self):
        worker = WorkerProfile.objects.get(user=self.request.user)
        return Payout.objects.filter(worker=worker).order_by('-processed_at')

from django.shortcuts import render

# Create your views here.
