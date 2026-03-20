from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests


@dataclass(frozen=True)
class LiveConditions:
    source_type: str
    source_value: dict[str, Any]


_CITY_LATLON: dict[str, tuple[float, float]] = {
    # Hackathon-friendly defaults (can be extended).
    'hyderabad': (17.3850, 78.4867),
    'bengaluru': (12.9716, 77.5946),
    'bangalore': (12.9716, 77.5946),
    'mumbai': (19.0760, 72.8777),
    'delhi': (28.6139, 77.2090),
    'pune': (18.5204, 73.8567),
    'chennai': (13.0827, 80.2707),
    'kolkata': (22.5726, 88.3639),
}


def _openmeteo_json(url: str, params: dict[str, Any]) -> dict[str, Any]:
    r = requests.get(url, params=params, timeout=10)
    r.raise_for_status()
    return r.json()


def fetch_live_conditions(city: str) -> LiveConditions | None:
    """
    Free, keyless integration using Open-Meteo (weather + air quality).
    Returns values in the same shape our trigger engine expects.

    Note: For hackathon MVP we map a few Indian cities to lat/lon. If the city is unknown,
    we return None and the system can fall back to mocks.
    """
    latlon = _CITY_LATLON.get((city or '').strip().lower())
    if not latlon:
        return None
    lat, lon = latlon

    # Weather (use forecast windows to better match parametric thresholds)
    w = _openmeteo_json(
        'https://api.open-meteo.com/v1/forecast',
        {
            'latitude': lat,
            'longitude': lon,
            'current': 'temperature_2m',
            'hourly': 'precipitation,temperature_2m',
            'timezone': 'auto',
        },
    )
    current = (w.get('current') or {}) if isinstance(w, dict) else {}
    temp_now = float(current.get('temperature_2m') or 0.0)
    hourly = (w.get('hourly') or {}) if isinstance(w, dict) else {}
    precip_series = hourly.get('precipitation') or []
    temp_series = hourly.get('temperature_2m') or []

    def _window_sum(xs, n: int) -> float:
        try:
            return float(sum(float(x or 0.0) for x in list(xs)[:n]))
        except Exception:
            return 0.0

    def _window_max(xs, n: int, fallback: float) -> float:
        try:
            vals = [float(x or 0.0) for x in list(xs)[:n]]
            return max(vals) if vals else fallback
        except Exception:
            return fallback

    rainfall_6h = _window_sum(precip_series, 6)
    temperature_3h = _window_max(temp_series, 3, temp_now)

    # Air quality (US AQI) - use next ~4 hours max
    aq = _openmeteo_json(
        'https://air-quality-api.open-meteo.com/v1/air-quality',
        {
            'latitude': lat,
            'longitude': lon,
            'current': 'us_aqi',
            'hourly': 'us_aqi',
            'timezone': 'auto',
        },
    )
    aq_cur = (aq.get('current') or {}) if isinstance(aq, dict) else {}
    aqi_now = float(aq_cur.get('us_aqi') or 0.0)
    aq_hourly = (aq.get('hourly') or {}) if isinstance(aq, dict) else {}
    aqi_series = aq_hourly.get('us_aqi') or []
    aqi_4h = _window_max(aqi_series, 4, aqi_now)

    source_value = {
        'temperature_c_3h': round(float(temperature_3h), 2),
        'rainfall_mm_6h': round(float(rainfall_6h), 2),
        'aqi_4h': round(float(aqi_4h), 2),
    }

    return LiveConditions(source_type='openmeteo', source_value=source_value)

