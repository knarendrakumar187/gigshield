import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function PolicyQuote() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('standard');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  
  const [workerInfo, setWorkerInfo] = useState({ city: 'Bengaluru', zone: 'kotapet', hourly_rate: 85 });

  useEffect(() => {
    (async () => {
      try {
        const d = await api<any>('/dashboard/worker', { method: 'GET' });
        if (d && d.worker) {
          setWorkerInfo({ 
            city: d.worker.city, 
            zone: d.worker.primary_zone, 
            hourly_rate: d.worker.hourly_earnings || 85 
          });
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const tiers = {
    basic: { name: 'BASIC', weekly_premium: 31, coverage_ratio: 0.65, max_covered_hours: 5, ai_liability: 38 },
    standard: { name: 'STANDARD', weekly_premium: 34, coverage_ratio: 0.80, max_covered_hours: 8, ai_liability: 40 },
    plus: { name: 'PLUS', weekly_premium: 44, coverage_ratio: 0.90, max_covered_hours: 12, ai_liability: 42 }
  };

  const handleActivate = async () => {
    setBusy(true);
    setMessage('');
    
    try {
      await api('/policy/create', { method: 'POST', body: { tier: selected } });
      setMessage('Policy activated successfully!');
      setTimeout(() => navigate('/worker/dashboard', { state: { activated: true } }), 1000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to activate policy');
    } finally {
      setBusy(false);
    }
  };

  const selectedTierData = tiers[selected as keyof typeof tiers];

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4 space-y-4">
        
        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-6 md:p-8 border border-slate-100">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h1 className="text-2xl font-bold text-indigo-700 tracking-tight">Dynamic AI Quote</h1>
            <span className="bg-indigo-50 text-indigo-600 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-indigo-100">
              Generated for Gig Partner
            </span>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed max-w-3xl">
            Based on your zone, weather patterns, and work exposure in <span className="font-semibold text-slate-800">{workerInfo.zone}, {workerInfo.city}</span>, our AI has modeled your environmental risk logic for the upcoming week.
          </p>
        </div>

        {/* Pricing Tiers */}
        <div className="grid md:grid-cols-3 gap-4">
          {Object.entries(tiers).map(([tierKey, tier]) => {
            const isSelected = selected === tierKey;
            return (
              <div 
                key={tierKey}
                onClick={() => setSelected(tierKey)}
                className={`flex flex-col relative bg-white rounded-2xl p-6 cursor-pointer transition-all duration-300 border-2 ${
                  isSelected 
                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/10 ring-4 ring-indigo-50/50 scale-[1.02] z-10' 
                    : 'border-slate-100 hover:border-indigo-300 hover:shadow-md hover:-translate-y-1 hover:shadow-indigo-500/5'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <h3 className={`text-sm tracking-wider uppercase ${isSelected ? 'font-black text-indigo-600' : 'font-bold text-slate-500'}`}>{tier.name}</h3>
                  {tierKey === 'standard' && (
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm shadow-indigo-500/20 absolute top-5 right-5">
                      AI RECOMMENDATION
                    </span>
                  )}
                </div>
                
                <div className="mb-8 flex items-end gap-1">
                  <span className="text-4xl font-black text-slate-900 leading-none">₹{tier.weekly_premium}</span>
                  <span className="text-sm font-semibold text-slate-500 mb-1">/ week</span>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                    <span className="text-slate-500 font-medium">Max covered hours</span>
                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">{tier.max_covered_hours}h</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                    <span className="text-slate-500 font-medium">Income Coverage</span>
                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">{tier.coverage_ratio * 100}%</span>
                  </div>
                </div>

                <div className={`mt-auto flex justify-between items-center text-xs font-bold px-4 py-3 rounded-lg transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-500 border border-transparent'}`}>
                  <span>AI Liability Score</span>
                  <span>{tier.ai_liability} / 100</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Details Section */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Intelligence Box */}
          <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(6,81,237,0.08)] border border-slate-100 p-6 md:p-8 hover:shadow-[0_8px_30px_-4px_rgba(6,81,237,0.12)] transition-shadow duration-300">
            <h3 className="text-sm font-bold text-slate-900 tracking-wider uppercase mb-4 flex items-center gap-2">
              <span className="text-lg">🤖</span> PRICING INTELLIGENCE
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed font-medium">
              Your weekly premium is personalized based on your activity in <span className="font-bold text-indigo-600">{workerInfo.zone}</span>.
            </p>
            
            <div className="space-y-5">
              <div className="relative pl-5">
                <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-rose-400"></div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">High localized risk flagged</h4>
                <p className="text-xs font-medium text-slate-500 leading-relaxed">
                  Historical patterns indicate elevated climatic thresholds (heavy rain/AQI) around {workerInfo.city} this week.
                </p>
              </div>
              <div className="relative pl-5">
                <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-amber-400"></div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">Extended Work Exposure</h4>
                <p className="text-xs font-medium text-slate-500 leading-relaxed">
                  Averaging 45 on-road hours per week increases probability of disruption impact.
                </p>
              </div>
            </div>
          </div>

          {/* Checkout Box */}
          <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(6,81,237,0.08)] border border-slate-100 p-6 md:p-8 flex flex-col justify-between hover:shadow-[0_8px_30px_-4px_rgba(6,81,237,0.12)] transition-shadow duration-300">
            <div>
              <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-3">COVERED DISRUPTION TRIGGERS</h3>
              <div className="flex flex-wrap gap-2 mb-8">
                {['Heavy Rain', 'Flood Alert', 'Extreme Heat', 'Severe Aqi', 'Zone Closure'].map(t => (
                  <span key={t} className="bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-colors text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full cursor-default">
                    {t}
                  </span>
                ))}
              </div>
              
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-8">
                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">INSTANT PAYOUT FORMULA</div>
                <div className="text-xl text-indigo-700 flex flex-wrap gap-x-2 gap-y-1 items-baseline">
                  <span className="font-medium">Loss</span>
                  <span className="text-indigo-400">=</span>
                  <span className="font-bold">Hours</span>
                  <span className="text-indigo-400">×</span>
                  <span className="font-bold">₹{workerInfo.hourly_rate}/hr</span>
                  <span className="text-indigo-400">×</span>
                  <span className="font-bold">{selectedTierData.coverage_ratio}</span>
                </div>
              </div>
            </div>

            <div className="mt-auto flex flex-col items-end gap-3 w-full">
              <button 
                onClick={handleActivate}
                disabled={busy}
                className="w-full md:w-auto overflow-hidden relative bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-bold py-3.5 px-8 rounded-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 opacity-0 hover:opacity-100 transition-opacity"></div>
                <span className="relative z-10">{busy ? 'Processing...' : `Secure Income for ₹${selectedTierData.weekly_premium}`}</span>
              </button>
              
              <div className="flex items-center gap-2 w-full justify-end">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500">Policy starts immediately and covers next 7 days</span>
              </div>
              
              {message && (
                <div className={`mt-2 text-sm font-bold w-full text-center ${message.includes('success') ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
