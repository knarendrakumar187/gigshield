from django.contrib import admin

from policies.models import ActuarialReserve, ExclusionAcknowledgment, WeeklyPolicy


@admin.register(WeeklyPolicy)
class WeeklyPolicyAdmin(admin.ModelAdmin):
    list_display = ("worker", "week_start", "tier", "status", "premium_paid", "coverage_amount")


@admin.register(ExclusionAcknowledgment)
class ExclusionAckAdmin(admin.ModelAdmin):
    list_display = ("worker", "policy", "exclusions_version", "acknowledged_at")


@admin.register(ActuarialReserve)
class ActuarialAdmin(admin.ModelAdmin):
    list_display = ("week_start", "loss_ratio", "combined_ratio", "solvency_margin")
