from uuid import uuid4

from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response

from apps.fraud.analyzer import persist_fraud_check
from apps.payouts.models import Payout
from apps.workers.models import WorkerProfile

from .models import Claim
from .serializers import ClaimSerializer


class WorkerClaimsListView(generics.ListAPIView):
    serializer_class = ClaimSerializer

    def get_queryset(self):
        worker = WorkerProfile.objects.get(user=self.request.user)
        return Claim.objects.filter(worker=worker).order_by('-created_at')


class ClaimDetailView(generics.RetrieveAPIView):
    serializer_class = ClaimSerializer
    queryset = Claim.objects.all()


class ClaimEvaluateView(generics.GenericAPIView):
    """
    Re-run fraud check and (optionally) auto-approve & payout.
    """

    def post(self, request, *args, **kwargs):
        claim_id = request.data.get('claim_id')
        if not claim_id:
            return Response({'error': 'claim_id is required'}, status=400)

        claim = Claim.objects.get(id=claim_id)
        fraud_check = persist_fraud_check(claim)

        if fraud_check.decision == 'approve' and claim.claim_status != Claim.Status.APPROVED:
            claim.claim_status = Claim.Status.APPROVED
            claim.save(update_fields=['claim_status'])

            Payout.objects.update_or_create(
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
        elif fraud_check.decision == 'review':
            claim.claim_status = Claim.Status.REVIEW
            claim.save(update_fields=['claim_status'])
        else:
            claim.claim_status = Claim.Status.REJECTED
            claim.save(update_fields=['claim_status'])

        return Response({'claim': ClaimSerializer(claim).data, 'fraud_decision': fraud_check.decision})


class AdminClaimDecisionView(generics.GenericAPIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, *args, **kwargs):
        claim_id = request.data.get('claim_id')
        decision = request.data.get('decision')
        if not claim_id or decision not in {'approve', 'reject', 'review'}:
            return Response({'error': 'claim_id and decision(approve|reject|review) are required'}, status=400)

        claim = Claim.objects.get(id=claim_id)
        mapping = {
            'approve': Claim.Status.APPROVED,
            'reject': Claim.Status.REJECTED,
            'review': Claim.Status.REVIEW,
        }
        claim.claim_status = mapping[decision]
        claim.save(update_fields=['claim_status'])

        # CRITICAL FIX: Create payout for admin-approved claims
        if decision == 'approve':
            try:
                # First check if payout already exists
                existing_payout = Payout.objects.filter(claim=claim).first()
                if existing_payout:
                    print(f"INFO: Payout already exists for claim {claim.id}: {existing_payout.transaction_ref}")
                    payout = existing_payout
                else:
                    # Create new payout
                    payout = Payout.objects.create(
                        claim=claim,
                        worker=claim.worker,
                        payout_channel=claim.worker.payout_method or 'UPI',
                        payout_status=Payout.Status.SUCCESS,
                        transaction_ref=f'ADMIN-{uuid4().hex[:12].upper()}',
                        payout_amount=claim.payout_amount,
                        processed_at=timezone.now(),
                    )
                    print(f"SUCCESS: New payout created for claim {claim.id}: {payout.transaction_ref}")
                    
            except Exception as e:
                print(f"ERROR: Failed to create payout for claim {claim.id}: {str(e)}")
                import traceback
                traceback.print_exc()
                # Continue without payout creation to avoid breaking the flow
                pass

        return Response(ClaimSerializer(claim).data)

from django.shortcuts import render

# Create your views here.
