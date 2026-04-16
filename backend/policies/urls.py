from django.urls import path

from policies.views import (
    ActivePolicyView,
    CancelPolicyView,
    ExclusionsDocView,
    PolicyCertificatePDFView,
    PolicyDetailView,
    PolicyListView,
    PremiumPreviewView,
    PurchaseView,
)

urlpatterns = [
    path("preview/", PremiumPreviewView.as_view(), name="premium-preview"),
    path("", PolicyListView.as_view(), name="policies"),
    path("purchase/", PurchaseView.as_view(), name="purchase"),
    path("active/", ActivePolicyView.as_view(), name="active-policy"),
    path("<int:pk>/", PolicyDetailView.as_view(), name="policy-detail"),
    path("<int:pk>/cancel/", CancelPolicyView.as_view(), name="policy-cancel"),
    path("<int:pk>/certificate/", PolicyCertificatePDFView.as_view(), name="policy-certificate"),
    path("exclusions-doc/", ExclusionsDocView.as_view(), name="exclusions-doc"),
]
