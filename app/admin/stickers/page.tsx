"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    Search, Tag, X, ChevronLeft, ChevronRight, User2, Car, Calendar, DollarSign, AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface StickerRow {
    id: string
    homeownerId: string
    code: string
    status: "ACTIVE" | "EXPIRED" | "REVOKED"
    issuedAt: string | null
    expiresAt: string | null
    amountPaid: number | null
    notes: string | null
    vehiclePlateNo: string | null
    vehicleMake: string | null
    vehicleModel: string | null
    vehicleCategory: string | null
    homeownerName: string | null
    homeownerAddress: string | null
}

const STATUS_TABS = [
    { value: "", label: "All" },
    { value: "ACTIVE", label: "Active" },
    { value: "EXPIRED", label: "Expired" },
    { value: "REVOKED", label: "Revoked" },
]

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    EXPIRED: "bg-slate-100 text-slate-500",
    REVOKED: "bg-red-100 text-red-700",
}

const NEXT_STATUS: Record<string, { label: string; value: string }[]> = {
    ACTIVE: [{ label: "Expire", value: "EXPIRED" }, { label: "Revoke", value: "REVOKED" }],
    EXPIRED: [{ label: "Reactivate", value: "ACTIVE" }],
    REVOKED: [{ label: "Reactivate", value: "ACTIVE" }],
}

/** Returns days until expiry — negative = past, 0 = today */
function daysUntilExpiry(expiresAt: string | null): number | null {
    if (!expiresAt) return null
    const now = new Date()
    const exp = new Date(expiresAt)
    if (isNaN(exp.getTime())) return null
    const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return Math.floor(diff)
}

function ExpiryIndicator({ expiresAt }: { expiresAt: string | null }) {
    const days = daysUntilExpiry(expiresAt)
    if (days === null) return <span className="text-slate-400">No expiry</span>

    if (days < 0) {
        return (
            <span className="flex items-center gap-1 text-red-600 font-medium">
                <AlertTriangle className="w-3 h-3" />
                Expired {Math.abs(days)}d ago
            </span>
        )
    }
    if (days === 0) {
        return <span className="flex items-center gap-1 text-red-600 font-medium"><AlertTriangle className="w-3 h-3" /> Expires today</span>
    }
    if (days <= 30) {
        return <span className="text-amber-600 font-medium">Expires in {days}d</span>
    }
    return <span className="text-slate-500">Expires {new Date(expiresAt!).toLocaleDateString()}</span>
}

function PaidBadge({ amountPaid }: { amountPaid: number | null }) {
    if (typeof amountPaid === "number" && amountPaid > 0) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <DollarSign className="w-2.5 h-2.5" />
                ₱{amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
            Unpaid
        </span>
    )
}

export default function AdminStickersPage() {
    const router = useRouter()
    const [items, setItems] = useState<StickerRow[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [q, setQ] = useState("")
    const [status, setStatus] = useState("")
    const [page, setPage] = useState(1)
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

    // Summary counts from current loaded items
    const summary = useMemo(() => {
        let active = 0, expired = 0, revoked = 0, paid = 0, unpaid = 0, expiringSoon = 0
        for (const s of items) {
            if (s.status === "ACTIVE") active++
            else if (s.status === "EXPIRED") expired++
            else if (s.status === "REVOKED") revoked++

            if (typeof s.amountPaid === "number" && s.amountPaid > 0) paid++
            else unpaid++

            const days = daysUntilExpiry(s.expiresAt)
            if (days !== null && days >= 0 && days <= 30 && s.status === "ACTIVE") expiringSoon++
        }
        return { active, expired, revoked, paid, unpaid, expiringSoon }
    }, [items])

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const res = await fetch("/api/admin/stickers", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            toast.success(`Sticker ${newStatus.toLowerCase()}`)
            setItems(prev => prev.map(s => s.id === id ? { ...s, status: newStatus as any } : s))
        } catch (e: any) {
            toast.error(e?.message || "Failed to update")
        }
    }

    const totalPages = Math.ceil(total / pageSize)

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 sm:px-6 py-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-[17px] font-bold text-slate-900">Stickers</h1>
                    <p className="text-[11px] text-slate-400">{total.toLocaleString()} stickers</p>
                </div>
            </header>

            <main className="px-4 sm:px-6 py-4 max-w-5xl mx-auto space-y-3">
                {/* Summary cards */}
                {!loading && items.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                            { label: "Active", value: summary.active, color: "text-emerald-600", bg: "bg-emerald-50" },
                            { label: "Expired", value: summary.expired, color: "text-slate-500", bg: "bg-slate-50" },
                            { label: "Revoked", value: summary.revoked, color: "text-red-600", bg: "bg-red-50" },
                            { label: "Paid", value: summary.paid, color: "text-emerald-600", bg: "bg-emerald-50" },
                            { label: "Unpaid", value: summary.unpaid, color: "text-red-600", bg: "bg-red-50" },
                            { label: "Expiring ≤30d", value: summary.expiringSoon, color: "text-amber-600", bg: "bg-amber-50" },
                        ].map(c => (
                            <div key={c.label} className={`${c.bg} rounded-lg p-2.5 text-center`}>
                                <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
                                <p className="text-[10px] text-slate-500 font-medium">{c.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Search + status tabs */}
                <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search code, plate, or homeowner…"
                            value={q}
                            onChange={e => { setQ(e.target.value); setPage(1) }}
                            className="pl-9 h-9 rounded-md border-slate-200 text-sm"
                        />
                        {q && (
                            <button onClick={() => { setQ(""); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1 self-start sm:self-auto">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab.value}
                                onClick={() => { setStatus(tab.value); setPage(1) }}
                                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${status === tab.value
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
                    <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-12 text-center">
                        <Tag className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">No stickers found</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map(s => (
                            <div key={s.id} className="bg-white rounded-lg border border-slate-100 shadow-sm p-4">
                                <div className="flex items-start gap-3">
                                    {/* Sticker code + status */}
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                                        <Tag className="w-5 h-5 text-slate-400" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-sm font-bold text-slate-900 font-mono">{s.code}</span>
                                            <Badge className={`border-0 text-[10px] hover:opacity-100 ${STATUS_COLORS[s.status] || ""}`}>
                                                {s.status}
                                            </Badge>
                                            <PaidBadge amountPaid={s.amountPaid} />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 text-[11px] text-slate-500">
                                            {/* Vehicle info */}
                                            {s.vehiclePlateNo && (
                                                <p className="flex items-center gap-1">
                                                    <Car className="w-3 h-3 text-slate-400 shrink-0" />
                                                    <span className="font-medium text-slate-700">{s.vehiclePlateNo}</span>
                                                    {" "}{[s.vehicleMake, s.vehicleModel].filter(Boolean).join(" ")}
                                                    {s.vehicleCategory && <span className="text-slate-400">({s.vehicleCategory})</span>}
                                                </p>
                                            )}

                                            {/* Homeowner */}
                                            {s.homeownerName && (
                                                <button
                                                    onClick={() => router.push(`/admin/homeowners/${s.homeownerId}`)}
                                                    className="flex items-center gap-1 text-left hover:text-blue-600 transition-colors group"
                                                >
                                                    <User2 className="w-3 h-3 text-slate-400 group-hover:text-blue-500 shrink-0" />
                                                    <span className="group-hover:underline">{s.homeownerName}</span>
                                                    {s.homeownerAddress && <span className="text-slate-400">• {s.homeownerAddress}</span>}
                                                </button>
                                            )}

                                            {/* Dates */}
                                            <p className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                                Issued: {s.issuedAt ? new Date(s.issuedAt).toLocaleDateString() : "—"}
                                            </p>

                                            {/* Expiry indicator */}
                                            <p className="flex items-center gap-1 text-[11px]">
                                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                                <ExpiryIndicator expiresAt={s.expiresAt} />
                                            </p>
                                        </div>

                                        {s.notes && <p className="text-[10px] text-slate-400 mt-1">Note: {s.notes}</p>}
                                    </div>

                                    {/* Status actions */}
                                    <div className="flex gap-1 shrink-0">
                                        {(NEXT_STATUS[s.status] || []).map(action => (
                                            <Button
                                                key={action.value}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleStatusChange(s.id, action.value)}
                                                className="h-7 px-2.5 text-[10px] font-semibold"
                                            >
                                                {action.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {total > pageSize && (
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-slate-400">
                            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="w-8 h-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:bg-slate-100 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-slate-500 font-medium px-2">Page {page} / {totalPages}</span>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= totalPages}
                                className="w-8 h-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:bg-slate-100 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
