import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { BottomNav } from '../components/BottomNav'
import client from '../api/client'

export default function PolicyDocumentsPage() {
    const nav = useNavigate()
    const [activePolicy, setActivePolicy] = useState<any>(null)
    const [downloading, setDownloading] = useState(false)

    useEffect(() => {
        client.get('/api/policies/active/').then(r => setActivePolicy(r.data.active))
    }, [])

    const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:8000'

    function openPolicyCertificate() {
        if (!activePolicy?.id) return
        const token = localStorage.getItem('access') ?? ''
        // Open in a new tab via a hidden anchor with Authorization via blob URL
        const url = `${API_BASE}/api/policies/${activePolicy.id}/certificate/`
        fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.blob())
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob)
                window.open(blobUrl, '_blank')
            })
    }

    async function downloadOrViewExclusions(mode: 'view' | 'download') {
        setDownloading(true)
        const token = localStorage.getItem('access') ?? ''
        const url = `${API_BASE}/api/policies/exclusions-doc/`
        try {
            const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            const blob = await r.blob()
            const blobUrl = URL.createObjectURL(blob)
            if (mode === 'view') {
                window.open(blobUrl, '_blank')
            } else {
                const a = document.createElement('a')
                a.href = blobUrl
                a.download = 'GigShield_Exclusions_v1.0.pdf'
                a.click()
            }
        } finally {
            setDownloading(false)
        }
    }

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
                    <h1 className="text-2xl font-display font-bold text-white">Policy Documents</h1>
                </div>

                <Card>
                    <h2 className="text-h3 font-display mb-3 text-white">Current Active Cover</h2>
                    {activePolicy ? (
                        <div className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-bg-surface)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-white">Weekly Cover - {activePolicy.tier}</p>
                                    <p className="text-xs text-[var(--color-text-secondary)]">Valid till {activePolicy.week_end}</p>
                                </div>
                            </div>
                            <button
                                onClick={openPolicyCertificate}
                                className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)] hover:text-emerald-300"
                            >
                                View PDF
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--color-text-secondary)]">No active policy found. Purchase one from the Home dashboard to see your current cover here.</p>
                    )}
                </Card>

                <Card>
                    <h2 className="text-h3 font-display mb-3 text-white">General Wordings</h2>
                    <div className="space-y-3">
                        <div className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-bg-surface)] flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-gray-200">Standard Policy Terms (v1.0)</p>
                                <p className="text-xs text-[var(--color-text-secondary)]">Exclusions & General Wordings • PDF</p>
                            </div>
                            <button
                                onClick={() => downloadOrViewExclusions('download')}
                                disabled={downloading}
                                className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)] hover:text-emerald-300 disabled:opacity-50"
                            >
                                {downloading ? 'Downloading…' : 'Download'}
                            </button>
                        </div>

                        <div className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-bg-surface)] flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-gray-200">List of Exclusions</p>
                                <p className="text-xs text-[var(--color-text-secondary)]">Incorporating War, Pandemics, etc.</p>
                            </div>
                            <button
                                onClick={() => downloadOrViewExclusions('view')}
                                disabled={downloading}
                                className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)] hover:text-emerald-300 disabled:opacity-50"
                            >
                                View
                            </button>
                        </div>
                    </div>
                </Card>
            </div>

            <BottomNav />
        </div>
    )
}

