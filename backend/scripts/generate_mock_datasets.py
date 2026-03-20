import csv
import random
from datetime import date, timedelta
from pathlib import Path


def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def run():
    out_dir = Path(__file__).resolve().parents[2] / 'data'
    _ensure_dir(out_dir)

    cities = ['Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai', 'Delhi']
    zones = {
        'Hyderabad': ['Madhapur', 'Gachibowli', 'Kondapur'],
        'Bengaluru': ['Indiranagar', 'Koramangala', 'HSR Layout'],
        'Chennai': ['T Nagar', 'Velachery', 'Anna Nagar'],
        'Mumbai': ['Andheri', 'Bandra', 'Powai'],
        'Delhi': ['Saket', 'Dwarka', 'Karol Bagh'],
    }
    platforms = ['Swiggy', 'Zomato']

    rng = random.Random(42)

    # Dataset 1: Worker Profiles
    workers = []
    for wid in range(1, 101):
        city = rng.choice(cities)
        zone = rng.choice(zones[city])
        platform = rng.choice(platforms)
        income = rng.randint(3500, 8500)
        hours = rng.randint(35, 55)
        device_id = f'DEV-{rng.randint(1, 40):03d}'
        workers.append([wid, city, zone, platform, income, hours, device_id])

    with (out_dir / 'worker_profiles.csv').open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['worker_id', 'city', 'zone', 'platform', 'avg_weekly_income', 'avg_weekly_hours', 'device_id'])
        w.writerows(workers)

    # Dataset 2: Historical Disruptions
    start = date.today() - timedelta(days=60)
    disruptions = []
    for d in range(61):
        dt = start + timedelta(days=d)
        for city in cities:
            zone = rng.choice(zones[city])
            rainfall = max(0, int(rng.gauss(12, 18)))
            temp = round(rng.uniform(30, 45), 1)
            aqi = int(rng.uniform(80, 420))
            flood_alert = rng.random() < (0.05 if rainfall > 45 else 0.01)
            zone_closed = rng.random() < 0.02
            est_lost = 0
            if rainfall > 50 or flood_alert:
                est_lost = rng.randint(3, 7)
            elif temp > 42:
                est_lost = rng.randint(2, 5)
            elif aqi > 350:
                est_lost = rng.randint(1, 4)
            elif zone_closed:
                est_lost = rng.randint(3, 8)
            disruptions.append([dt.isoformat(), city, zone, rainfall, temp, aqi, int(flood_alert), int(zone_closed), est_lost])

    with (out_dir / 'historical_disruptions.csv').open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['date', 'city', 'zone', 'rainfall_mm', 'temperature_c', 'aqi', 'flood_alert', 'zone_closed', 'estimated_lost_hours'])
        w.writerows(disruptions)

    # Dataset 3: Activity Logs
    activity = []
    for wid, city, zone, _, income, hours, _ in workers:
        for d in range(14):
            dt = date.today() - timedelta(days=d)
            active_hours = max(0, int(rng.gauss(hours / 7.0, 1.2)))
            orders = max(0, int(rng.gauss(active_hours * 2.5, 3)))
            earnings = int((income / 7.0) * rng.uniform(0.8, 1.2))
            gps_zone = zone if rng.random() < 0.9 else rng.choice(zones[city])
            activity.append([wid, dt.isoformat(), active_hours, orders, gps_zone, earnings])

    with (out_dir / 'activity_logs.csv').open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['worker_id', 'date', 'active_hours', 'orders_completed', 'gps_zone', 'earnings'])
        w.writerows(activity)

    # Dataset 4: Claim History
    trigger_types = ['heavy_rain', 'flood_alert', 'extreme_heat', 'severe_aqi', 'zone_closure']
    claims = []
    for _ in range(220):
        wid, city, zone, _, income, hours, _ = rng.choice(workers)
        trigger = rng.choice(trigger_types)
        lost = rng.randint(1, 8)
        hourly = income / max(hours, 1)
        payout = round(lost * hourly * rng.choice([0.65, 0.8, 0.9]), 2)
        fraud_flag = rng.random() < 0.08
        status = 'approved'
        if fraud_flag and rng.random() < 0.6:
            status = 'rejected'
        elif fraud_flag:
            status = 'review'
        claims.append([wid, trigger, lost, payout, status, int(fraud_flag)])

    with (out_dir / 'claim_history.csv').open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['worker_id', 'trigger_type', 'lost_hours', 'payout_amount', 'claim_status', 'fraud_flag'])
        w.writerows(claims)

    # Dataset 5: Fraud Examples
    fraud = []
    for _ in range(180):
        wid, _, _, _, _, _, device_id = rng.choice(workers)
        gps_match = rng.random() < 0.9
        duplicate = rng.random() < 0.06
        suspicious_device = rng.random() < 0.07
        inactivity = rng.random() < 0.12
        label = int((not gps_match) or duplicate or suspicious_device or inactivity)
        fraud.append([wid, int(gps_match), int(duplicate), int(suspicious_device), int(inactivity), label])

    with (out_dir / 'fraud_examples.csv').open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['worker_id', 'gps_match', 'duplicate_claim', 'suspicious_device', 'inactivity_during_event', 'fraud_label'])
        w.writerows(fraud)

    print(f'Wrote CSV datasets to {out_dir}')

