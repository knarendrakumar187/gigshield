import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { BottomNav } from '../components/BottomNav'

export default function SupportPage() {
    const nav = useNavigate()
    const [chatOpen, setChatOpen] = useState(false)

    return (
        <div className="worker-layout pb-24 min-h-[100dvh] bg-[var(--color-bg-base)]">
            <div className="pt-8 px-4 space-y-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => nav(-1)}
                        className="p-2 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] transition"
                    >
                        <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-2xl font-display font-bold text-white">Help & Support</h1>
                </div>

                <Card>
                    <div className="text-center py-6">
                        <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <h2 className="text-xl font-display font-bold text-white mb-2">We're here for you</h2>
                        <p className="text-body-sm text-[var(--color-text-secondary)]">If you're facing an issue with a recent claim or policy purchase, our support team is available 24/7.</p>
                    </div>

                    <button
                        onClick={() => {
                            setChatOpen(true)
                            setTimeout(() => alert("All agents are currently assisting other gig workers. Please try again later or email support@gigshield.demo"), 2000)
                        }}
                        disabled={chatOpen}
                        className={`w-full rounded-xl py-3 font-semibold transition ${chatOpen ? 'bg-blue-500/50 cursor-not-allowed text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                    >
                        {chatOpen ? 'Connecting to Support Agent...' : 'Chat with Support'}
                    </button>
                </Card>

                <h3 className="text-h3 font-display mt-6 mb-3 px-1 text-white">Frequently Asked Questions</h3>

                <div className="space-y-4">
                    <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-bg-surface)] p-4">
                        <p className="font-semibold text-white mb-1">How are payouts triggered?</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Payouts are completely automatic based on external data (weather, government alerts). You don't need to do anything.</p>
                    </div>
                    <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-bg-surface)] p-4">
                        <p className="font-semibold text-white mb-1">What is NOT covered?</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Vehicle repair, medical costs, and platform tech outages are not covered. We only cover income loss from environmental disruptions.</p>
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}
