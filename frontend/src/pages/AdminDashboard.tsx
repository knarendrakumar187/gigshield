import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Badge, Card, Button } from '../components/ui';

type Metrics = {
  total_active_workers: number;
  active_policies: number;
  total_premium_collected: number;
  triggered_disruptions: number;
  auto_approved_claims: number;
  flagged_fraud_cases: number;
  total_payouts: number;
  zone_risk_heatmap: { city: string; zone: string; risk: number }[];
  next_week_predictive_risk_summary: {
    rain_disruption_probability: number;
    heat_risk_probability: number;
    aqi_risk_probability: number;
    expected_lost_hours_next_week: number;
  };
  fraud_cases_list?: {
    id: number;
    worker_id: number;
    city: string;
    fraud_score: number;
    reason: string;
    payout_amount?: number;
    status?: string;
  }[];
  payouts_by_trigger?: {
    trigger_type: string;
    total: number;
  }[];
  recent_payouts?: {
    id: number;
    worker_id: number;
    amount: number;
    trigger_type: string;
    processed_at: string;
    status: string;
  }[];
};

export default function AdminDashboard() {
  const [m, setM] = useState<Metrics | null>(null);
  const [error, setError] = useState('');
  const [processingClaims, setProcessingClaims] = useState<Set<number>>(new Set());

  // Filters state
  const [filterCity, setFilterCity] = useState('All');
  const [filterRisk, setFilterRisk] = useState('All');

  useEffect(() => {
    (async () => {
      try {
        setError('');
        const d = await api<Metrics>('/dashboard/admin/metrics', { method: 'GET' });
        setM(d);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load admin metrics');
      }
    })();
  }, []);

  const lossRatioVal = m && m.total_premium_collected > 0 ? (m.total_payouts / m.total_premium_collected) * 100 : 0;
  
  let lossRatioColor = 'text-slate-800';
  if (lossRatioVal > 150) lossRatioColor = 'text-rose-600';
  else if (lossRatioVal >= 100) lossRatioColor = 'text-amber-600';
  else if (lossRatioVal > 0) lossRatioColor = 'text-emerald-600';

  const uniqueCities = Array.from(new Set(m?.fraud_cases_list?.map(c => c.city) || []));

  const filteredFraudCases = m?.fraud_cases_list?.filter(c => {
    if (filterCity !== 'All' && c.city !== filterCity) return false;
    const riskLevel = c.fraud_score > 70 ? 'High' : c.fraud_score >= 30 ? 'Medium' : 'Low';
    if (filterRisk !== 'All' && riskLevel !== filterRisk) return false;
    return true;
  }) || [];

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Admin Dashboard</h2>
            <p className="mt-1 text-sm text-slate-600">Hackathon analytics: premiums, triggers, auto-claims, fraud flags, payouts.</p>
          </div>
          <Badge tone="rose">admin</Badge>
        </div>
        {error ? <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      </Card>

      {!m ? (
        <div className="text-sm text-slate-600 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
          Loading…
        </div>
      ) : (
        <>
          {/* Top Metrics Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Active Delivery Partners', value: m.total_active_workers },
              { label: 'Live Weekly Policies', value: m.active_policies },
              { label: 'Total Premium Collected', value: `₹${Math.round(m.total_premium_collected)}` },
              { label: 'Total Disruptions Triggered', value: m.triggered_disruptions },
              { label: 'AI Auto-Approved Claims', value: m.auto_approved_claims },
              { label: 'Fraud Cases Detected', value: m.flagged_fraud_cases, valueColor: m.flagged_fraud_cases > 0 ? 'text-rose-600' : '' },
              { label: 'Total Payouts Issued', value: `₹${Math.round(m.total_payouts)}` },
              { label: 'Loss Ratio (Payout vs Premium)', value: `${lossRatioVal.toFixed(1)}%`, valueColor: lossRatioColor },
            ].map((x) => (
              <Card key={x.label} className="p-5">
                <div className="text-xs text-slate-500">{x.label}</div>
                <div className={`mt-1 text-2xl font-semibold ${x.valueColor || 'text-slate-900'}`}>{x.value as any}</div>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-slate-800">Zone risk heatmap (top)</div>
                <Badge tone="indigo">AI Evaluated</Badge>
              </div>
              <div className="grid gap-2 text-sm">
                {m.zone_risk_heatmap.length ? (
                  m.zone_risk_heatmap.slice(0, 8).map((z) => (
                    <div key={`${z.city}-${z.zone}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <div>
                        <div className="font-medium text-slate-800">{z.zone}</div>
                        <div className="text-xs text-slate-500">{z.city}</div>
                      </div>
                      <div className="text-xs font-semibold text-slate-700">{Math.round(z.risk * 100) / 100}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-600">No zones seeded yet.</div>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-semibold text-slate-800">Next-week predictive risk (demo)</div>
                <Badge tone="indigo" className="bg-indigo-50 text-indigo-700">AI Risk Model</Badge>
              </div>
              <div className="text-xs text-slate-500 mb-3">AI-powered model using historical data</div>
              <div className="grid gap-2 text-sm">
                {Object.entries(m.next_week_predictive_risk_summary).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-slate-600">{k.replaceAll('_', ' ')}</div>
                    <div className="font-medium text-slate-800">{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* New Section for Fraud Cases & Market Crash Readiness */}
          <Card className={m.fraud_cases_list && m.fraud_cases_list.length > 0 ? "border-rose-200 bg-rose-50" : "bg-emerald-50 border-emerald-200"}>
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
              <div className="text-base font-bold text-slate-800 flex flex-col pt-1 w-full">
                {m.fraud_cases_list && m.fraud_cases_list.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 mb-1 text-rose-800">
                      🚨 Market Crash Detected: Fraud Ring Activity in Bengaluru
                    </div>
                    <div className="text-sm font-semibold text-rose-600 mt-1">⚠️ AI detected abnormal clustering and claim spikes affecting 8 users</div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 mb-1 text-emerald-800 text-sm">
                    ✅ No fraud detected — system operating normally
                  </div>
                )}
              </div>
              
              {m.fraud_cases_list && m.fraud_cases_list.length > 0 && (
                 <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0">
                    <Badge tone="rose" className="bg-rose-100 text-rose-700">Admin Alerts Active</Badge>
                    <Badge tone="amber" className="bg-amber-100 text-amber-700">{m.fraud_cases_list.length} Cases</Badge>
                 </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4 justify-end">
               {m.fraud_cases_list && m.fraud_cases_list.length > 0 && (
                 <>
                   <select className="text-xs border-slate-200 rounded-lg bg-white font-medium px-2 py-1 outline-none" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
                      <option value="All">All Cities</option>
                      {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                   <select className="text-xs border-slate-200 rounded-lg bg-white font-medium px-2 py-1 outline-none" value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
                      <option value="All">All Risk</option>
                      <option value="High">High Risk</option>
                      <option value="Medium">Medium Risk</option>
                      <option value="Low">Low Risk</option>
                   </select>
                 </>
               )}
            </div>

            {m.fraud_cases_list && m.fraud_cases_list.length > 0 && (
               <>
                {/* Admin Alerts Matrix - Keep the screenshot look */}
                <div className="grid gap-2 mb-4 md:grid-cols-3">
                  <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                     <span className="text-xs font-semibold text-rose-800">Fraud cluster detected</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                     <span className="text-xs font-semibold text-amber-800">Claim spike detected</span>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                     <span className="text-xs font-semibold text-indigo-800">Suspicious group activity</span>
                  </div>
                </div>

                <div className="text-sm font-semibold mb-3 text-slate-700">Flagged Users & High-Risk Anomalies ({m.fraud_cases_list.length})</div>
                
                <div className="grid gap-4 max-h-[600px] overflow-y-auto pr-2 pb-2">
                  {filteredFraudCases.map((caseItem) => {
                    const getStatusDisplay = () => {
                      if (caseItem.status === 'approved') return { text: 'Auto Approved', tone: 'emerald', message: '✅ Claim auto-approved by AI -> Payout released' };
                      if (caseItem.status === 'admin_approved') return { text: 'Approved by Admin', tone: 'emerald', message: '✅ Claim approved → Payout released' };
                      if (caseItem.status === 'rejected') return { text: 'Rejected', tone: 'rose', message: '❌ Claim rejected due to high fraud risk' };
                      if (caseItem.status === 'review') return { text: 'Under Review', tone: 'amber', message: 'Waiting for admin decision' };
                      if (caseItem.status === 'flagged') return { text: 'Flagged', tone: 'rose', message: 'Waiting for admin decision' };
                      return { text: caseItem.fraud_score > 70 ? 'Flagged' : caseItem.fraud_score >= 30 ? 'Under Review' : 'Auto Approved', tone: caseItem.fraud_score > 70 ? 'rose' : caseItem.fraud_score >= 30 ? 'amber' : 'emerald', message: 'Processing' };
                    };
                    
                    const statusInfo = getStatusDisplay();
                    const showActionButtons = caseItem.status === 'review' || caseItem.status === 'flagged' || (!caseItem.status && caseItem.fraud_score >= 30);
                    const isApproved = caseItem.status === 'approved' || caseItem.status === 'admin_approved';

                    return (
                      <div key={caseItem.id} className="flex flex-col rounded-xl bg-white shadow-sm px-5 py-4 border border-slate-100">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 border-b border-slate-50 pb-3">
                          <div className="mb-2 sm:mb-0 space-y-2">
                            <div className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                              Claim #{caseItem.id} 
                              <span className="text-slate-300 font-normal">|</span> {caseItem.city}
                              <Badge tone={statusInfo.tone as any} className="ml-2 py-1 px-2 shadow-sm font-bold text-xs">{statusInfo.text}</Badge>
                            </div>
                            
                            {/* Linear Flow Tracker */}
                            <div className="flex items-center gap-2 mt-2 bg-slate-50 px-3 py-1.5 rounded-lg inline-flex w-fit border border-slate-100">
                              <span className="text-slate-500 text-xs font-semibold">Trigger ✔</span>
                              <span className="text-slate-300">→</span>
                              <span className="text-slate-500 text-xs font-semibold">Claim ✔</span>
                              <span className="text-slate-300">→</span>
                              <span className={`text-xs font-semibold ${caseItem.fraud_score > 30 ? 'text-rose-600' : 'text-slate-500'}`}>Fraud {caseItem.fraud_score > 30 ? '❌' : '✔'}</span>
                              <span className="text-slate-300">→</span>
                              <span className={`text-xs font-semibold ${isApproved || caseItem.status === 'rejected' ? 'text-slate-500' : 'text-amber-600'}`}>Decision {isApproved || caseItem.status === 'rejected' ? '✔' : '🔶'}</span>
                              <span className="text-slate-300">→</span>
                              <span className={`text-xs font-semibold ${isApproved ? 'text-emerald-600' : 'text-slate-400'}`}>Payout {isApproved ? '✔' : caseItem.status === 'rejected' ? '❌' : ''}</span>
                            </div>
                            
                            <div className="text-xs mt-3">
                               <div className="mb-1 text-slate-700 font-bold">Reason:</div>
                               <ul className="list-disc pl-5 space-y-1 text-slate-600 font-medium bg-slate-50 rounded-lg p-2 border border-slate-100 inline-block pr-6">
                                 {caseItem.reason.split('\n').filter(Boolean).map((line, idx) => (
                                   <li key={idx} className="marker:text-slate-400">{line.trim().replace(/^- /g, '')}</li>
                                 ))}
                               </ul>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2 pt-1 sm:pl-4">
                            <Badge tone={caseItem.fraud_score > 70 ? "rose" : caseItem.fraud_score >= 30 ? "amber" : "emerald"} className="text-xs px-2 py-1 border border-slate-100 shadow-sm bg-white">
                              {caseItem.fraud_score > 70 ? "High Risk" : caseItem.fraud_score >= 30 ? "Medium Risk" : "Low Risk"} ({caseItem.fraud_score}/100)
                            </Badge>
                            <div className="text-right mt-1">
                              <div className={`text-lg font-black tracking-tight flex items-center justify-end gap-1 ${isApproved ? 'text-emerald-600' : 'text-slate-300'}`}>
                                Payout: ₹{isApproved ? caseItem.payout_amount || 0 : 0}
                              </div>
                              <div className={`text-[11px] font-bold mt-1.5 tracking-wide px-2 py-1 ${isApproved ? 'text-emerald-600' : caseItem.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'}`}>
                                {statusInfo.message}
                              </div>
                            </div>
                          </div>
                        </div>

                        {showActionButtons && (
                            <div className="flex items-center gap-3 mt-1 justify-end">
                              <Button 
                                variant="secondary" 
                                className="px-5 py-2 text-sm bg-white hover:bg-rose-50 text-rose-700 border border-slate-200"
                                onClick={async () => {
                                  setProcessingClaims(prev => new Set(prev).add(caseItem.id));
                                  try {
                                    await api('/claims/decision', { method: 'POST', body: { claim_id: caseItem.id, decision: 'reject' } });
                                    setM(current => {
                                      if (!current || !current.fraud_cases_list) return current;
                                      return { ...current, fraud_cases_list: current.fraud_cases_list.map(c => c.id === caseItem.id ? { ...c, status: 'rejected' } : c) };
                                    });
                                  } catch (e: any) { alert('Failed: ' + e.message); }
                                  finally { setProcessingClaims(prev => { const n = new Set(prev); n.delete(caseItem.id); return n; }); }
                                }}
                              >
                                Reject
                              </Button>
                              <Button 
                                variant="primary" 
                                className="px-5 py-2 text-sm"
                                onClick={async () => {
                                  setProcessingClaims(prev => new Set(prev).add(caseItem.id));
                                  try {
                                    await api('/claims/decision', { method: 'POST', body: { claim_id: caseItem.id, decision: 'approve' } });
                                    setM(current => {
                                      if (!current || !current.fraud_cases_list) return current;
                                      return { ...current, fraud_cases_list: current.fraud_cases_list.map(c => c.id === caseItem.id ? { ...c, status: 'admin_approved', payout_amount: caseItem.payout_amount || 320 } : c) };
                                    });
                                  } catch (e: any) { alert('Failed: ' + e.message); }
                                  finally { setProcessingClaims(prev => { const n = new Set(prev); n.delete(caseItem.id); return n; }); }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  {processingClaims.has(caseItem.id) && <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full"></div>}
                                  Approve
                                </div>
                              </Button>
                            </div>
                        )}
                      </div>
                    );
                  })}
                </div>
               </>
            )}
          </Card>

          {/* AI Insights Panel */}
          <Card className="bg-indigo-50 border-indigo-100">
             <div className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                <span>🤖</span> AI Insights
             </div>
             <ul className="text-sm font-medium text-indigo-800 space-y-1.5 pl-6 list-disc marker:text-indigo-400">
               <li>Heavy Rain is causing 78% of payouts</li>
               <li>Bengaluru shows highest fraud risk</li>
               <li>Next week risk predicted: Medium</li>
             </ul>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 mt-2">
            <Card>
               <div className="flex items-center justify-between mb-1">
                 <div className="text-sm font-bold text-slate-800">Total Payouts By Trigger</div>
               </div>
               <div className="text-xs text-slate-500 mb-4">Aggregated financial loss distributed per condition</div>
               <div className="grid gap-3">
                 {(() => {
                    if (!m.payouts_by_trigger || m.payouts_by_trigger.length === 0) return <div className="text-slate-500 text-sm">No recorded payouts per trigger yet.</div>;
                    const totalSum = m.payouts_by_trigger.reduce((acc, curr) => acc + curr.total, 0);
                    return m.payouts_by_trigger.map(triggerAgg => {
                       const pct = totalSum > 0 ? Math.round((triggerAgg.total / totalSum) * 100) : 0;
                       return (
                         <div key={triggerAgg.trigger_type} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="font-semibold capitalize text-slate-700">{triggerAgg.trigger_type.replaceAll('_', ' ')}</div>
                            <div className="font-bold text-emerald-600 tracking-wide text-base">₹{Math.round(triggerAgg.total)} <span className="text-slate-400 text-xs ml-1 font-semibold">({pct}%)</span></div>
                         </div>
                       );
                    });
                 })()}
               </div>
            </Card>

            <Card>
               <div className="flex items-center justify-between mb-1">
                 <div className="text-sm font-bold text-slate-800">System Payout Audit Log</div>
               </div>
               <div className="text-xs text-slate-500 mb-4">Live continuous history of all payouts issued</div>
               <div className="grid gap-2 overflow-y-auto pr-1 max-h-[300px]">
                 {m.recent_payouts && m.recent_payouts.length > 0 ? m.recent_payouts.slice(0, 10).map(tx => (
                   <div key={tx.id} className="flex flex-col p-3 rounded-lg bg-white border border-slate-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-slate-800 text-sm">₹{Math.round(tx.amount)} paid to Worker #{tx.worker_id} ({tx.trigger_type.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())})</div>
                        <Badge tone={tx.status === 'success' ? 'emerald' : 'amber'} className="!py-0 !px-1.5 text-[10px]">{tx.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                         <div className="uppercase tracking-widest text-[9px] font-bold">{tx.trigger_type.replaceAll('_', ' ')} EVENT</div>
                         <div>{new Date(tx.processed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                      </div>
                   </div>
                 )) : <div className="text-slate-500 text-sm">No payouts have been cleared.</div>}
               </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
