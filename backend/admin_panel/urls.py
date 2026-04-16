from django.urls import path

from admin_panel.views import (
    AdminActuarialView,
    AdminAdequacyView,
    AdminClaimReviewView,
    AdminDashboardView,
    AdminFraudAlertsView,
    AdminManualReviewQueueView,
    AdminTriggerCreateView,
    AdminWorkersView,
    AdminWorkerBehaviorView,
    FraudHeatmapView,
)

urlpatterns = [
    path("dashboard/", AdminDashboardView.as_view()),
    path("workers/", AdminWorkersView.as_view()),
    path("fraud-alerts/", AdminFraudAlertsView.as_view()),
    path("triggers/create/", AdminTriggerCreateView.as_view()),
    path("claims/<int:pk>/review/", AdminClaimReviewView.as_view()),
    path("actuarial/", AdminActuarialView.as_view()),
    path("actuarial/adequacy/", AdminAdequacyView.as_view()),
    path("claims/manual-review/", AdminManualReviewQueueView.as_view()),
    path("fraud-heatmap/", FraudHeatmapView.as_view()),
    path("workers/<int:pk>/behavior/", AdminWorkerBehaviorView.as_view()),
]
