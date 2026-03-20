from django.urls import path

from .views import AdminMetricsView, WorkerDashboardView

urlpatterns = [
    path('worker', WorkerDashboardView.as_view(), name='worker-dashboard'),
    path('admin/metrics', AdminMetricsView.as_view(), name='admin-metrics'),
]

