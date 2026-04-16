from django.urls import path

from claims.views import ClaimAppealView, ClaimAuditTrailView, ClaimDetailView, ClaimListView

urlpatterns = [
    path("", ClaimListView.as_view()),
    path("<int:pk>/", ClaimDetailView.as_view()),
    path("<int:pk>/appeal/", ClaimAppealView.as_view()),
    path("<int:pk>/audit-trail/", ClaimAuditTrailView.as_view()),
]
