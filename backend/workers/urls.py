from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from workers.views import CustomTokenView, ProfileView, RegisterView, VerifyWorkerView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", CustomTokenView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("verify-worker/", VerifyWorkerView.as_view(), name="verify-worker"),
]
