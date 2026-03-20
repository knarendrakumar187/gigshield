from rest_framework import generics
from rest_framework.response import Response

from apps.claims.models import Claim

from .analyzer import persist_fraud_check
from .models import FraudCheck
from .serializers import FraudCheckSerializer


class FraudAnalyzeView(generics.GenericAPIView):
    def post(self, request, *args, **kwargs):
        claim_id = request.data.get('claim_id')
        if not claim_id:
            return Response({'error': 'claim_id is required'}, status=400)
        claim = Claim.objects.get(id=claim_id)
        check = persist_fraud_check(claim)
        return Response(FraudCheckSerializer(check).data)


class FraudByClaimView(generics.RetrieveAPIView):
    serializer_class = FraudCheckSerializer

    def get_object(self):
        claim_id = self.kwargs['claim_id']
        return FraudCheck.objects.get(claim_id=claim_id)

from django.shortcuts import render

# Create your views here.
