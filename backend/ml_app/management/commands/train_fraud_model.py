"""Fit IsolationForest + scaler on historical claims and persist to ml_app/models/."""
from pathlib import Path

import joblib
import numpy as np
from django.core.management.base import BaseCommand
from django.utils import timezone
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from claims.models import Claim

DIR = Path(__file__).resolve().parent.parent.parent / "models"


class Command(BaseCommand):
    help = "Train fraud IsolationForest from DB claims"

    def handle(self, *args, **options):
        DIR.mkdir(parents=True, exist_ok=True)
        rows = []
        for c in Claim.objects.filter(trigger__isnull=False).select_related("trigger", "worker", "policy")[:2000]:
            w, t = c.worker, c.trigger
            daily = float(w.avg_daily_earnings) or 1.0
            claimed = float(c.claimed_amount)
            policy_age = 0
            if c.policy:
                policy_age = max(0, (timezone.now().date() - c.policy.created_at.date()).days)
            vec = [
                c.created_at.hour,
                0,
                0,
                daily,
                claimed,
                claimed / daily,
                float(t.severity),
                0.95,
                max(0.0, (c.created_at - t.triggered_at).total_seconds() / 60),
                0.95,
                0.4,
                float(c.fraud_score or 30),
                float(policy_age),
            ]
            rows.append(vec)
        if len(rows) < 10:
            rng = np.random.RandomState(42)
            rows = rng.randn(50, 13).tolist()
        X = np.array(rows, dtype=np.float64)
        scaler = StandardScaler()
        Xs = scaler.fit_transform(X)
        model = IsolationForest(random_state=42, contamination=0.1)
        model.fit(Xs)
        joblib.dump(model, DIR / "isolation_forest.joblib")
        joblib.dump(scaler, DIR / "scaler.joblib")
        self.stdout.write(self.style.SUCCESS(f"Saved model to {DIR}"))
