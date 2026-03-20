import { Link } from 'react-router-dom';
import { Button, Card, Badge } from '../components/ui';

export default function Landing() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-sky-500 p-8 md:p-12 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <Badge tone="emerald">Live Demo</Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
            Weekly income protection for delivery riders
            <span className="block text-3xl md:text-4xl mt-2 text-indigo-100">
              Auto payouts on disruptions
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed max-w-3xl">
            GigShield is India's first parametric insurance platform for food delivery workers. 
            When heavy rain, floods, extreme heat, severe AQI, or zone closures hit your area, 
            claims are auto-created and payouts are processed instantly.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button 
              variant="primary" 
              size="lg"
              onClick={() => window.location.href = '/login'}
              className="!bg-white !text-indigo-700 hover:!bg-white/90 !border-white shadow-lg shadow-black/10 font-semibold"
            >
              Start Demo →
            </Button>
            <Button 
              variant="ghost" 
              size="lg"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white/10 !text-white hover:bg-white/15 border-white/30 shadow-lg shadow-black/10 font-semibold"
            >
              5-Minute Demo Flow
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { stat: '₹4800', label: 'Avg. Weekly Income', icon: '💰' },
          { stat: '48 hrs', label: 'Avg. Weekly Hours', icon: '⏰' },
          { stat: '5 Types', label: 'Disruption Coverage', icon: '🛡️' },
        ].map((item, index) => (
          <Card key={index} className="text-center hover:shadow-lg transition-all duration-300">
            <div className="text-3xl mb-2">{item.icon}</div>
            <div className="text-2xl font-bold text-slate-900">{item.stat}</div>
            <div className="text-sm text-slate-600 mt-1">{item.label}</div>
          </Card>
        ))}
      </div>

      {/* How It Works */}
      <div id="demo" className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">How GigShield Works</h2>
          <p className="text-slate-600">Simple 3-step process to protect your income</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { 
              step: '01', 
              title: 'Choose Weekly Plan', 
              body: 'Select Basic, Standard, or Plus coverage. Premiums adjust based on your zone, weather patterns, pollution levels, and exposure risk.',
              icon: '📋'
            },
            { 
              step: '02', 
              title: 'Parametric Triggers', 
              body: 'Automatic claim creation when rainfall, heat index, AQI, flood alerts, or zone closures exceed predefined thresholds in your area.',
              icon: '⚡'
            },
            { 
              step: '03', 
              title: 'AI Fraud Detection', 
              body: 'Advanced rule checks and anomaly detection generate risk scores to auto-approve, flag for review, or reject claims instantly.',
              icon: '🤖'
            },
          ].map((feature) => (
            <Card key={feature.step} className="relative hover:shadow-lg transition-all duration-300 group">
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold group-hover:scale-110 transition-transform">
                {feature.step}
              </div>
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{feature.body}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Coverage Types */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Coverage Types</h2>
          <p className="text-slate-600">Comprehensive protection against common disruptions</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { type: 'Heavy Rainfall', desc: 'Auto-claim when rainfall exceeds 50mm/day', color: 'blue' },
            { type: 'Flood Alert', desc: 'Instant payout on official flood warnings', color: 'cyan' },
            { type: 'Extreme Heat', desc: 'Coverage when temperature > 40°C', color: 'orange' },
            { type: 'Severe AQI', desc: 'Protection for AQI > 300 levels', color: 'red' },
            { type: 'Zone Closure', desc: 'Auto-claim for delivery zone shutdowns', color: 'purple' },
          ].map((coverage) => (
            <div key={coverage.type} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200">
              <div className={`w-3 h-3 rounded-full bg-${coverage.color}-500`}></div>
              <div>
                <div className="font-medium text-slate-900">{coverage.type}</div>
                <div className="text-sm text-slate-600">{coverage.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-50 to-purple-50 p-8 text-center border border-indigo-100">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to protect your income?</h2>
        <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
          Join thousands of delivery workers who trust GigShield for instant income protection during disruptions.
        </p>
        <Button 
          variant="primary" 
          size="lg"
          onClick={() => window.location.href = '/login'}
        >
          Get Started Now →
        </Button>
      </div>
    </div>
  );
}

