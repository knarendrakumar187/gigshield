from django.urls import path

from payouts.views import PayoutDetailView, PayoutListView, receipt_pdf_view

urlpatterns = [
    path("", PayoutListView.as_view()),
    path("<int:pk>/", PayoutDetailView.as_view()),
    path("<int:pk>/receipt.pdf", receipt_pdf_view),
]
