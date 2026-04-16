from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from workers.models import User, WorkerProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ("GigShield", {"fields": ("role", "phone", "city", "zone", "platform", "avg_daily_earnings", "upi_id")}),
    )
    list_display = ("username", "email", "role", "city", "zone", "is_staff")


@admin.register(WorkerProfile)
class WorkerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "risk_tier", "risk_score", "city_zone")
