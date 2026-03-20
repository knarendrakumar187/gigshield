import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { Alert, Badge, Button, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';

type Dashboard = {
  worker: { city: string; primary_zone: string; hourly_earnings: number };
  active_policy:
    | null
    | {
        id: number;
        tier: string;
        weekly_premium: number;
        max_covered_hours: number;
        coverage_ratio: number;
        active_from: string;
        active_to: string;
        remaining_covered_hours: number;
      };
  claims: { id: number; trigger_type: string; lost_hours: number; payout_amount: number; status: string; created_at: string; fraud_reason?: string; fraud_score: number; hourly_earnings: number; coverage_ratio: number; source_value?: any; trigger_severity?: number; gps_match_score?: number }[];
  payouts: { id: number; amount: number; status: string; ref: string; processed_at: string; trigger_type?: string; lost_hours?: number; }[];
  triggered_disruptions: { id: number; type: string; severity: number; event_start: string; event_end: string }[];
  protected_earnings_summary: { total_payouts: number };
};

export default function WorkerDashboard() {
  const { user } = useAuth();
  const location = useLocation() as any;
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [justActivated, setJustActivated] = useState(false);

  const [loadingDemo, setLoadingDemo] = useState(false);

  async function load() {
    try {
      setError('');
      const d = await api<Dashboard>('/dashboard/worker', { method: 'GET' });
      setData(d);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load dashboard');
    }
  }

  useEffect(() => {
    if (location?.state?.activated) {
      setJustActivated(true);
      // Clear navigation state so refresh doesn't keep showing it.
      try {
        window.history.replaceState({}, document.title);
      } catch {
        // ignore
      }
    }
    load();
  }, []);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-rose-200 bg-rose-50">
        <div className="flex items-center gap-3 text-rose-700">
          <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
            <span className="text-rose-500 text-lg">⚠️</span>
          </div>
          <div>
            <div className="font-semibold">Dashboard Error</div>
            <div className="text-sm opacity-80">{error}</div>
          </div>
        </div>
      </Card>
    </div>
  );
  
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
        <div className="text-sm text-slate-600 font-medium">Loading your dashboard...</div>
        <div className="text-xs text-slate-400 mt-2">Preparing your protection insights</div>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4">
      {justActivated ? (
        <Alert tone="success" className="border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-600 text-lg">🎉</span>
            </div>
            <div>
              <div className="font-semibold text-emerald-800">Policy Activated Successfully!</div>
              <div className="text-sm text-emerald-700">Your weekly income protection is now active. You can simulate a disruption to see the AI payout engine in action!</div>
            </div>
          </div>
        </Alert>
      ) : null}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-sky-600 bg-clip-text text-transparent">
              Welcome{user?.first_name ? `, ${user.first_name}` : ''} 👋
            </div>
            <div className="text-sm text-slate-600 mt-1 font-medium">
              {data.worker.city} • {data.worker.primary_zone}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-2 text-sm">
            Hourly earnings: <span className="font-semibold">₹{Math.round(data.worker.hourly_earnings * 100) / 100}</span>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-sm font-semibold">Active policy</div>
          {data.active_policy ? (
            <div className="mt-2 text-sm text-slate-700">
              <div className="capitalize">
                Tier: <span className="font-medium">{data.active_policy.tier}</span>
              </div>
              <div>
                Weekly premium: <span className="font-medium">₹{data.active_policy.weekly_premium} / wk</span>
              </div>
              <div>
                Remaining covered hours: <span className="font-medium">{data.active_policy.remaining_covered_hours}</span>
              </div>
              <div className="mt-3 space-y-2">
                <Link className="text-indigo-700 hover:underline" to="/policy/quote">
                  Change plan
                </Link>
                <span className="text-slate-400 mx-2">•</span>
                <Link className="text-indigo-700 hover:underline" to="/policy/history">
                  View history
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-slate-600">
              No active policy.{' '}
              <Link className="text-indigo-700 hover:underline" to="/policy/quote">
                Get weekly cover
              </Link>
              .
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold">Protected earnings</div>
          <div className="mt-2 text-2xl font-semibold">₹{Math.round(data.protected_earnings_summary.total_payouts)}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span>Total payouts credited</span>
            <Badge tone="emerald">{data.claims.filter(c => c.status === 'approved').length} Fraud-safe claims</Badge>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Triggered disruptions</div>
            <Badge tone="slate">zone</Badge>
          </div>
          <div className="mt-2 grid gap-2 text-sm">
            {data.triggered_disruptions.length ? (
              data.triggered_disruptions.slice(0, 4).map((t) => (
                <div key={t.id} className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="font-medium">{t.type.replaceAll('_', ' ')}</div>
                  <div className="text-xs text-slate-600">Severity {t.severity}</div>
                </div>
              ))
            ) : (
              <div className="text-slate-600">No recent triggers in your zone.</div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="mb-2 bg-indigo-50 border-indigo-100">
          <div className="text-sm font-semibold text-indigo-900 mb-3">System Flow Overview</div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-700 overflow-x-auto py-2">
            <div className="flex flex-col items-center min-w-[100px] shrink-0">
              <Badge tone="indigo">Trigger Detected</Badge>
            </div>
            <div className="text-indigo-300">→</div>
            <div className="flex flex-col items-center min-w-[100px] shrink-0">
              <Badge tone="slate">Claim Auto-created</Badge>
            </div>
            <div className="text-indigo-300">→</div>
            <div className="flex flex-col items-center min-w-[100px] shrink-0">
               <Badge tone="amber">Fraud Check (AI)</Badge>
            </div>
            <div className="text-indigo-300">→</div>
            <div className="flex flex-col items-center min-w-[100px] shrink-0">
              <Badge tone="emerald">Payout Issued</Badge>
            </div>
          </div>
        </Card>

        <Card className="mb-2 bg-white border-slate-200">
          <div className="text-sm font-semibold text-slate-800 mb-1">Policy Protection Active</div>
          <div className="text-xs text-slate-500 mb-3">Your policy is active and monitoring disruptions in real-time.</div>
          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
            🛡️ Automated protection against weather and zone disruptions
          </div>
        </Card>
      </div>

      {data.payouts.length > 0 && (
        <Alert tone="success" className="bg-emerald-50 border-emerald-200 text-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-600 text-xl">💰</span>
            </div>
            <div>
              <div className="font-semibold text-emerald-800">Payment Processed!</div>
              <div className="text-sm text-emerald-700">
                ₹{Math.round(data.payouts[0].amount)} credited due to <span className="font-medium capitalize">{data.payouts[0].trigger_type?.replaceAll('_', ' ')}</span> disruption
              </div>
              <div className="text-xs text-emerald-600 mt-1 bg-emerald-100 px-2 py-1 rounded inline-block">
                ✅ Instant payout processed successfully
              </div>
            </div>
          </div>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Live Claim Timeline</div>
            <Button variant="secondary" className="px-3 py-1.5" onClick={load}>
              Refresh
            </Button>
          </div>
          <div className="mt-3 rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-700">
            <div className="font-medium mb-1">💡 How payouts work:</div>
            <div>Payout = Lost Hours × Hourly Earnings × Coverage Ratio</div>
            <div className="text-indigo-600 mt-1">Example: 5h × ₹100 × 80% = ₹400</div>
          </div>
          <div className="mt-3 grid gap-3 text-sm">
            {data.claims.length ? (
              data.claims.slice(0, 8).map((c) => {
                const baseT = new Date(c.created_at).getTime();
                const fmter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                const triggerTime = fmter.format(new Date(baseT - 60000));
                const claimTime = fmter.format(new Date(baseT));
                const fraudTime = fmter.format(new Date(baseT + 30000));
                const payoutTime = c.status === 'approved' ? fmter.format(new Date(baseT + 90000)) : 'Pending';

                let threshText = '';
                if (c.source_value) {
                  if (c.source_value.rainfall_mm_6h) threshText = `Threshold crossed: ${c.source_value.rainfall_mm_6h} mm rainfall`;
                  else if (c.source_value.temperature_c) threshText = `Threshold crossed: ${c.source_value.temperature_c} °C`;
                  else if (c.source_value.aqi) threshText = `Threshold crossed: ${c.source_value.aqi} AQI`;
                  else if (c.source_value.flood_alert) threshText = `Threshold crossed: Flood Alert Active`;
                  else if (c.source_value.zone_closed) threshText = `Threshold crossed: Zone Closure Mandatory`;
                  else if (c.source_value.consensus_reports) threshText = `Threshold crossed: ${c.source_value.consensus_reports} verified worker reports`;
                }

                return (
                <div key={c.id} className="rounded-xl bg-slate-50 border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="font-bold text-slate-800 uppercase tracking-widest text-[10px] bg-slate-200 px-2 py-1 rounded">
                      Event: {c.trigger_type.replaceAll('_', ' ')}
                    </div>
                    <div className="flex gap-2">
                       {c.status === 'approved' && <Badge tone="emerald">AI Auto-Approved</Badge>}
                       {c.status === 'review' && <Badge tone="amber">Under Review</Badge>}
                       {c.status === 'rejected' && <Badge tone="rose">Flagged</Badge>}
                    </div>
                  </div>
                  
                  <div className="mb-4 text-xs font-semibold text-slate-700 bg-white border border-slate-100 p-2 rounded">
                    This payout was triggered due to <span className="text-indigo-600 capitalize">{c.trigger_type.replaceAll('_', ' ')}</span> in {data.worker.primary_zone}.
                    {threshText && <p className="mt-1 font-bold text-rose-700 opacity-90">{threshText}</p>}
                    <p className="mt-1 font-normal opacity-80">Reason: Lost {c.lost_hours} hours of active work time.</p>
                  </div>
                  
                  <div className="relative mb-3 border-l-2 border-indigo-100 ml-2 pl-4 py-1 space-y-3 text-xs text-slate-600">
                    <div className="flex items-center justify-between relative">
                       <span className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-indigo-400 ring-4 ring-indigo-50"></span>
                       <span><strong className="text-slate-800 font-semibold">Trigger detected:</strong> Environmental API alert</span>
                       <span className="font-medium text-slate-400">{triggerTime}</span>
                    </div>
                    <div className="flex items-center justify-between relative">
                       <span className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-indigo-400 ring-4 ring-indigo-50"></span>
                       <span><strong className="text-slate-800 font-semibold">Claim created:</strong> Income protection registered</span>
                       <span className="font-medium text-slate-400">{claimTime}</span>
                    </div>
                    <div className="flex items-center justify-between relative">
                       <span className={`absolute -left-[21px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ring-4 ${c.status === 'rejected' ? 'bg-rose-500 ring-rose-50' : 'bg-emerald-400 ring-emerald-50'}`}></span>
                       <span><strong className="text-slate-800 font-semibold">Fraud check:</strong> {c.status === 'rejected' ? 'Flagged anomaly' : 'AI analysis passed'}</span>
                       <span className="font-medium text-slate-400">{fraudTime}</span>
                    </div>
                    {c.status === 'approved' && (
                    <div className="flex items-center justify-between relative">
                       <span className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                       <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">Payout issued: ₹{Math.round(c.payout_amount)}</span>
                       <span className="font-medium text-emerald-600">{payoutTime}</span>
                    </div>
                    )}
                  </div>
                  
                  {(c.status === 'review' || c.status === 'rejected') && c.fraud_reason && (
                    <div className="mt-2 text-[10px] font-medium bg-rose-50 text-rose-700 px-3 py-2 rounded-lg border border-rose-100 uppercase tracking-wide">
                      🛑 AI Decision: {c.fraud_reason}
                    </div>
                  )}
                  
                  {c.status === 'approved' && (
                    <div className="mt-2 text-[10px] font-medium bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-100">
                      ✅ Approved automatically based on low fraud risk score
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500 font-medium">
                    <Badge tone="indigo">AI Target Score: {c.fraud_score}/100</Badge>
                    <Badge tone="slate">GPS Trace: {Math.round((c.gps_match_score || 1) * 100)}% Match</Badge>
                  </div>
                </div>
              )})
            ) : data.active_policy ? (
              <div className="text-slate-600 bg-slate-50 p-6 rounded-xl text-center border border-slate-100 flex flex-col items-center justify-center min-h-[220px]">
                <div className="text-3xl mb-3">📡</div>
                <div className="font-semibold text-slate-800 text-base mb-1">Policy active</div>
                <div className="mb-6 max-w-sm text-sm">Waiting for parametric disruption events (like Heavy Rain or Extreme Heat) in your zone...</div>
                
                <Button 
                  variant="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 font-medium px-5 py-2"
                  disabled={loadingDemo}
                  onClick={async () => {
                    try {
                      setLoadingDemo(true);
                      await api('/triggers/mock', {
                        method: 'POST',
                        body: {
                          trigger_type: 'heavy_rain',
                          city: data.worker.city,
                          zone: data.worker.primary_zone,
                          source_type: 'mock',
                          source_value: { rainfall_mm_6h: 75.0 }, // enough to trigger claims
                          severity: 4
                        }
                      });
                      await load();
                    } catch (e: any) {
                      alert(e?.message ?? 'Failed to simulate trigger');
                    } finally {
                      setLoadingDemo(false);
                    }
                  }}
                >
                  {loadingDemo ? 'Simulating...' : 'Simulate Demo Disruption'}
                </Button>
                <div className="text-[10px] text-slate-400 mt-2 uppercase tracking-wide font-semibold">Hackathon Demo Tool</div>
              </div>
            ) : (
              <div className="text-slate-600">No active policy claims.</div>
            )}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold">Linked Recent Payouts</div>
          <p className="text-xs text-slate-500 mt-1 mb-3">Track exact payout math directly linking compensation to active disruption events.</p>
          <div className="grid gap-3 text-sm">
            {data.payouts.length ? (
              data.payouts.slice(0, 8).map((p: any) => (
                <div key={p.id} className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm hover:border-indigo-200 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-bold text-lg text-emerald-600">₹{Math.round(p.amount)}</div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{p.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-700 capitalize">{p.trigger_type?.replaceAll('_', ' ')}</div>
                      <div className="text-[11px] text-slate-400">Ref: {p.ref}</div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600">
                    <span className="font-semibold block mb-1">Calculation Reason:</span>
                    Lost <span className="font-bold text-slate-800">{p.lost_hours} hours</span> due to extreme {p.trigger_type?.replaceAll('_', ' ')} → safely compensated ₹{Math.round(p.amount)}.
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-600 p-4 bg-slate-50 rounded text-center">No payouts yet.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

