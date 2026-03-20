from django.urls import path

from .views import PayoutProcessView, WorkerPayoutHistoryView

urlpatterns = [
    path('process', PayoutProcessView.as_view(), name='payout-process'),
    path('history', WorkerPayoutHistoryView.as_view(), name='payout-history'),
]

