from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TriggerRule:
    trigger_type: str
    threshold: dict


TRIGGER_RULES: dict[str, TriggerRule] = {
    'heavy_rain': TriggerRule('heavy_rain', {'rainfall_mm_6h_gt': 50}),
    'extreme_heat': TriggerRule('extreme_heat', {'temperature_c_gt': 42}),
    'severe_aqi': TriggerRule('severe_aqi', {'aqi_gt': 350}),
    'flood_alert': TriggerRule('flood_alert', {'flood_alert': True}),
    'zone_closure': TriggerRule('zone_closure', {'zone_closed': True}),
}


def is_threshold_met(trigger_type: str, source_value: dict) -> bool:
    """
    Hackathon threshold checker for mock inputs.
    """
    rule = TRIGGER_RULES.get(trigger_type)
    if not rule:
        return False

    if trigger_type == 'heavy_rain':
        return float(source_value.get('rainfall_mm_6h', 0)) > float(rule.threshold['rainfall_mm_6h_gt'])
    if trigger_type == 'extreme_heat':
        return float(source_value.get('temperature_c', 0)) > float(rule.threshold['temperature_c_gt'])
    if trigger_type == 'severe_aqi':
        return float(source_value.get('aqi', 0)) > float(rule.threshold['aqi_gt'])
    if trigger_type == 'flood_alert':
        return str(source_value.get('flood_alert', 'false')).lower() == 'true'
    if trigger_type == 'zone_closure':
        return str(source_value.get('zone_closed', 'false')).lower() == 'true'

    return False

