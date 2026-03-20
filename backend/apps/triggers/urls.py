from django.urls import path

from .views import EvaluateTriggersView, FetchLiveDataView, LiveTriggersView, MockTriggerCreateView, PollLiveTriggersView, TriggerLocationsView

urlpatterns = [
    path('live', LiveTriggersView.as_view(), name='triggers-live'),
    path('mock', MockTriggerCreateView.as_view(), name='triggers-mock'),
    path('evaluate', EvaluateTriggersView.as_view(), name='triggers-evaluate'),
    path('poll', PollLiveTriggersView.as_view(), name='triggers-poll'),
    path('fetch-data', FetchLiveDataView.as_view(), name='triggers-fetch-data'),
    # path('reports/create', WorkerCrowdReportView.as_view(), name='triggers-report-create'),
    # path('reports/admin', AdminCrowdReportView.as_view(), name='triggers-report-admin'),
    path('locations', TriggerLocationsView.as_view(), name='triggers-locations'),
]

