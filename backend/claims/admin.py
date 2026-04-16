from django.contrib import admin

from claims.models import Claim, FraudLog


class FraudLogInline(admin.TabularInline):
    model = FraudLog
    extra = 0


@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = ("id", "worker", "status", "fraud_score", "claimed_amount", "trigger")
    inlines = [FraudLogInline]


@admin.register(FraudLog)
class FraudLogAdmin(admin.ModelAdmin):
    list_display = ("claim", "check_type", "result", "confidence")
