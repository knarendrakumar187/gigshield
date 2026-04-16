from django.contrib import admin

from triggers.models import City, DisruptionTrigger, GovernmentAlert, MunicipalAlert


admin.site.register(City)
admin.site.register(DisruptionTrigger)
admin.site.register(GovernmentAlert)
admin.site.register(MunicipalAlert)
