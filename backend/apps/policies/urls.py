from django.urls import path

from .views import ActivePolicyView, PolicyCreateView, PolicyHistoryView, PolicyQuoteView

urlpatterns = [
    path('quote', PolicyQuoteView.as_view(), name='policy-quote'),
    path('create', PolicyCreateView.as_view(), name='policy-create'),
    path('active', ActivePolicyView.as_view(), name='policy-active'),
    path('history', PolicyHistoryView.as_view(), name='policy-history'),
]

