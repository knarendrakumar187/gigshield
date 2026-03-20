import { useState, useEffect } from 'react';
import { Badge, Button, Card } from '../components/ui';
import { api } from '../services/api';

type TriggerEvent = {
  id: number;
  trigger_type: string;
  city: string;
  zone: string;
  source_value: any;
  event_start: string;
  event_end: string;
  severity: number;
};

type LocationData = {
  city: string;
  zones: { zone: string; worker_count: number }[];
};

export default function TriggerSimulator() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoadingLocs, setIsLoadingLocs] = useState(true);
  
  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  const [triggerType, setTriggerType] = useState('heavy_rain');
  const [severity, setSeverity] = useState(3);
  
  const [rainfall, setRainfall] = useState(72);
  const [temperature, setTemperature] = useState(43);
  const [aqi, setAqi] = useState(380);
  const [floodAlert, setFloodAlert] = useState(true);
  const [zoneClosed, setZoneClosed] = useState(true);

  const [event, setEvent] = useState<TriggerEvent | null>(null);
  const [evalResp, setEvalResp] = useState<any>(null);
  const [error, setError] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    api<{locations: LocationData[]}>('/triggers/locations')
      .then(data => {
        setLocations(data.locations);
        if (data.locations.length > 0) {
          setCity(data.locations[0].city);
          if (data.locations[0].zones.length > 0) {
            setZone(data.locations[0].zones[0].zone);
          }
        }
      })
      .catch(err => setError(`Failed to load locations: ${err.message}`))
      .finally(() => setIsLoadingLocs(false));
  }, []);

  useEffect(() => {
    const cityData = locations.find(l => l.city === city);
    if (cityData && cityData.zones.length > 0) {
       const currentZoneExists = cityData.zones.find(z => z.zone === zone);
       if (!currentZoneExists) {
          setZone(cityData.zones[0].zone);
       }
    } else {
       setZone('');
    }
  }, [city, locations]);

  const activeCityData = locations.find(l => l.city === city);
  const activeZoneData = activeCityData?.zones.find(z => z.zone === zone);
  const workerCount = activeZoneData?.worker_count || 0;

  useEffect(() => {
    if (activeZoneData && zone) {
      const zoneName = zone.toLowerCase();
      let suggestedTrigger = 'heavy_rain';
      if (zoneName.includes('industrial') || zoneName.includes('tech') || zoneName.includes('sez')) suggestedTrigger = 'extreme_heat';
      else if (zoneName.includes('flood') || zoneName.includes('river') || zoneName.includes('lake')) suggestedTrigger = 'flood_alert';
      else if (zoneName.includes('polluted') || zoneName.includes('traffic') || zoneName.includes('jntu')) suggestedTrigger = 'severe_aqi';
      
      setTriggerType(suggestedTrigger);
    }
  }, [zone, activeZoneData]);

  const activeSourceValue = {
    ...(triggerType === 'heavy_rain' ? { rainfall_mm_6h: rainfall } : {}),
    ...(triggerType === 'extreme_heat' ? { temperature_c: temperature } : {}),
    ...(triggerType === 'severe_aqi' ? { aqi: aqi } : {}),
    ...(triggerType === 'flood_alert' ? { flood_alert: floodAlert } : {}),
    ...(triggerType === 'zone_closure' ? { zone_closed: zoneClosed } : {}),
  }

  function getThresholdStatus() {
    if (triggerType === 'heavy_rain') {
      const met = rainfall > 50;
      return { met, text: `Threshold (> 50mm) ${met ? 'exceeded → Trigger valid' : 'not met → Trigger invalid'}` };
    }
    if (triggerType === 'extreme_heat') {
      const met = temperature > 42;
      return { met, text: `Threshold (> 42°C) ${met ? 'exceeded → Trigger valid' : 'not met → Trigger invalid'}` };
    }
    if (triggerType === 'severe_aqi') {
      const met = aqi > 350;
      return { met, text: `Threshold (> 350) ${met ? 'exceeded → Trigger valid' : 'not met → Trigger invalid'}` };
    }
    if (triggerType === 'flood_alert') {
      return { met: floodAlert, text: `Threshold ${floodAlert ? 'met → Trigger valid' : 'not met → Trigger invalid'}` };
    }
    if (triggerType === 'zone_closure') {
      return { met: zoneClosed, text: `Threshold ${zoneClosed ? 'met → Trigger valid' : 'not met → Trigger invalid'}` };
    }
    return null;
  }

  const thresholdStatus = getThresholdStatus();
  
  const handleAdminOverride = async (claimId: number, decision: 'approve' | 'reject') => {
    try {
      await api('/claims/decision', {
        method: 'POST',
        body: { claim_id: claimId, decision }
      });
      // Mutate local state visually
      setEvalResp((prev: any) => ({
        ...prev,
        claim_details: prev.claim_details.map((c: any) => 
          c.claim_id === claimId 
            ? { ...c, fraud_decision: decision, status: decision === 'approve' ? 'APPROVED' : 'REJECTED' } 
            : c
        ),
        auto_approved_count: decision === 'approve' ? prev.auto_approved_count + 1 : prev.auto_approved_count,
        flagged_count: prev.flagged_count - 1
      }));
    } catch (e: any) {
      alert(`Override failed: ${e.message}`);
    }
  };

  const fraudClusterDetected = evalResp && evalResp.flagged_count > 0;

  return (
    <div className="grid gap-6 max-w-6xl mx-auto pb-10">
      <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Parametric Execution Engine</h2>
            <p className="mt-1 text-sm text-slate-300">Intelligent Trigger Simulator & Analytics Pipeline</p>
          </div>
          <Badge tone="indigo" className="px-3 py-1 font-bold">+ ADMIN SIMULATOR</Badge>
        </div>
      </Card>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Col: Setup */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card className="shadow-sm border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 border-b pb-3">1. Event Configuration</h3>
            
            <div className={`mb-5 p-3.5 border rounded-xl text-sm flex items-start gap-3 ${workerCount > 0 ? 'bg-indigo-50/50 border-indigo-100 text-indigo-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <span className="text-lg">🤖</span> 
              <div>
                <div className="font-bold tracking-tight">AI Suggested Trigger based on {workerCount > 0 ? 'real-time telemetry' : 'zone topography mapping'}</div>
                <div className={`${workerCount > 0 ? 'text-indigo-600/80' : 'text-slate-500'} font-medium text-xs mt-0.5`}>
                  {workerCount > 0 ? `Detecting ${workerCount} exposed policies in ${city} (${zone}).` : `No active workers detected, but AI generated a topographical risk profile for ${zone}.`}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Target City
                  <select className="rounded-lg border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20" value={city} onChange={(e) => setCity(e.target.value)}>
                    {locations.map(l => <option key={l.city} value={l.city}>{l.city}</option>)}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Target Zone
                  <select className="rounded-lg border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20" value={zone} onChange={(e) => setZone(e.target.value)}>
                    {activeCityData?.zones.map(z => <option key={z.zone} value={z.zone}>{z.zone}</option>)}
                  </select>
                </label>
              </div>

              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Disruption Type
                <select className="rounded-lg border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20" value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
                  <option value="heavy_rain">Heavy Rain</option>
                  <option value="flood_alert">Flood Alert</option>
                  <option value="extreme_heat">Extreme Heat</option>
                  <option value="severe_aqi">Severe AQI</option>
                  <option value="zone_closure">Zone Closure</option>
                </select>
              </label>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 grid gap-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dynamic Input Variables</div>
                
                {triggerType === 'heavy_rain' && (
                  <label className="flex items-center justify-between text-sm font-medium">
                    <span>Rainfall (mm in 6h)</span>
                    <input type="number" className="w-24 rounded-md border-slate-200 text-center" value={rainfall} onChange={e => setRainfall(Number(e.target.value))} />
                  </label>
                )}
                {triggerType === 'extreme_heat' && (
                  <label className="flex items-center justify-between text-sm font-medium">
                    <span>Temperature (°C)</span>
                    <input type="number" className="w-24 rounded-md border-slate-200 text-center" value={temperature} onChange={e => setTemperature(Number(e.target.value))} />
                  </label>
                )}
                {triggerType === 'severe_aqi' && (
                  <label className="flex items-center justify-between text-sm font-medium">
                    <span>Air Quality Index</span>
                    <input type="number" className="w-24 rounded-md border-slate-200 text-center" value={aqi} onChange={e => setAqi(Number(e.target.value))} />
                  </label>
                )}
                {triggerType === 'flood_alert' && (
                  <label className="flex items-center justify-between text-sm font-medium">
                    <span>Flood Alert Activated</span>
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600" checked={floodAlert} onChange={e => setFloodAlert(e.target.checked)} />
                  </label>
                )}
                {triggerType === 'zone_closure' && (
                  <label className="flex items-center justify-between text-sm font-medium">
                    <span>Zone Closed by Auth</span>
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600" checked={zoneClosed} onChange={e => setZoneClosed(e.target.checked)} />
                  </label>
                )}

                {thresholdStatus && (
                  <div className={`mt-2 p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 ${thresholdStatus.met ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                    <span className="text-base">{thresholdStatus.met ? '✓' : '✗'}</span>
                    {thresholdStatus.text}
                  </div>
                )}
              </div>
            </div>

            {error ? <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</div> : null}

            <Button
              className="w-full mt-6 py-3.5 text-sm font-bold shadow-lg shadow-indigo-500/20 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl transition-all"
              disabled={!city || !zone || isLoadingLocs || !thresholdStatus?.met || isSimulating}
              onClick={async () => {
                try {
                  setIsSimulating(true);
                  setError('');
                  setEvalResp(null);
                  const resp = await api<{event: TriggerEvent, evaluation: any}>('/triggers/mock', {
                    method: 'POST',
                    body: { trigger_type: triggerType, city, zone, severity, source_value: activeSourceValue },
                  });
                  setEvent(resp.event);
                  setEvalResp(resp.evaluation);
                } catch (e: any) {
                  setError(e?.message ?? 'Simulation failed');
                } finally {
                  setIsSimulating(false);
                }
              }}
            >
              {isSimulating ? 'Executing Pipeline...' : 'Run Simulation'}
            </Button>
            <p className="text-center text-[10px] text-slate-400 font-medium mt-3 uppercase tracking-wider">
              Disruption → Claim Gen → Fraud Scan → Payout
            </p>
          </Card>
        </div>

        {/* Right Col: Dashboard */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card className="shadow-sm border-slate-200">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6 border-b pb-3 flex items-center justify-between">
               <span>2. Execution Pipeline</span>
               {evalResp && (
                 <Badge tone={fraudClusterDetected ? 'rose' : 'emerald'}>
                   {fraudClusterDetected ? '⚠️ FRAUD CLUSTER DETECTED' : '✅ NO FRAUD DETECTED'}
                 </Badge>
               )}
             </h3>

             {/* Pipeline Viz */}
             <div className="relative flex items-center justify-between mb-8 overflow-x-auto pb-4">
               <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-100 rounded-full z-0"></div>
               {evalResp && <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 rounded-full z-0 animate-[pulse_2s_ease-in-out_1]"></div>}
               
               {['Trigger', 'Claim', 'Fraud', 'Payout'].map((step, i) => (
                 <div key={step} className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-colors duration-500 ${evalResp ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-slate-100 text-slate-400'}`}>
                     {i + 1}
                   </div>
                   <span className={`text-xs font-bold uppercase tracking-wider ${evalResp ? 'text-indigo-700' : 'text-slate-400'}`}>{step}</span>
                 </div>
               ))}
             </div>

             {/* Dashboard Metrics */}
             {evalResp ? (
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Affected Workers</div>
                   <div className="text-2xl font-black text-slate-800">{evalResp.affected_workers_count}</div>
                 </div>
                 <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                   <div className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider mb-1">Claims Created</div>
                   <div className="text-2xl font-black text-indigo-700">{evalResp.created_claim_ids?.length || 0}</div>
                 </div>
                 <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                   <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider mb-1">Auto-Approved</div>
                   <div className="text-2xl font-black text-emerald-700">{evalResp.auto_approved_count}</div>
                 </div>
                 <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                   <div className="text-[10px] uppercase font-bold text-amber-600 tracking-wider mb-1">Under Review</div>
                   <div className="text-2xl font-black text-amber-700">{evalResp.flagged_count}</div>
                 </div>
                 <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 sm:col-span-2">
                   <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Total Instant Payout</div>
                   <div className="text-2xl font-black text-emerald-400">₹{evalResp.total_payout_amount}</div>
                 </div>
               </div>
             ) : (
                <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <div className="text-slate-400 mb-1 font-medium">Awaiting Execution</div>
                  <div className="text-xs text-slate-500">Run simulation to view resulting claims and payouts.</div>
                </div>
             )}

             {/* Claim Breakdown */}
             {evalResp?.claim_details && evalResp.claim_details.length > 0 && (
               <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3 border-t pt-5">Claim Breakdown</h4>
                  <div className="space-y-3">
                    {evalResp.claim_details.map((c: any) => (
                      <div key={c.claim_id} className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="grid gap-0.5">
                          <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                            {c.worker_name}
                            <Badge tone={c.fraud_score > 60 ? 'rose' : c.fraud_score > 30 ? 'amber' : 'emerald'} className="text-[9px] px-1.5 py-0">Risk: {Math.round(c.fraud_score)}</Badge>
                          </div>
                          <div className={c.fraud_decision === 'approve' || c.status === 'APPROVED' ? 'text-emerald-600 font-medium text-xs' : 'text-amber-600 font-medium text-xs'}>
                            {c.fraud_decision === 'approve' || c.status === 'APPROVED' ? 'Payout Released' : 'Flagged for Review'}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Amount</div>
                            <div className="font-black text-slate-800">₹{c.payout > 0 ? c.payout : '0.00'}</div>
                          </div>
                          
                          {(c.fraud_decision === 'review' || c.fraud_decision === 'reject') && c.status !== 'APPROVED' && (
                            <div className="flex gap-2 border-l pl-3 ml-1">
                              <button 
                                onClick={() => handleAdminOverride(c.claim_id, 'approve')}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] rounded-lg border border-emerald-200 uppercase tracking-wider transition-colors"
                              >
                                Override & Approve
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
             )}
          </Card>
        </div>
      </div>
    </div>
  );
}
