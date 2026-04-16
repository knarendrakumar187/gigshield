from django.urls import path

from claims.exclusion_views import ExclusionCheckView, ExclusionsListView

urlpatterns = [
    path("", ExclusionsListView.as_view()),
    path("check/", ExclusionCheckView.as_view()),
]
