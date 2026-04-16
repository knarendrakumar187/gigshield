from django.http import FileResponse, Http404
from rest_framework import generics

from payouts.models import Payout
from payouts.serializers import PayoutSerializer


class PayoutListView(generics.ListAPIView):
    serializer_class = PayoutSerializer

    def get_queryset(self):
        return Payout.objects.filter(claim__worker=self.request.user).select_related("claim")


class PayoutDetailView(generics.RetrieveAPIView):
    serializer_class = PayoutSerializer

    def get_queryset(self):
        return Payout.objects.filter(claim__worker=self.request.user)


def receipt_pdf_view(request, pk):
    from django.conf import settings

    payout = Payout.objects.filter(pk=pk).first()
    if not payout or not payout.receipt_url:
        raise Http404("Receipt not available")
    path = settings.MEDIA_ROOT / "receipts" / f"{payout.transaction_ref}.pdf"
    if not path.exists():
        raise Http404("PDF file not found on disk")
    return FileResponse(open(path, "rb"), content_type="application/pdf", filename=f"{payout.transaction_ref}.pdf")
