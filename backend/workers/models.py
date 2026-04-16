from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import CharField, FloatField, IntegerField, ForeignKey, SET_NULL

class GridCell(models.Model):
    """500m × 500m micro-zone within a city zone."""
    zone = CharField(max_length=100)          # Parent zone (Andheri West)
    city = CharField(max_length=100)
    cell_id = CharField(max_length=20)         # e.g., "MUM-ANW-04-07"
    lat_min = FloatField()
    lat_max = FloatField()
    lon_min = FloatField()
    lon_max = FloatField()
    center_lat = FloatField()
    center_lon = FloatField()

    # Hyper-local risk history (updated weekly by Celery)
    flood_incidents_12m = IntegerField(default=0)   # Floods in last 12 months
    waterlog_score = FloatField(default=0.0)        # 0–1: how prone to waterlogging
    elevation_meters = FloatField(default=10.0)     # Sea level elevation
    drainage_quality = CharField(
        max_length=20,
        choices=[('POOR', 'POOR'), ('AVERAGE', 'AVERAGE'), ('GOOD', 'GOOD')],
        default='AVERAGE'
    )
    avg_aqi_30d = FloatField(default=100.0)         # Rolling 30-day AQI average
    heat_island_factor = FloatField(default=1.0)    # Urban heat multiplier (1.0–1.3)
    historical_disruption_rate = FloatField(default=0.1)  # Claims per worker per week

    class Meta:
        unique_together = ['city', 'zone', 'cell_id']

class User(AbstractUser):
    class Role(models.TextChoices):
        WORKER = "WORKER", "Worker"
        ADMIN = "ADMIN", "Admin"

    class Platform(models.TextChoices):
        ZOMATO = "ZOMATO", "Zomato"
        SWIGGY = "SWIGGY", "Swiggy"
        AMAZON_FLEX = "AMAZON_FLEX", "Amazon Flex"
        BLINKIT = "BLINKIT", "Blinkit"
        FLIPKART = "FLIPKART", "Flipkart"
        DUNZO = "DUNZO", "Dunzo"
        PORTER = "PORTER", "Porter"
        ZEPTO = "ZEPTO", "Zepto"
        BIGBASKET = "BIGBASKET", "BigBasket"
        SHADOWFAX = "SHADOWFAX", "Shadowfax"
        ECOM_EXPRESS = "ECOM_EXPRESS", "Ecom Express"
        DELHIVERY = "DELHIVERY", "Delhivery"

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.WORKER)
    phone = models.CharField(max_length=15, unique=True)
    city = models.CharField(max_length=100, blank=True, default="")
    zone = models.CharField(max_length=100, blank=True, default="")
    platform = models.CharField(max_length=20, choices=Platform.choices, default=Platform.SWIGGY)
    avg_daily_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    upi_id = models.CharField(max_length=50, blank=True, default="")
    joined_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class WorkerProfile(models.Model):
    class KycDoc(models.TextChoices):
        AADHAAR = "AADHAAR", "Aadhaar"
        PAN = "PAN", "PAN"
        DRIVING_LICENSE = "DRIVING_LICENSE", "Driving License"

    class RiskTier(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="worker_profile")
    kyc_verified = models.BooleanField(default=False)
    kyc_document_type = models.CharField(max_length=20, choices=KycDoc.choices, default=KycDoc.AADHAAR)
    kyc_document_hash = models.CharField(max_length=64, blank=True, default="")
    total_deliveries = models.IntegerField(default=0)
    active_since = models.DateField(null=True, blank=True)
    risk_score = models.FloatField(default=50.0)
    risk_tier = models.CharField(max_length=10, choices=RiskTier.choices, default=RiskTier.MEDIUM)
    city_zone = models.CharField(max_length=100, blank=True, default="")
    historical_claims_count = models.IntegerField(default=0)
    last_risk_computed_at = models.DateTimeField(null=True, blank=True)
    device_fingerprint_hash = models.CharField(max_length=64, blank=True, default="")
    platform_worker_id = models.CharField(max_length=50, blank=True, default="", help_text="Delivery partner ID from Swiggy/Zomato/Amazon etc.")
    aadhaar_last4 = models.CharField(max_length=4, blank=True, default="", help_text="Last 4 digits of Aadhaar for KYC simulation")
    is_verified = models.BooleanField(default=False, help_text="Verified gig worker")
    verification_method = models.CharField(max_length=30, blank=True, default="")
    
    grid_cell = ForeignKey(GridCell, null=True, on_delete=SET_NULL)
    # Worker's precise registered location (from onboarding GPS)
    registered_lat = FloatField(null=True)
    registered_lon = FloatField(null=True)

    def __str__(self):
        return f"Profile {self.user_id}"

def assign_worker_to_grid_cell(worker_profile):
    """Called during registration when worker grants GPS permission."""
    if worker_profile.registered_lat is None or worker_profile.registered_lon is None:
        return
    cell = GridCell.objects.filter(
        city=worker_profile.user.city,
        lat_min__lte=worker_profile.registered_lat,
        lat_max__gte=worker_profile.registered_lat,
        lon_min__lte=worker_profile.registered_lon,
        lon_max__gte=worker_profile.registered_lon,
    ).first()
    if cell:
        worker_profile.grid_cell = cell
        worker_profile.save()
