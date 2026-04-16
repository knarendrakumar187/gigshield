"""Test the claims API endpoint as rider user."""
import requests

BASE = "http://localhost:8000"

# Login as rider
r = requests.post(f"{BASE}/api/auth/login/", json={"username": "rider", "password": "rider123"})
print(f"Login status: {r.status_code}")
if r.status_code != 200:
    print(f"Login response: {r.text}")
    exit(1)

token = r.json().get("access")
headers = {"Authorization": f"Bearer {token}"}

# Fetch claims
r2 = requests.get(f"{BASE}/api/claims/", headers=headers)
print(f"Claims status: {r2.status_code}")
data = r2.json()

if isinstance(data, dict) and "results" in data:
    claims = data["results"]
else:
    claims = data if isinstance(data, list) else []

print(f"Total claims for rider: {len(claims)}")
approved = [c for c in claims if c.get("status") == "APPROVED"]
rejected = [c for c in claims if c.get("status") == "REJECTED"]
manual = [c for c in claims if c.get("status") == "MANUAL_REVIEW"]
print(f"  APPROVED: {len(approved)}")
print(f"  REJECTED: {len(rejected)}")
print(f"  MANUAL_REVIEW: {len(manual)}")

for c in claims[:3]:
    print(f"  #{c['id']} status={c['status']} auto_processed={c.get('auto_processed')} amount={c.get('approved_amount')}")
