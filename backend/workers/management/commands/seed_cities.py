from django.core.management.base import BaseCommand

from triggers.models import City


# Keep this list in sync with `frontend/src/pages/LoginPage.tsx` and
# `workers/management/commands/seed_demo.py`.
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


class Command(BaseCommand):
    help = "Seed/extend City coordinates only (no policies/claims)."

    def handle(self, *args, **options):
        created = 0
        for name, lat, lon, default_zone in CITIES:
            obj, was_created = City.objects.get_or_create(
                name=name,
                defaults={"lat": lat, "lon": lon, "default_zone": default_zone, "monitoring_active": True},
            )
            if was_created:
                created += 1
            else:
                # Keep lat/lon consistent if you update the list later
                obj.lat = lat
                obj.lon = lon
                obj.default_zone = default_zone
                obj.monitoring_active = True
                obj.save(update_fields=["lat", "lon", "default_zone", "monitoring_active"])

        self.stdout.write(self.style.SUCCESS(f"City seeding complete. Added/updated {created} new cities."))

