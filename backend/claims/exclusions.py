"""Standard exclusions and exclusion engine (GigShield v1.0)."""
from __future__ import annotations

from typing import Any

from django.utils import timezone

STANDARD_EXCLUSIONS_V1 = {
    "version": "v1.0",
    "effective_date": "2025-01-01",
    "exclusions": [
        {
            "id": "EX-01",
            "category": "GEOPOLITICAL",
            "name": "War or Armed Conflict",
            "description": "Any loss caused directly or indirectly by war, invasion, act of foreign enemy, hostilities, or armed conflict.",
            "trigger_override": True,
        },
        {
            "id": "EX-02",
            "category": "EPIDEMIC",
            "name": "Government-Declared Pandemic or Epidemic",
            "description": "Income loss due to lockdowns, movement restrictions, or work prohibitions imposed under the Epidemic Diseases Act or Disaster Management Act.",
            "trigger_override": True,
        },
        {
            "id": "EX-03",
            "category": "GEOPOLITICAL",
            "name": "Terrorism or Civil Unrest",
            "description": "Loss arising from acts of terrorism, riots, civil commotion, or sabotage as defined under the Unlawful Activities (Prevention) Act.",
            "trigger_override": True,
        },
        {
            "id": "EX-04",
            "category": "CATASTROPHIC",
            "name": "Nuclear, Chemical, or Biological Contamination",
            "description": "Any loss caused by nuclear radiation, radioactive contamination, chemical warfare, or biological agents.",
            "trigger_override": True,
        },
        {
            "id": "EX-05",
            "category": "CONDUCT",
            "name": "Intentional Self-Disruption",
            "description": "Worker deliberately choosing not to work during a covered disruption window.",
            "detection": "ML behavioral analysis + GPS inactivity cross-check",
        },
        {
            "id": "EX-06",
            "category": "TIMING",
            "name": "Pre-Existing or Announced Zone Closures",
            "description": "Any closure, strike, or disruption that was publicly announced BEFORE the worker purchased the policy for that week.",
            "detection": "Policy purchase timestamp vs. closure announcement timestamp",
        },
        {
            "id": "EX-07",
            "category": "COVERAGE_SCOPE",
            "name": "Vehicle Repair or Physical Damage",
            "description": "GigShield covers INCOME LOSS ONLY. Claims for vehicle breakdown, repair costs, or property damage are strictly excluded.",
            "trigger_override": False,
        },
        {
            "id": "EX-08",
            "category": "COVERAGE_SCOPE",
            "name": "Health, Medical, or Accident Costs",
            "description": "Medical treatment, hospitalization, disability, or any health-related expense is explicitly outside GigShield's coverage scope.",
            "trigger_override": False,
        },
        {
            "id": "EX-09",
            "category": "COVERAGE_SCOPE",
            "name": "Life Insurance Events",
            "description": "Death, permanent disability, or terminal illness benefits are not provided under this policy.",
            "trigger_override": False,
        },
        {
            "id": "EX-10",
            "category": "PLATFORM",
            "name": "Delivery Platform App or Server Downtime",
            "description": "Technical outages of the Swiggy or Zomato platforms are not covered. Coverage is for external environmental disruptions only.",
            "trigger_override": False,
        },
        {
            "id": "EX-11",
            "category": "CONDUCT",
            "name": "Personal Disputes or Worker-Initiated Stoppages",
            "description": "Any income loss resulting from disputes with customers, the platform, or voluntary work stoppages is excluded.",
            "trigger_override": False,
        },
        {
            "id": "EX-12",
            "category": "FRAUD",
            "name": "Fraudulent or Misrepresented Claims",
            "description": "Claims found to involve GPS spoofing, fabricated disruptions, earnings inflation, or any misrepresentation are automatically rejected and may result in policy cancellation.",
            "trigger_override": False,
        },
    ],
}


class ExclusionEngine:
    """Runs before claim processing."""

    def check_claim(self, claim, trigger, policy) -> dict[str, Any]:
        from triggers.models import GovernmentAlert

        if self._is_government_declared_emergency(trigger, GovernmentAlert):
            return self._excluded("EX-02", "Active government-declared epidemic/pandemic restriction")

        if trigger.source in ("GOVT_EMERGENCY", "ARMED_CONFLICT"):
            return self._excluded("EX-01", "Geopolitical event exclusion applies")

        if trigger.source == "TERRORISM_UNREST":
            return self._excluded("EX-03", "Terrorism or civil unrest exclusion applies")

        if trigger.source == "NBC_CONTAMINATION":
            return self._excluded("EX-04", "Nuclear/chemical/biological exclusion applies")

        pol_created = policy.created_at if policy else timezone.now()
        announcement = getattr(trigger, "announcement_at", None) or trigger.triggered_at
        if trigger.source != "AUTO_PURCHASE_DEMO" and announcement < pol_created:
            return self._excluded("EX-06", "Disruption was announced before policy was purchased")

        excluded_types = {
            "VEHICLE_BREAKDOWN": "EX-07",
            "MEDICAL": "EX-08",
            "ACCIDENT": "EX-08",
            "LIFE": "EX-09",
            "PLATFORM_OUTAGE": "EX-10",
        }
        t = getattr(trigger, "trigger_type", None)
        if t in excluded_types:
            return self._excluded(excluded_types[t], "Outside coverage scope or platform exclusion")

        if trigger.is_excluded_event:
            return self._excluded("EX-02", trigger.exclusion_reason or "Event excluded")

        return {"is_excluded": False, "exclusion_id": None, "reason": None}

    def _excluded(self, ex_id: str, reason: str) -> dict[str, Any]:
        return {"is_excluded": True, "exclusion_id": ex_id, "reason": reason}

    def _is_government_declared_emergency(self, trigger, GovernmentAlert) -> bool:
        return GovernmentAlert.objects.filter(
            city=trigger.city,
            alert_type__in=["EPIDEMIC", "LOCKDOWN", "DISASTER_ACT"],
            is_active=True,
        ).exists()
