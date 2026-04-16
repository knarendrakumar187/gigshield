from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from gigshield.health import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check),
    path("api/auth/", include("workers.urls")),
    path("api/policies/", include("policies.urls")),
    path("api/triggers/", include("triggers.urls")),
    path("api/weather/", include("triggers.weather_urls")),
    path("api/claims/", include("claims.urls")),
    path("api/payouts/", include("payouts.urls")),
    path("api/exclusions/", include("claims.exclusion_urls")),
    path("api/admin/", include("admin_panel.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
