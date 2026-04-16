from django.urls import path

from triggers.views import TriggerHistoryView, TriggerListView, TriggerLiveView, TriggerPollView, TriggerSimulateView

urlpatterns = [
    path("", TriggerListView.as_view()),
    path("active/", TriggerLiveView.as_view()),
    path("simulate/", TriggerSimulateView.as_view()),
    path("live/", TriggerLiveView.as_view()),
    path("history/", TriggerHistoryView.as_view()),
    path("poll/", TriggerPollView.as_view()),
]
