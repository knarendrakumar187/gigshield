import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { motion } from 'framer-motion'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const nav = useNavigate()

  const initial = user?.username ? user.username.charAt(0).toUpperCase() : 'W'
  const isWorker = user?.role === 'WORKER'

  return (
    <div className="worker-layout pb-24 min-h-[100dvh] bg-[var(--color-bg-base)]">
      {/* Decorative ambient background */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[var(--color-accent)]/20 to-transparent pointer-events-none" />

      <div className="relative z-10 pt-8 px-4 space-y-6">
        <h1 className="text-3xl font-display font-bold text-white mb-6">Profile</h1>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1e2d40]/80 to-[#0a0d14]/80 backdrop-blur-2xl shadow-2xl"
        >
          {/* Header Banner */}
          <div className="h-28 bg-gradient-to-r from-[#00d4aa] to-[#2563eb] opacity-80" />

          <div className="px-6 pb-6 relative">
            {/* Avatar */}
            <div className="absolute -top-12 left-6 h-24 w-24 rounded-full border-4 border-[#0a0d14] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shadow-xl">
              <span className="text-4xl font-display font-bold text-white">{initial}</span>
              <div className="absolute bottom-0 right-1 h-5 w-5 bg-emerald-400 rounded-full border-[3px] border-[#0a0d14]"></div>
            </div>

            {/* Actions (right aligned on avatar row) */}
            <div className="flex justify-end pt-3">
              <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-400/20 shadow-inner">
                {isWorker ? 'Verified Worker' : 'Admin'}
              </span>
            </div>

            <div className="mt-6 space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">@{user?.username}</h2>
              <p className="text-[var(--color-text-secondary)] font-medium text-sm flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {user?.city ? `${user.city} • ${user?.zone}` : 'Location unknown'}
              </p>
            </div>

            {/* UPI ID Badge */}
            {user?.upi_id && (
              <div className="mt-6 bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors rounded-2xl p-4 flex items-center gap-4 group cursor-pointer">
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[var(--color-text-muted)] font-medium mb-0.5">Primary Payout Method</p>
                  <p className="font-mono text-sm tracking-wide text-white truncate">{user.upi_id}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Action List Section */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-3 pt-2">
          {/* Mock Links for realism */}
          <button onClick={() => nav('/policy-documents')} className="w-full bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center justify-between group transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <span className="font-semibold text-gray-200 group-hover:text-white transition-colors">Policy Documents</span>
            </div>
            <svg className="w-5 h-5 text-gray-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>

          <button onClick={() => nav('/support')} className="w-full bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center justify-between group transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <span className="font-semibold text-gray-200 group-hover:text-white transition-colors">Help & Support</span>
            </div>
            <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>

          <button
            onClick={() => { logout(); nav('/login') }}
            className="w-full bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/30 rounded-2xl p-4 flex items-center justify-between group transition-all duration-300 mt-6"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 group-hover:scale-110 group-hover:-rotate-6 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </div>
              <span className="font-semibold text-red-400 group-hover:text-red-300 transition-colors">Sign Out</span>
            </div>
          </button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  )
}

