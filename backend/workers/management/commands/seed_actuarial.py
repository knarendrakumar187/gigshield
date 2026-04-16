from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from policies.financial_model import calculate_weekly_financials


class Command(BaseCommand):
    help = "Compute actuarial reserve rows for dashboard charts."

    def add_arguments(self, parser):
        parser.add_argument("--weeks", type=int, default=8, help="How many weeks back to compute.")

    def handle(self, *args, **options):
        weeks = int(options.get("weeks") or 8)
        today = timezone.localdate()
        ws0 = today - timedelta(days=today.weekday())

        computed = 0
        for i in range(max(1, weeks)):
            ws = ws0 - timedelta(weeks=i)
            calculate_weekly_financials(ws)
            computed += 1

        self.stdout.write(self.style.SUCCESS(f"Actuarial reserve updated for {computed} weeks.")) 

