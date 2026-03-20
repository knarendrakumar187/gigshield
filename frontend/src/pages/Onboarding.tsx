import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Button, Card } from '../components/ui';

type WorkerProfile = {
  id: number;
  platform_name: string;
  city: string;
  primary_zone: string;
  secondary_zone: string;
  avg_weekly_income: number;
  avg_weekly_hours: number;
  preferred_work_start: string;
  preferred_work_end: string;
  payout_method: string;
  device_id: string;
  hourly_earnings: number;
};

export default function Onboarding() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    platform_name: 'Swiggy',
    city: 'Hyderabad',
    primary_zone: 'Madhapur',
    secondary_zone: 'Hitech City',
    avg_weekly_income: 4800,
    avg_weekly_hours: 48,
    preferred_work_start: '10:00:00',
    preferred_work_end: '20:00:00',
    payout_method: 'UPI',
    device_id: 'DEV-DEMO-001',
  });

  useEffect(() => {
    (async () => {
      try {
        const profile = await api<WorkerProfile>('/worker/profile', { method: 'GET' });
        if (profile?.id) {
          nav('/worker/dashboard');
          return;
        }
      } catch {
        // Not onboarded yet.
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  if (loading) return <div className="text-sm text-slate-600">Loading…</div>;

  return (
    <Card className="mx-auto max-w-2xl">
      <h2 className="text-lg font-semibold">Worker Onboarding</h2>
      <p className="mt-1 text-sm text-slate-600">A quick one-time setup. We calculate your hourly earnings from weekly income and hours.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[
          { k: 'platform_name', label: 'Delivery platform' },
          { k: 'city', label: 'City' },
          { k: 'primary_zone', label: 'Primary zone' },
          { k: 'secondary_zone', label: 'Secondary zone' },
          { k: 'avg_weekly_income', label: 'Avg weekly income (₹)', type: 'number' },
          { k: 'avg_weekly_hours', label: 'Avg weekly hours', type: 'number' },
          { k: 'preferred_work_start', label: 'Preferred start (HH:MM:SS)' },
          { k: 'preferred_work_end', label: 'Preferred end (HH:MM:SS)' },
          { k: 'payout_method', label: 'Payout method' },
          { k: 'device_id', label: 'Device ID' },
        ].map((f) => (
          <label key={f.k} className="grid gap-1 text-sm">
            {f.label}
            <input
              className="rounded-lg border px-3 py-2"
              value={(form as any)[f.k]}
              type={(f as any).type ?? 'text'}
              onChange={(e) => {
                const v = (f as any).type === 'number' ? Number(e.target.value) : e.target.value;
                setForm((p) => ({ ...p, [f.k]: v }));
              }}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
        Estimated hourly earnings: <span className="font-semibold">₹{Math.round((form.avg_weekly_income / Math.max(1, form.avg_weekly_hours)) * 100) / 100}</span>
      </div>

      {error ? <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-4 flex justify-end gap-3">
        <Button variant="secondary" onClick={() => nav('/worker/dashboard')}>
          Skip (demo)
        </Button>
        <Button
          variant="primary"
          onClick={async () => {
            try {
              setError('');
              await api('/worker/profile', { method: 'POST', body: form });
              nav('/policy/quote');
            } catch (e: any) {
              setError(e?.message ?? 'Failed to save profile');
            }
          }}
        >
          Save & continue
        </Button>
      </div>
    </Card>
  );
}

