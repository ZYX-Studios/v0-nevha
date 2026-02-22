"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    Search, Tag, X, ChevronLeft, ChevronRight, User2, Car, Calendar, AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

/* ── Types ─────────────────────────────────────────────────────── */
interface StickerRow {
    id: string
    homeownerId: string
    code: string
    status: "ACTIVE" | "EXPIRED" | "REVOKED"
    effectiveStatus: "ACTIVE" | "EXPIRED" | "REVOKED"
    issuedAt: string | null
    expiresAt: string | null
    amountPaid: number | null
    notes: string | null
    parsedNotes: Record<string, string> | null
    vehiclePlateNo: string | null
    vehicleMake: string | null
    vehicleModel: string | null
    vehicleColor: string | null
    vehicleCategory: string | null
    homeownerName: string | null
    homeownerAddress: string | null
}

interface Summary {
    active: number
    expired: number
    revoked: number
    paid: number
    unpaid: number
}

const STATUS_TABS = [
    { value: "", label: "All" },
    { value: "ACTIVE", label: "Active" },
    { value: "EXPIRED", label: "Expired" },
    { value: "REVOKED", label: "Revoked" },
]

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    ACTIVE: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    EXPIRED: { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
    REVOKED: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
}

const NEXT_STATUS: Record<string, { label: string; value: string; destructive?: boolean }[]> = {
    ACTIVE: [
        { label: "Expire", value: "EXPIRED" },
        { label: "Revoke", value: "REVOKED", destructive: true },
    ],
    EXPIRED: [{ label: "Reactivate", value: "ACTIVE" }],
    REVOKED: [{ label: "Reactivate", value: "ACTIVE" }],
}

/* ── Helper Components ─────────────────────────────────────────── */
function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
    if (!expiresAt) return null
    const exp = new Date(expiresAt)
    if (isNaN(exp.getTime())) return null
    const days = Math.floor((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    if (days < 0) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                <AlertTriangle className="w-2.5 h-2.5" />
                Expired {Math.abs(days)}d ago
            </span>
        )
    }
    if (days <= 30) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                Expires in {days}d
            </span>
        )
    }
    return null
}

/* ── Main Component ────────────────────────────────────────────── */
export default function AdminStickersPage() {
    const router = useRouter()
    const [items, setItems] = useState<StickerRow[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [summary, setSummary] = useState<Summary>({ active: 0, expired: 0, revoked: 0, paid: 0, unpaid: 0 })
    const [q, setQ] = useState("")
    const [status, setStatus] = useState("")
    const [page, setPage] = useState(1)
    const [actionTarget, setActionTarget] = useState<{ id: string; action: string; label: string } | null>(null)
    const [isActioning, setIsActioning] = useState(false)
    const pageSize = 25

    const fetchItems = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (q.trim()) params.set("q", q.trim())
            if (status) params.set("status", status)
            params.set("page", String(page))
            params.set("pageSize", String(pageSize))

            const res = await fetch(`/api/admin/stickers?${params}`, { cache: "no-store" })
            const json = await res.json()
            if (!res.ok) throw new Error(json?.error || "Failed to load")
            setItems(json.items || [])
            setTotal(json.total ?? 0)
            if (json.summary) setSummary(json.summary)
        } catch (e: any) {
            toast.error(e?.message || "Failed to load stickers")
        } finally {
            setLoading(false)
        }
    }, [q, status, page])

    useEffect(() => {
        const t = setTimeout(fetchItems, 300)
        return () => clearTimeout(t)
    }, [fetchItems])

    const handleStatusChange = async () => {
        if (!actionTarget) return
        setIsActioning(true)
        try {
            const res = await fetch("/api/admin/stickers", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: actionTarget.id, status: actionTarget.action }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            toast.success(`Sticker ${actionTarget.action.toLowerCase()}`)
            setItems(prev => prev.map(s =>
                s.id === actionTarget.id
                    ? { ...s, status: actionTarget.action as any, effectiveStatus: actionTarget.action as any }
                    : s
            ))
        } catch (e: any) {
            toast.error(e?.message || "Failed to update")
        } finally {
            setIsActioning(false)
            setActionTarget(null)
        }
    }

    const totalPages = Math.ceil(total / pageSize)
    const sc = (s: string) => STATUS_COLORS[s] || STATUS_COLORS.EXPIRED

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 sm:px-6 py-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-[17px] font-bold text-slate-900">Car Stickers</h1>
                    <p className="text-[11px] text-slate-400">{total.toLocaleString()} total stickers</p>
                </div>
            </header>

            <main className="px-4 sm:px-6 py-4 max-w-5xl mx-auto space-y-4">
                {/* Summary cards — server-side counts */}
                {!loading && (
                    <div className="grid grid-cols-5 gap-2">
                        {[
                            { label: "Active", value: summary.active, color: "text-emerald-600", bg: "bg-emerald-50" },
                            { label: "Expired", value: summary.expired, color: "text-slate-500", bg: "bg-slate-100" },
                            { label: "Revoked", value: summary.revoked, color: "text-red-600", bg: "bg-red-50" },
                            { label: "Paid", value: summary.paid, color: "text-blue-600", bg: "bg-blue-50" },
                            { label: "Unpaid", value: summary.unpaid, color: "text-amber-600", bg: "bg-amber-50" },
                        ].map(c => (
                            <div key={c.label} className={`${c.bg} rounded-xl p-3 text-center`}>
                                <p className={`text-xl font-bold ${c.color} tabular-nums`}>{c.value}</p>
                                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{c.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Search + status tabs */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search code, plate, or homeowner…"
                            value={q}
                            onChange={e => { setQ(e.target.value); setPage(1) }}
                            className="pl-9 h-9 rounded-lg border-slate-200 text-sm"
                        />
                        {q && (
                            <button onClick={() => { setQ(""); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 self-start sm:self-auto">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab.value}
                                onClick={() => { setStatus(tab.value); setPage(1) }}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${status === tab.value
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex items-center justify-center py-16 gap-2">
                        <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        <span className="text-sm text-slate-400">Loading…</span>
                    </div>
                ) : items.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
                        <Tag className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">No stickers found</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map(s => {
                            const sColor = sc(s.effectiveStatus)
                            const vehicle = [s.vehicleMake, s.vehicleModel].filter(Boolean).join(" ")
                            const vehicleLabel = [s.vehiclePlateNo, vehicle, s.vehicleColor].filter(Boolean).join(" • ")

                            return (
                                <div key={s.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-3">
                                        {/* Left icon */}
                                        <div className={`w-10 h-10 rounded-xl ${sColor.bg} flex items-center justify-center shrink-0`}>
                                            <Tag className={`w-4.5 h-4.5 ${sColor.text}`} />
                                        </div>

                                        {/* Center content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Row 1: Code + badges */}
                                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                                <span className="text-sm font-bold text-slate-900 font-mono tracking-wide">#{s.code}</span>
                                                <Badge className={`border ${sColor.border} ${sColor.bg} ${sColor.text} text-[10px] hover:opacity-100`}>
                                                    {s.effectiveStatus}
                                                </Badge>
                                                {/* Payment badge */}
                                                {typeof s.amountPaid === "number" && s.amountPaid > 0 ? (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        ₱{s.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                                                        Unpaid
                                                    </span>
                                                )}
                                                <ExpiryBadge expiresAt={s.expiresAt} />
                                            </div>

                                            {/* Row 2: Vehicle + Homeowner */}
                                            <div className="space-y-1 text-xs">
                                                {vehicleLabel && (
                                                    <p className="flex items-center gap-1.5 text-slate-600">
                                                        <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span className="font-semibold text-slate-800">{s.vehiclePlateNo}</span>
                                                        {vehicle && <span className="text-slate-400">{vehicle}</span>}
                                                        {s.vehicleColor && <span className="text-slate-400">• {s.vehicleColor}</span>}
                                                        {s.vehicleCategory && (
                                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{s.vehicleCategory}</span>
                                                        )}
                                                    </p>
                                                )}
                                                {s.homeownerName && (
                                                    <button
                                                        onClick={() => router.push(`/admin/homeowners/${s.homeownerId}`)}
                                                        className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors group"
                                                    >
                                                        <User2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0" />
                                                        <span className="group-hover:underline font-medium">{s.homeownerName}</span>
                                                        {s.homeownerAddress && <span className="text-slate-400">• {s.homeownerAddress}</span>}
                                                    </button>
                                                )}
                                                {/* Dates row */}
                                                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                                    {s.issuedAt && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            Issued {new Date(s.issuedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                    {s.expiresAt && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            Expires {new Date(s.expiresAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: actions */}
                                        <div className="flex gap-1.5 shrink-0">
                                            {(NEXT_STATUS[s.effectiveStatus] || []).map(action => (
                                                <Button
                                                    key={action.value}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setActionTarget({ id: s.id, action: action.value, label: action.label })}
                                                    className={`h-7 px-2.5 text-[10px] font-semibold rounded-lg ${action.destructive
                                                        ? "border-red-200 text-red-600 hover:bg-red-50"
                                                        : ""
                                                        }`}
                                                >
                                                    {action.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Pagination */}
                {total > pageSize && (
                    <div className="flex items-center justify-between px-1 pt-2">
                        <span className="text-xs text-slate-400">
                            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:bg-slate-100 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-slate-500 font-medium px-2">Page {page} / {totalPages}</span>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= totalPages}
                                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:bg-slate-100 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Status Change Confirmation Dialog */}
            <Dialog open={!!actionTarget} onOpenChange={v => { if (!v) setActionTarget(null) }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            {actionTarget?.label} Sticker
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to {actionTarget?.label.toLowerCase()} this sticker? This will change its status to <span className="font-semibold">{actionTarget?.action}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" onClick={() => setActionTarget(null)} disabled={isActioning} className="flex-1 rounded-lg">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleStatusChange}
                            disabled={isActioning}
                            className={`flex-1 rounded-lg ${actionTarget?.action === "REVOKED" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}
                        >
                            {isActioning ? "Updating…" : actionTarget?.label}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
