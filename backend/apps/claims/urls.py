from django.urls import path

from .views import AdminClaimDecisionView, ClaimDetailView, ClaimEvaluateView, WorkerClaimsListView

urlpatterns = [
    path('', WorkerClaimsListView.as_view(), name='worker-claims'),
    path('<int:pk>', ClaimDetailView.as_view(), name='claim-detail'),
    path('evaluate', ClaimEvaluateView.as_view(), name='claim-evaluate'),
    path('decision', AdminClaimDecisionView.as_view(), name='claim-decision'),
]

