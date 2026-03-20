import { useEffect, useState } from 'react';
import { api } from '../services/api';

type Payout = {
  id: number;
  claim_id: number;
  payout_channel: string;
  payout_status: string;
  transaction_ref: string;
  payout_amount: number;
  processed_at: string;
  trigger_type?: string;
  lost_hours?: number;
};

function AnimatedPayoutItem({ p }: { p: Payout }) {
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    if (p.payout_status === 'SUCCESS' || p.payout_status === 'Success') {
      const timer = setTimeout(() => {
        setStatus('Success ✅');
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setStatus(p.payout_status);
    }
  }, [p.payout_status]);

  return (
    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="font-bold text-lg text-emerald-700">₹{Math.round(p.payout_amount)}</div>
        <div
          className={`text-[11px] uppercase tracking-wider p-1 px-2 rounded font-bold transition-colors ${
            status === 'Processing...'
              ? 'bg-amber-100 text-amber-700 animate-pulse'
              : status.includes('Success')
              ? 'bg-emerald-100 text-emerald-800'
              : 'text-slate-600'
          }`}
        >
          {status}
        </div>
      </div>
      <div className="uppercase tracking-wide text-[10px] text-slate-400 font-semibold mb-3">
        Channel: {p.payout_channel} • Ref: {p.transaction_ref}
      </div>
      {(p.trigger_type && p.lost_hours) ? (
        <div className="bg-white rounded-lg p-2.5 text-xs text-slate-600 border border-slate-200">
           Lost <span className="font-semibold text-slate-800">{p.lost_hours} hours</span> due to {p.trigger_type.replaceAll('_', ' ').toLowerCase()} → compensated <span className="font-semibold">₹{Math.round(p.payout_amount)}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function PayoutHistory() {
  const [items, setItems] = useState<Payout[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setError('');
        const d = await api<Payout[]>('/payouts/history', { method: 'GET' });
        setItems(d);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load payouts');
      }
    })();
  }, []);

  return (
    <div className="rounded-2xl border bg-white p-6">
      <h2 className="text-lg font-semibold">Payout history</h2>
      <p className="mt-1 text-sm text-slate-600">Simulated payouts (mock UPI/wallet credit) for the hackathon demo.</p>

      {error ? <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-4 grid gap-2 text-sm">
        {items.length ? (
          items.map((p) => <AnimatedPayoutItem key={p.id} p={p} />)
        ) : (
          <div className="text-slate-600">No payouts yet.</div>
        )}
      </div>
    </div>
  );
}


