from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from triggers.models import City, DisruptionTrigger
from triggers.serializers import DisruptionTriggerSerializer, SimulateTriggerSerializer
from triggers.tasks import poll_weather_triggers, process_trigger_claims
from triggers.weather import fetch_open_meteo
from workers.permissions import IsAdminRole


class TriggerListView(generics.ListAPIView):
    permission_classes = (IsAdminRole,)
    serializer_class = DisruptionTriggerSerializer

    def get_queryset(self):
        return DisruptionTrigger.objects.all().order_by("-triggered_at")[:200]


class TriggerSimulateView(APIView):
    permission_classes = (IsAdminRole,)

    def post(self, request):
        ser = SimulateTriggerSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        tr = DisruptionTrigger.objects.create(
            trigger_type=d["trigger_type"],
            city=d["city"],
            zone=d["zone"],
            severity=d["severity"],
            threshold_value=d["threshold_value"],
            actual_value=d["actual_value"],
            triggered_at=timezone.now(),
            duration_hours=d["duration_hours"],
            source=d.get("source") or "MANUAL",
        )
        if settings.DEBUG:
            process_trigger_claims.apply(args=(tr.id,))
        else:
            process_trigger_claims.delay(tr.id)
        return Response(DisruptionTriggerSerializer(tr).data, status=status.HTTP_201_CREATED)


class WorkerSimulateTriggerView(APIView):
    """Allows any authenticated worker to fire a demo trigger for their city/zone."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        worker = request.user
        city = worker.city or "Mumbai"
        zone = worker.zone or "Andheri West"
        trigger_type = request.data.get("trigger_type", "RAIN")

        # Values high enough to trip the threshold
        TRIGGER_VALUES = {
            "RAIN":  {"actual": 120.0, "threshold": 50.0},
            "HEAT":  {"actual": 46.0,  "threshold": 42.0},
            "AQI":   {"actual": 400.0, "threshold": 350.0},
            "FLOOD": {"actual": 80.0,  "threshold": 50.0},
        }
        vals = TRIGGER_VALUES.get(trigger_type, TRIGGER_VALUES["RAIN"])

        tr = DisruptionTrigger.objects.create(
            trigger_type=trigger_type,
            city=city,
            zone=zone,
            severity=3,
            threshold_value=vals["threshold"],
            actual_value=vals["actual"],
            triggered_at=timezone.now(),
            duration_hours=4,
            source="worker_demo",
            is_active=True,
        )
        process_trigger_claims.delay(tr.id)
        return Response(
            {"triggered": True, "trigger_id": tr.id, "city": city, "zone": zone, "type": trigger_type},
            status=status.HTTP_201_CREATED,
        )


class TriggerLiveView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        since = timezone.now() - timedelta(days=1)
        qs = DisruptionTrigger.objects.filter(triggered_at__gte=since, is_active=True).order_by("-triggered_at")[:50]
        return Response(DisruptionTriggerSerializer(qs, many=True).data)


class TriggerPollView(APIView):
    permission_classes = (IsAdminRole,)

    def post(self, request):
        if settings.DEBUG:
            result = poll_weather_triggers.apply()
            return Response({"queued": False, "result": result.get()})
        task = poll_weather_triggers.delay()
        return Response({"queued": True, "task_id": task.id}, status=status.HTTP_202_ACCEPTED)


class TriggerHistoryView(generics.ListAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = DisruptionTriggerSerializer

    def get_queryset(self):
        return DisruptionTrigger.objects.filter(triggered_at__gte=timezone.now() - timedelta(days=30)).order_by("-triggered_at")[:200]


class WeatherCurrentView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        city_name = request.query_params.get("city", "Mumbai")
        c = City.objects.filter(name__iexact=city_name).first()
        if not c:
            # For demo users in cities we don't have coordinates for, return a safe, low-risk snapshot
            data = {
                "rain_6h": 0.0,
                "temperature_2m_max": 32.0,
                "temperature_current": 32.0,
                "aqi": 80.0,
                "humidity_2m_max": 50.0,
                "condition": "Partly Cloudy",
                "raw": {},
            }
            risk = "low"
            return Response(
                {
                    "city": city_name,
                    "zone": request.query_params.get("zone", ""),
                    "metrics": data,
                    "risk": risk,
                }
            )
        data = fetch_open_meteo(c.lat, c.lon)
        risk = "low"
        if data["rain_6h"] > 50 or data["temperature_2m_max"] > 42 or data.get("aqi", 0) > 350:
            risk = "high"
        elif data["rain_6h"] > 30 or data["temperature_2m_max"] > 38 or data.get("aqi", 0) > 200:
            risk = "medium"
        return Response({"city": c.name, "zone": request.query_params.get("zone", ""), "metrics": data, "risk": risk})


class WeatherForecastView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        city_name = request.query_params.get("city", "Mumbai")
        c = City.objects.filter(name__iexact=city_name).first() or City.objects.first()
        if not c:
            return Response({"error": "No city"}, status=400)
        data = fetch_open_meteo(c.lat, c.lon)
        return Response({"city": c.name, "forecast": data.get("raw", {})})
