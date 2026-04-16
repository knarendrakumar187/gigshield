"""Open-Meteo weather + air quality (no API key)."""
from __future__ import annotations

import httpx

OPEN_METEO = "https://api.open-meteo.com/v1/forecast"


def fetch_open_meteo(lat: float, lon: float) -> dict:
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m",
        "hourly": "temperature_2m,relative_humidity_2m,precipitation,weather_code",
        "daily": "temperature_2m_max",
        "forecast_days": 3,
        "timezone": "Asia/Kolkata",
    }
    r = httpx.get(OPEN_METEO, params=params, timeout=30.0)
    r.raise_for_status()
    data = r.json()
    hourly = data.get("hourly", {})
    precip = hourly.get("precipitation", []) or []
    temps = hourly.get("temperature_2m", []) or []
    humidity = hourly.get("relative_humidity_2m", []) or []
    codes = hourly.get("weather_code", []) or []
    rain_6h = sum(precip[:6]) if precip else 0.0
    temp_max = max(temps) if temps else 0.0
    humidity_6h = (sum(humidity[:6]) / len(humidity[:6])) if humidity and any(humidity[:6]) else 0.0
    weather_code = codes[0] if codes else 0
    condition = weather_condition_from_code(int(weather_code))
    daily = data.get("daily", {})
    tmax_day = (daily.get("temperature_2m_max") or [temp_max])[0]
    current_temp = data.get("current", {}).get("temperature_2m", tmax_day or temp_max)
    aqi = fetch_aqi_european(lat, lon)
    return {
        "rain_6h": float(rain_6h),
        "temperature_2m_max": float(tmax_day or temp_max),
        "temperature_current": float(current_temp),
        "humidity_2m_max": float(humidity_6h),
        "weather_code": weather_code,
        "condition": condition,
        "aqi": aqi,
        "raw": data,
    }


def weather_condition_from_code(code: int) -> str:
    # Open-Meteo weather_code mapping (simplified, human-friendly)
    if code in (0, 1):
        return "Clear"
    if code in (2, 3):
        return "Partly Cloudy"
    if code in (45, 48):
        return "Fog"
    if code in (51, 53, 55):
        return "Drizzle"
    if code in (61, 63, 65):
        return "Rain"
    if code in (71, 73, 75):
        return "Snow"
    if code in (80, 81, 82):
        return "Showers"
    if code in (95):
        return "Thunderstorm"
    return "Cloudy"


def fetch_aqi_european(lat: float, lon: float) -> float:
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "us_aqi",
        "timezone": "Asia/Kolkata",
        "forecast_days": 1,
    }
    try:
        r = httpx.get(url, params=params, timeout=30.0)
        r.raise_for_status()
        d = r.json()
        vals = d.get("hourly", {}).get("us_aqi", []) or []
        return float(max(vals) if vals else 50)
    except Exception:
        return 50.0
