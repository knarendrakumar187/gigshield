from django.contrib import admin

from payouts.models import Payout


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ("transaction_ref", "claim", "amount", "status")
