from django.urls import path

from triggers.views import WeatherCurrentView, WeatherForecastView

urlpatterns = [
    path("current/", WeatherCurrentView.as_view()),
    path("forecast/", WeatherForecastView.as_view()),
]
