"""Seed demo users, cities, policies, historical claims for ML and UI."""
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from claims.models import Claim
from policies.models import WeeklyPolicy
from triggers.models import City, DisruptionTrigger, GovernmentAlert, MunicipalAlert
from workers.models import User, WorkerProfile

DEMO_USERS = [
    {"username": "rider", "email": "rider@example.com", "password": "rider123", "phone": "919811100001", "first_name": "Ravi", "last_name": "Kumar", "platform": "SWIGGY", "city": "Mumbai", "zone": "Andheri West", "avg_daily_earnings": "800", "upi_id": "ravi.kumar@okaxis"},
    {"username": "rider2", "email": "rider2@example.com", "password": "rider123", "phone": "919811100002", "first_name": "Priya", "last_name": "Sharma", "platform": "ZOMATO", "city": "Mumbai", "zone": "Andheri West", "avg_daily_earnings": "750", "upi_id": "priya.sharma@okhdfc"},
    {"username": "rider3", "email": "rider3@example.com", "password": "rider123", "phone": "919811100003", "first_name": "Mohammed", "last_name": "Iqbal", "platform": "SWIGGY", "city": "Bengaluru", "zone": "Koramangala", "avg_daily_earnings": "900", "upi_id": "iqbal.m@oksbi"},
]

CITIES = [
    ("Mumbai", 19.0760, 72.8777, "Andheri West"),
    ("Bengaluru", 12.9716, 77.5946, "Koramangala"),
    ("Delhi", 28.6139, 77.2090, "Connaught Place"),
    ("Hyderabad", 17.3850, 78.4867, "Hitech City"),
    ("Chennai", 13.0827, 80.2707, "T. Nagar"),
    ("Kolkata", 22.5726, 88.3639, "Salt Lake"),
    ("Pune", 18.5204, 73.8567, "Baner"),
    ("Ahmedabad", 23.0225, 72.5714, "Satellite"),
    ("Jaipur", 26.9124, 75.7873, "C-Scheme"),
    ("Lucknow", 26.8467, 80.9462, "Gomti Nagar"),
    ("Kochi", 9.9312, 76.2673, "Ernakulam"),
    ("Surat", 21.1702, 72.8311, "Adajan"),
    ("Nagpur", 21.1458, 79.0882, "Ramdaspeth"),
    ("Chandigarh", 30.7333, 76.7794, "Sector 17"),
    ("Vijayawada", 16.5062, 80.6480, "Benz Circle"),
    ("Guntur", 16.3067, 80.4365, "Brodipet"),
]

ZONES = {
    "Mumbai": ["Andheri West", "Kurla", "Dharavi", "Bandra"],
    "Bengaluru": ["Koramangala", "Whitefield", "BTM Layout"],
    "Delhi": ["Connaught Place", "Lajpat Nagar"],
    "Hyderabad": ["Hitech City", "Banjara Hills"],
    "Chennai": ["T. Nagar", "Adyar", "Velachery", "Anna Nagar", "Mylapore"],
    "Kolkata": ["Salt Lake", "Park Street", "Howrah", "Rajarhat"],
    "Pune": ["Baner", "Hinjewadi", "Kothrud", "Shivajinagar", "Viman Nagar"],
    "Ahmedabad": ["Bopal", "Satellite", "Navrangpura", "Thaltej"],
    "Jaipur": ["Vaishali Nagar", "C-Scheme", "Malviya Nagar", "Mansarovar"],
    "Lucknow": ["Gomti Nagar", "Hazratganj", "Aliganj"],
    "Kochi": ["Ernakulam", "Edappally", "Kakkanad", "Kalamassery"],
    "Surat": ["Varachha", "Adajan", "Vesu", "Dumas"],
    "Nagpur": ["Nagpur West", "Wadi", "Ramdaspeth", "Dharampeth"],
    "Chandigarh": ["Sector 17", "Sector 34", "Industrial Area"],
    "Vijayawada": ["Benz Circle", "Labbipet", "Governorpet", "Kanur", "Patamata"],
    "Guntur": ["Brodipet", "Arundelpet", "Kothapet", "Lakshmipuram"],
}


class Command(BaseCommand):
    help = "Load GigShield demo data"

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-active-policies",
            action="store_true",
            help="Also create active current-week policies for demo workers.",
        )

    def handle(self, *args, **options):
        for name, lat, lon, dz in CITIES:
            City.objects.get_or_create(name=name, defaults={"lat": lat, "lon": lon, "default_zone": dz, "monitoring_active": True})

        GovernmentAlert.objects.get_or_create(
            city="Mumbai", alert_type="EPIDEMIC", defaults={"is_active": False, "notes": "Demo inactive"}
        )
        MunicipalAlert.objects.get_or_create(
            city="Mumbai", zone="Dharavi", defaults={"alert_type": "FLOOD", "is_active": True, "severity": 3}
        )

        admin, _ = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@example.com", "role": User.Role.ADMIN, "phone": "919800000001", "city": "Mumbai", "zone": "HQ"},
        )
        admin.set_password("admin123")
        admin.role = User.Role.ADMIN
        admin.save()

        # Generate GridCells for Mumbai/Andheri West and Bengaluru/Koramangala
        from workers.models import GridCell
        grid_data = [
            ("Mumbai", "Andheri West", 19.1136, 72.8697),
            ("Bengaluru", "Koramangala", 12.9352, 77.6245)
        ]
        import random
        for city, zone, center_lat, center_lon in grid_data:
            for i in range(-2, 3):
                for j in range(-2, 3):
                    lat = center_lat + (i * 0.0045)
                    lon = center_lon + (j * 0.0045)
                    cell, _ = GridCell.objects.get_or_create(
                        city=city, zone=zone, cell_id=f"{city[:3]}-{zone[:3]}-{i}-{j}",
                        defaults={
                            "lat_min": lat - 0.00225,
                            "lat_max": lat + 0.00225,
                            "lon_min": lon - 0.00225,
                            "lon_max": lon + 0.00225,
                            "center_lat": lat, 
                            "center_lon": lon,
                            "elevation_meters": random.choice([5.0, 10.0, 15.0]),
                            "drainage_quality": random.choice(["POOR", "AVERAGE", "GOOD"]),
                            "waterlog_score": random.uniform(0.1, 0.9),
                            "heat_island_factor": random.uniform(1.0, 1.3),
                            "flood_incidents_12m": random.randint(0, 3),
                            "avg_aqi_30d": random.uniform(80.0, 300.0),
                            "historical_disruption_rate": random.uniform(0.05, 0.3),
                        }
                    )

        workers = []
        for d in DEMO_USERS:
            u, _ = User.objects.get_or_create(
                username=d["username"],
                defaults={
                    "email": d["email"],
                    "phone": d["phone"],
                    "city": d["city"],
                    "zone": d["zone"],
                    "platform": d["platform"],
                    "avg_daily_earnings": d["avg_daily_earnings"],
                    "upi_id": d["upi_id"],
                    "first_name": d["first_name"],
                    "last_name": d["last_name"],
                    "role": User.Role.WORKER,
                },
            )
            u.phone = d["phone"]
            u.set_password(d["password"])
            u.save()
            wp, _ = WorkerProfile.objects.update_or_create(
                user=u,
                defaults={
                    "city_zone": f"{d['city']} {d['zone']}",
                    "active_since": date.today() - timedelta(days=400),
                    "risk_score": 40.0,
                    "risk_tier": WorkerProfile.RiskTier.LOW,
                },
            )
            
            zone_cells = list(GridCell.objects.filter(city=d['city'], zone=d['zone']))
            if zone_cells:
                cell = random.choice(zone_cells)
                wp.grid_cell = cell
                wp.registered_lat = cell.center_lat
                wp.registered_lon = cell.center_lon
                wp.save()

            workers.append(u)

        n = 0
        for city, zones in ZONES.items():
            for z in zones:
                for i in range(3):
                    uname = f"rider_{city[:3].lower()}_{z.replace(' ', '')[:4]}{i}"
                    if User.objects.filter(username=uname).exists():
                        continue
                    phone = f"9198999{n:05d}"
                    n += 1
                    u = User(
                        username=uname,
                        email=f"{uname}@demo.gig",
                        phone=phone,
                        city=city,
                        zone=z,
                        platform=User.Platform.SWIGGY if i % 2 else User.Platform.ZOMATO,
                        avg_daily_earnings=Decimal("650") + i * 20,
                        upi_id=f"{uname}@okaxis",
                        role=User.Role.WORKER,
                    )
                    u.set_password("demo12345")
                    u.save()
                    wp = WorkerProfile.objects.create(
                        user=u,
                        city_zone=f"{city} {z}",
                        active_since=date.today() - timedelta(days=60 + i * 10),
                        risk_score=45 + i,
                        risk_tier=WorkerProfile.RiskTier.MEDIUM,
                    )
                    
                    # Associate worker with a random grid cell from their zone if it exists
                    from workers.models import GridCell
                    zone_cells = list(GridCell.objects.filter(city=city, zone=z))
                    if zone_cells:
                        import random
                        cell = random.choice(zone_cells)
                        wp.grid_cell = cell
                        wp.registered_lat = cell.center_lat
                        wp.registered_lon = cell.center_lon
                        wp.save()

        today = timezone.localdate()
        ws = today - timedelta(days=today.weekday())
        we = ws + timedelta(days=6)

        # Important: keep demo workers uninsured by default so claims are not auto-generated
        # unless they explicitly purchase in the app.
        if options.get("with_active_policies"):
            for u in workers:
                WeeklyPolicy.objects.update_or_create(
                    worker=u,
                    week_start=ws,
                    defaults={
                        "week_end": we,
                        "premium_paid": Decimal("35"),
                        "coverage_amount": Decimal("500"),
                        "tier": WeeklyPolicy.Tier.STANDARD,
                        "status": WeeklyPolicy.Status.ACTIVE,
                        "exclusions_acknowledged": True,
                        "expected_loss_amount": Decimal("50"),
                        "zone_risk_multiplier": 1.1,
                    },
                )

        hist_user = workers[0]
        past_ws = ws - timedelta(days=7)
        past_we = past_ws + timedelta(days=6)
        hist_policy, _ = WeeklyPolicy.objects.get_or_create(
            worker=hist_user,
            week_start=past_ws,
            defaults={
                "week_end": past_we,
                "premium_paid": Decimal("35"),
                "coverage_amount": Decimal("500"),
                "tier": WeeklyPolicy.Tier.STANDARD,
                "status": WeeklyPolicy.Status.EXPIRED,
                "exclusions_acknowledged": True,
                "expected_loss_amount": Decimal("50"),
                "zone_risk_multiplier": 1.1,
            },
        )

        historical = [
            (90, "RAIN", "Mumbai", "Andheri West", 4, 120.0, 6.0),
            (60, "HEAT", "Delhi", "Connaught Place", 3, 45.0, 4.0),
            (30, "AQI", "Bengaluru", "Koramangala", 2, 380.0, 5.0),
        ]
        for days_ago, tt, city, zone, sev, actual, dur in historical:
            triggered = timezone.now() - timedelta(days=days_ago)
            tr = DisruptionTrigger.objects.create(
                trigger_type=tt,
                city=city,
                zone=zone,
                severity=sev,
                actual_value=actual,
                threshold_value=50,
                triggered_at=triggered,
                duration_hours=dur,
                source="seed",
                is_active=False,
            )
            if hist_policy:
                Claim.objects.get_or_create(
                    worker=hist_user,
                    trigger=tr,
                    policy=hist_policy,
                    defaults={
                        "claimed_amount": Decimal("480"),
                        "approved_amount": Decimal("480"),
                        "fraud_score": 22.0,
                        "status": Claim.Status.APPROVED,
                        "processed_at": triggered + timedelta(hours=1),
                    },
                )

        mixed = [
            ("APPROVED", 18.0),
            ("APPROVED", 24.0),
            ("REJECTED", 78.0),
            ("MANUAL_REVIEW", 55.0),
        ]
        for i, (st, fs) in enumerate(mixed):
            tr = DisruptionTrigger.objects.create(
                trigger_type="RAIN",
                city="Mumbai",
                zone="Andheri West",
                severity=3,
                threshold_value=50,
                actual_value=80,
                triggered_at=timezone.now() - timedelta(days=7 + i),
                duration_hours=4,
                source="seed_demo",
                is_active=False,
            )
            if hist_policy:
                Claim.objects.create(
                    worker=hist_user,
                    policy=hist_policy,
                    trigger=tr,
                    claimed_amount=Decimal("400"),
                    approved_amount=Decimal("400") if st == "APPROVED" else Decimal("0"),
                    fraud_score=fs,
                    status=st,
                    processed_at=timezone.now() - timedelta(days=7 + i),
                )

        # High volatility claims for Mohammed (rider3, workers[2])
        mohammed = workers[2]
        moh_policy = WeeklyPolicy.objects.filter(worker=mohammed).first()
        if moh_policy:
            tr = DisruptionTrigger.objects.create(
                trigger_type="FLOOD",
                city="Bengaluru",
                zone="Koramangala",
                severity=5,
                threshold_value=50,
                actual_value=120,
                triggered_at=timezone.now() - timedelta(days=5),
                duration_hours=10,
                source="seed",
                is_active=False,
            )
            Claim.objects.create(
                worker=mohammed,
                policy=moh_policy,
                trigger=tr,
                claimed_amount=Decimal("2500"), # Spike!
                approved_amount=Decimal("0"),
                fraud_score=85.0, # High risk
                status="REJECTED",
                processed_at=timezone.now() - timedelta(days=4),
            )
            tr2 = DisruptionTrigger.objects.create(
                trigger_type="RAIN",
                city="Bengaluru",
                zone="Koramangala",
                severity=3,
                threshold_value=50,
                actual_value=60,
                triggered_at=timezone.now() - timedelta(days=20),
                duration_hours=4,
                source="seed",
                is_active=False,
            )
            Claim.objects.create(
                worker=mohammed,
                policy=moh_policy,
                trigger=tr2,
                claimed_amount=Decimal("150"),
                approved_amount=Decimal("150"),
                fraud_score=15.0,
                status="APPROVED",
                processed_at=timezone.now() - timedelta(days=19),
            )

        # Generate the behavior profiles synchronously
        from ml_app.tasks import update_worker_behavior_profile
        for w in workers:
            update_worker_behavior_profile(w.id)

        # Ensure admin dashboard charts have actuarial reserve rows.
        # (This writes `policies.ActuarialReserve` for the current `week_start`.)
        from policies.financial_model import calculate_weekly_financials

        calculate_weekly_financials(ws)

        self.stdout.write(self.style.SUCCESS("Demo seed complete. rider/rider123, admin/admin123"))
