from django.urls import path

from .views import WorkerProfileUpsertView

urlpatterns = [
    path('profile', WorkerProfileUpsertView.as_view(), name='worker-profile'),
]

