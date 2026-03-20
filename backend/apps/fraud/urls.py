from django.urls import path

from .views import FraudAnalyzeView, FraudByClaimView

urlpatterns = [
    path('analyze', FraudAnalyzeView.as_view(), name='fraud-analyze'),
    path('claim/<int:claim_id>', FraudByClaimView.as_view(), name='fraud-by-claim'),
]

