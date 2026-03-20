import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Badge, Button, Card, Alert } from '../components/ui';

type PolicyHistory = {
  id: number;
  tier: string;
  weekly_premium: number;
  max_covered_hours: number;
  coverage_ratio: number;
  active_from: string;
  active_to: string;
  status: 'active' | 'expired' | 'cancelled';
  total_payouts: number;
  claims_count: number;
  created_at: string;
};

export default function PolicyHistory() {
  const [policies, setPolicies] = useState<PolicyHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    async function loadPolicyHistory() {
      try {
        setLoading(true);
        setError('');
        const data = await api<PolicyHistory[]>('/policy/history', { method: 'GET' });
        setPolicies(data);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load policy history');
      } finally {
        setLoading(false);
      }
    }

    loadPolicyHistory();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysRemaining = (activeTo: string) => {
    const now = new Date();
    const endDate = new Date(activeTo);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
            <span className="text-sm text-slate-600">Loading policy history...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4">
        <Alert tone="error">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Policy History</h2>
            <p className="mt-1 text-sm text-slate-600">
              View your previous and current insurance policies with detailed breakdown
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={showComparison ? "primary" : "secondary"} 
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
            >
              {showComparison ? "Hide Comparison" : "Compare Policies"}
            </Button>
            <Badge tone="indigo">{policies.length} Policies</Badge>
          </div>
        </div>
      </Card>

      {policies.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No policies found</h3>
            <p className="text-sm text-slate-600 mb-4">
              You haven't purchased any insurance policies yet.
            </p>
            <Button variant="primary" onClick={() => window.location.href = '/policy/quote'}>
              Get Your First Policy
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {policies.map((policy) => {
            const daysRemaining = getDaysRemaining(policy.active_to);
            const isActive = policy.status === 'active' && daysRemaining > 0;
            
            return (
              <Card key={policy.id} className={`relative overflow-hidden ${isActive ? 'ring-2 ring-indigo-100' : ''}`}>
                {isActive && (
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs px-3 py-1 rounded-bl-lg">
                    ACTIVE
                  </div>
                )}
                
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Policy Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold capitalize">{policy.tier} Plan</h3>
                      <Badge 
                        tone={
                          isActive ? 'emerald' : 
                          policy.status === 'expired' ? 'slate' : 'rose'
                        }
                      >
                        {policy.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-slate-600">Weekly Premium</div>
                        <div className="text-2xl font-semibold">₹{Math.round(parseFloat(policy.weekly_premium?.toString() || '0'))} / week</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-slate-600">Coverage Ratio</div>
                        <div className="font-semibold text-slate-900">{Math.round(policy.coverage_ratio * 100)}%</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-slate-600">Max Covered Hours</div>
                        <div className="font-semibold text-slate-900">{policy.max_covered_hours}</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-slate-600">Claims Filed</div>
                        <div className="font-semibold text-slate-900">{policy.claims_count}</div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline and Performance */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-700 mb-2">Policy Period</div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">From:</span>
                          <span className="font-medium">{formatDate(policy.active_from)}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-slate-600">To:</span>
                          <span className="font-medium">{formatDate(policy.active_to)}</span>
                        </div>
                        {isActive && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Days remaining:</span>
                              <span className={`font-semibold ${daysRemaining <= 2 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {daysRemaining} days
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-slate-700 mb-2">Performance Summary</div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Total Payouts:</span>
                          <span className="font-semibold text-emerald-600">₹{Math.round(parseFloat(policy.total_payouts?.toString() || '0'))}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-slate-600">ROI:</span>
                          <span className={`font-semibold ${parseFloat(policy.total_payouts?.toString() || '0') > parseFloat(policy.weekly_premium?.toString() || '0') ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {Math.round((parseFloat(policy.total_payouts?.toString() || '0') / parseFloat(policy.weekly_premium?.toString() || '1')) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  {isActive ? (
                    <Button variant="primary" size="sm" onClick={() => window.location.href = '/policy/quote'}>
                      Upgrade Plan
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => window.location.href = '/policy/quote'}>
                      Get New Policy
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary Statistics */}
      {policies.length > 0 && (
        <Card>
          <div className="text-sm font-semibold text-slate-700 mb-4">Policy Summary</div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                ₹{Math.round(policies.reduce((sum, p) => sum + (parseFloat(p.weekly_premium.toString()) || 0), 0))}
              </div>
              <div className="text-xs text-slate-600">Total Premiums Paid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                ₹{Math.round(policies.reduce((sum, p) => sum + (parseFloat(p.total_payouts?.toString() || '0') || 0), 0))}
              </div>
              <div className="text-xs text-slate-600">Total Payouts Received</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {policies.reduce((sum, p) => sum + (parseInt(p.claims_count?.toString() || '0') || 0), 0)}
              </div>
              <div className="text-xs text-slate-600">Total Claims Filed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {(() => {
                  const totalPremiums = policies.reduce((sum, p) => sum + (parseFloat(p.weekly_premium?.toString() || '0') || 0), 0);
                  const totalPayouts = policies.reduce((sum, p) => sum + (parseFloat(p.total_payouts?.toString() || '0') || 0), 0);
                  return totalPremiums > 0 ? Math.round((totalPayouts / totalPremiums) * 100) : 0;
                })()}%
              </div>
              <div className="text-xs text-slate-600">Average ROI</div>
            </div>
          </div>
        </Card>
      )}

      {/* Comparison View */}
      {showComparison && policies.length > 0 && (
        <Card>
          <div className="text-sm font-semibold text-slate-700 mb-4">Policy Comparison</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3">Tier</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Premium</th>
                  <th className="text-left py-2 px-3">Coverage</th>
                  <th className="text-left py-2 px-3">Claims</th>
                  <th className="text-left py-2 px-3">Payouts</th>
                  <th className="text-left py-2 px-3">ROI</th>
                  <th className="text-left py-2 px-3">Period</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => {
                  const premium = parseFloat(policy.weekly_premium?.toString() || '0');
                  const payout = parseFloat(policy.total_payouts?.toString() || '0');
                  const roi = premium > 0 ? Math.round((payout / premium) * 100) : 0;
                  return (
                    <tr key={policy.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 capitalize font-medium">{policy.tier}</td>
                      <td className="py-2 px-3">
                        <Badge 
                          tone={
                            policy.status === 'active' ? 'emerald' : 
                            policy.status === 'expired' ? 'slate' : 'rose'
                          }
                          className="text-xs"
                        >
                          {policy.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">₹{Math.round(premium)}</td>
                      <td className="py-2 px-3">{Math.round(policy.coverage_ratio * 100)}%</td>
                      <td className="py-2 px-3">{policy.claims_count || 0}</td>
                      <td className="py-2 px-3 text-emerald-600 font-medium">₹{Math.round(payout)}</td>
                      <td className="py-2 px-3">
                        <span className={`font-medium ${roi > 100 ? 'text-emerald-600' : roi > 50 ? 'text-indigo-600' : 'text-slate-600'}`}>
                          {roi}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-600">
                        {formatDate(policy.active_from).split(',')[0]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
