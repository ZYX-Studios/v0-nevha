"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
    Search, DollarSign, X, ChevronLeft, ChevronRight, CheckCircle2,
    XCircle, Clock, User2, CreditCard, Plus, FileText, Trash2, Car,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentRow {
    id: string
    homeownerId: string
    feeType: string
    feeYear: number
    amount: number
    paymentMethod: string
    proofUrl: string | null
    proofDriveFileId: string | null
    status: string
    adminNotes: string | null
    verifiedAt: string | null
    createdAt: string
    homeownerName: string | null
    homeownerAddress: string | null
}

interface HomeownerOption { id: string; name: string; address: string }

interface VehicleOption {
    id: string
    plateNo: string
    make: string | null
    model: string | null
    category: string | null
}

interface LineItem {
    id: string
    feeType: "car_sticker" | "annual_dues"
    vehicleId: string
    stickerCode: string
    plateNo: string
    make: string
    model: string
    category: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_TABS = [
    { value: "", label: "All" },
    { value: "verified", label: "Verified" },
    { value: "pending", label: "Pending" },
    { value: "rejected", label: "Rejected" },
]

const FEE_LABELS: Record<string, string> = { annual_dues: "Annual Dues", car_sticker: "Car Sticker" }
const METHOD_LABELS: Record<string, string> = { cash: "Cash", gcash: "GCash", bank_transfer: "Bank Transfer", check: "Check" }

const STATUS_STYLE: Record<string, { label: string; text: string; bg: string; icon: typeof CheckCircle2 }> = {
    verified: { label: "Verified", text: "text-emerald-700", bg: "bg-emerald-50", icon: CheckCircle2 },
    pending: { label: "Pending", text: "text-amber-700", bg: "bg-amber-50", icon: Clock },
    rejected: { label: "Rejected", text: "text-red-600", bg: "bg-red-50", icon: XCircle },
}

function makeBlankItem(): LineItem {
    return {
        id: crypto.randomUUID(),
        feeType: "car_sticker",
        vehicleId: "",
        stickerCode: "",
        plateNo: "",
        make: "",
        model: "",
        category: "",
    }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPaymentsPage() {
    const router = useRouter()
    const [items, setItems] = useState<PaymentRow[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [q, setQ] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [page, setPage] = useState(1)
    const pageSize = 25

    // Dialog
    const [createOpen, setCreateOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const [hoSearch, setHoSearch] = useState("")
    const [hoOptions, setHoOptions] = useState<HomeownerOption[]>([])
    const [hoSearching, setHoSearching] = useState(false)
    const [selectedHo, setSelectedHo] = useState<HomeownerOption | null>(null)
    const [hoVehicles, setHoVehicles] = useState<VehicleOption[]>([])
    const [lineItems, setLineItems] = useState<LineItem[]>([makeBlankItem()])
    const [globalNotes, setGlobalNotes] = useState("")
    const [globalMethod, setGlobalMethod] = useState<"cash" | "gcash" | "bank_transfer" | "check">("cash")
    const hoSearchTimeout = useRef<NodeJS.Timeout | null>(null)

    // Config prices
    const [stickerPrice, setStickerPrice] = useState(100)
    const [duesAmount, setDuesAmount] = useState(240)

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/dues/config", { cache: "no-store" })
                const json = await res.json()
                // API returns { configs, current } — use `current` for the active year's config
                const cfg = json.current
                if (res.ok && cfg) {
                    if (cfg.car_sticker_price) setStickerPrice(Number(cfg.car_sticker_price))
                    if (cfg.annual_amount) setDuesAmount(Number(cfg.annual_amount))
                }
            } catch { /* defaults */ }
        })()
    }, [])

    // ── Data ──────────────────────────────────────────────────────────────────

    const fetchItems = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (q.trim()) params.set("q", q.trim())
            if (statusFilter) params.set("status", statusFilter)
            params.set("page", String(page))
            params.set("pageSize", String(pageSize))
            const res = await fetch(`/api/admin/payments?${params}`, { cache: "no-store" })
            const json = await res.json()
            if (!res.ok) throw new Error(json?.error || "Failed to load")
            setItems(json.items || [])
            setTotal(json.total ?? 0)
        } catch (e: any) { toast.error(e?.message || "Failed to load payments") }
        finally { setLoading(false) }
    }, [q, statusFilter, page])

    useEffect(() => { const t = setTimeout(fetchItems, 300); return () => clearTimeout(t) }, [fetchItems])

    // ── Homeowner search ──────────────────────────────────────────────────────

    const searchHomeowners = useCallback(async (query: string) => {
        if (!query.trim() || query.trim().length < 2) { setHoOptions([]); return }
        setHoSearching(true)
        try {
            const res = await fetch(`/api/admin/homeowners?q=${encodeURIComponent(query.trim())}&pageSize=10`, { cache: "no-store" })
            const json = await res.json()
            if (res.ok) {
                setHoOptions((json.items || []).map((h: any) => ({
                    id: h.id,
                    name: `${h.firstName || ""} ${h.lastName || ""}`.trim() || h.email || h.id,
                    address: [h.block ? `Blk ${h.block}` : "", h.lot ? `Lot ${h.lot}` : "", h.phase ? `Ph ${h.phase}` : ""].filter(Boolean).join(" "),
                })))
            }
        } catch { /* silent */ }
        finally { setHoSearching(false) }
    }, [])

    useEffect(() => {
        if (hoSearchTimeout.current) clearTimeout(hoSearchTimeout.current)
        hoSearchTimeout.current = setTimeout(() => searchHomeowners(hoSearch), 400)
        return () => { if (hoSearchTimeout.current) clearTimeout(hoSearchTimeout.current) }
    }, [hoSearch, searchHomeowners])

    // ── Vehicle fetch ─────────────────────────────────────────────────────────

    const selectHomeowner = useCallback(async (ho: HomeownerOption) => {
        setSelectedHo(ho); setHoSearch(""); setHoOptions([])
        try {
            const res = await fetch(`/api/admin/homeowners/${ho.id}/stickers`, { cache: "no-store" })
            const json = await res.json()
            if (res.ok) {
                const m = new Map<string, VehicleOption>()
                for (const s of json.items || []) {
                    const plate = s.vehiclePlateNo
                    if (plate && !m.has(plate)) {
                        m.set(plate, { id: s.vehicleId || plate, plateNo: plate, make: s.vehicleMake || null, model: s.vehicleModel || null, category: s.vehicleCategory || null })
                    }
                }
                setHoVehicles(Array.from(m.values()))
            }
        } catch { setHoVehicles([]) }
    }, [])

    // ── Line items ────────────────────────────────────────────────────────────

    const updateItem = (id: string, patch: Partial<LineItem>) => {
        setLineItems(prev => prev.map(li => li.id === id ? { ...li, ...patch } : li))
    }

    const selectVehicle = (itemId: string, vehicleId: string) => {
        if (vehicleId === "__new__") { updateItem(itemId, { vehicleId: "", plateNo: "", make: "", model: "", category: "" }); return }
        const v = hoVehicles.find(v => v.id === vehicleId)
        if (v) updateItem(itemId, { vehicleId: v.id, plateNo: v.plateNo, make: v.make || "", model: v.model || "", category: v.category || "" })
    }

    const removeItem = (id: string) => setLineItems(prev => prev.length > 1 ? prev.filter(li => li.id !== id) : prev)

    const totalAmount = lineItems.reduce((sum, li) => sum + (li.feeType === "car_sticker" ? stickerPrice : duesAmount), 0)

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleCreate = async () => {
        if (!selectedHo) { toast.error("Select a homeowner"); return }
        setCreating(true)
        try {
            const currentYear = new Date().getFullYear()
            const res = await fetch("/api/admin/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    homeownerId: selectedHo.id,
                    notes: globalNotes || undefined,
                    items: lineItems.map(li => ({
                        feeType: li.feeType,
                        feeYear: currentYear,
                        amount: li.feeType === "car_sticker" ? stickerPrice : duesAmount,
                        paymentMethod: globalMethod,
                        ...(li.feeType === "car_sticker" ? {
                            stickerCode: li.stickerCode || undefined,
                            plateNo: li.plateNo || undefined,
                            make: li.make || undefined,
                            model: li.model || undefined,
                            category: li.category || undefined,
                        } : {}),
                    })),
                }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json?.error)
            toast.success(`${json.count} payment(s) recorded`)
            resetDialog(); fetchItems()
        } catch (e: any) { toast.error(e?.message || "Failed to record payment") }
        finally { setCreating(false) }
    }

    const resetDialog = () => {
        setCreateOpen(false); setSelectedHo(null); setHoSearch(""); setHoOptions([])
        setHoVehicles([]); setLineItems([makeBlankItem()]); setGlobalNotes(""); setGlobalMethod("cash")
    }

    const totalPages = Math.ceil(total / pageSize)

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-20">
            {/* ── Header ── */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 sm:px-6 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-slate-900 leading-none">Payments</h1>
                    <p className="text-xs text-slate-400 mt-0.5">{total.toLocaleString()} records</p>
                </div>
                <Button
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    className="gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm shrink-0"
                >
                    <Plus className="w-4 h-4" /> Record Payment
                </Button>
            </header>

            <main className="px-4 sm:px-6 py-4 max-w-5xl mx-auto space-y-3">
                {/* ── Search + Tabs ── */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search homeowner…"
                            value={q}
                            onChange={e => { setQ(e.target.value); setPage(1) }}
                            className="pl-9 h-10 rounded-lg border-slate-200 text-base bg-white shadow-sm"
                        />
                        {q && (
                            <button onClick={() => { setQ(""); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm self-start sm:self-auto">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab.value}
                                onClick={() => { setStatusFilter(tab.value); setPage(1) }}
                                className={`px-3.5 py-2 rounded-md text-sm font-semibold transition-all ${statusFilter === tab.value
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                    {/* Column headers */}
                    <div className="hidden sm:grid grid-cols-[1fr_130px_110px_110px_100px] gap-x-4 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Homeowner</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Fee</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Amount</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Method</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</span>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-2">
                            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                            <span className="text-base text-slate-400">Loading…</span>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-16 space-y-3">
                            <CreditCard className="w-10 h-10 text-slate-200 mx-auto" />
                            <p className="text-base text-slate-400">{q ? "No results found" : "No payments yet"}</p>
                            {!q && (
                                <Button size="sm" onClick={() => setCreateOpen(true)} className="rounded-full gap-1.5">
                                    <Plus className="w-3.5 h-3.5" /> Record First Payment
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            <AnimatePresence mode="popLayout">
                                {items.map((p) => {
                                    const st = STATUS_STYLE[p.status] || STATUS_STYLE.pending
                                    const StatusIcon = st.icon
                                    return (
                                        <motion.div
                                            key={p.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            className="grid grid-cols-1 sm:grid-cols-[1fr_130px_110px_110px_100px] gap-x-4 gap-y-1 px-4 py-3.5 hover:bg-slate-50/60 transition-colors group"
                                        >
                                            {/* Homeowner */}
                                            <div className="min-w-0 flex items-start gap-2.5">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${st.bg}`}>
                                                    <StatusIcon className={`w-4 h-4 ${st.text}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <button
                                                        onClick={() => router.push(`/admin/homeowners/${p.homeownerId}`)}
                                                        className="text-base font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors text-left block"
                                                    >
                                                        {p.homeownerName || "Unknown"}
                                                    </button>
                                                    <p className="text-sm text-slate-400 truncate">
                                                        {p.homeownerAddress ? `${p.homeownerAddress} • ` : ""}{new Date(p.createdAt).toLocaleDateString()}
                                                    </p>
                                                    {p.adminNotes && <p className="text-xs text-slate-400 truncate mt-0.5">{p.adminNotes}</p>}
                                                </div>
                                            </div>

                                            {/* Fee */}
                                            <div className="flex items-center sm:block">
                                                <span className="text-sm font-medium text-slate-700">{FEE_LABELS[p.feeType] || p.feeType}</span>
                                                <span className="text-xs text-slate-400 block">{p.feeYear}</span>
                                            </div>

                                            {/* Amount */}
                                            <div className="flex items-center">
                                                <span className="text-base font-bold text-slate-900">
                                                    ₱{(p.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>

                                            {/* Method */}
                                            <div className="flex items-center">
                                                <span className="text-sm text-slate-500">{METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</span>
                                            </div>

                                            {/* Status */}
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
                                                    {st.label}
                                                </span>
                                                {(p.proofUrl || p.proofDriveFileId) && (
                                                    <a
                                                        href={p.proofDriveFileId ? `/api/gdrive-proxy?fileId=${p.proofDriveFileId}` : (p.proofUrl || "#")}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-700"
                                                    >
                                                        <FileText className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* ── Pagination ── */}
                {total > pageSize && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">
                            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:bg-slate-100 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-slate-500 font-medium px-2">{page}/{totalPages}</span>
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

            {/* ══════════════════════════════════════════════════════════════════
                Record Payment Dialog
               ══════════════════════════════════════════════════════════════════ */}
            <Dialog open={createOpen} onOpenChange={(o) => { if (!o) resetDialog(); else setCreateOpen(true) }}>
                <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Record Payment</DialogTitle>
                        <DialogDescription className="text-sm text-slate-400">
                            Walk-in or office payment. Amounts from HOA config.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-1">
                        {/* ── Homeowner ── */}
                        {selectedHo ? (
                            <div className="flex items-center gap-3 bg-emerald-50/80 border border-emerald-200/60 rounded-xl p-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                    <User2 className="w-5 h-5 text-emerald-700" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-semibold text-slate-900 truncate">{selectedHo.name}</p>
                                    {selectedHo.address && <p className="text-sm text-slate-500">{selectedHo.address}</p>}
                                </div>
                                <button onClick={() => { setSelectedHo(null); setHoSearch(""); setHoVehicles([]) }} className="text-slate-400 hover:text-slate-700 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input placeholder="Search homeowner…" value={hoSearch} onChange={e => setHoSearch(e.target.value)} className="pl-9 h-11 rounded-xl text-base" />
                                {hoOptions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50">
                                        {hoOptions.map(h => (
                                            <button key={h.id} onClick={() => selectHomeowner(h)}
                                                className="w-full text-left px-3 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 first:rounded-t-xl last:rounded-b-xl">
                                                <p className="text-base font-medium text-slate-900">{h.name}</p>
                                                {h.address && <p className="text-sm text-slate-500">{h.address}</p>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {hoSearching && <p className="text-sm text-slate-400 mt-1 pl-1">Searching…</p>}
                            </div>
                        )}

                        {/* ── Method ── */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                            {(["cash", "gcash", "bank_transfer", "check"] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setGlobalMethod(m)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${globalMethod === m
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    {METHOD_LABELS[m]}
                                </button>
                            ))}
                        </div>

                        {/* ── Line Items ── */}
                        <div className="space-y-2">
                            <AnimatePresence mode="popLayout">
                                {lineItems.map((li) => (
                                    <motion.div
                                        key={li.id}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-sm">
                                            {/* Fee type + price + remove */}
                                            <div className="flex items-center gap-2">
                                                <Select value={li.feeType} onValueChange={v => updateItem(li.id, { feeType: v as LineItem["feeType"] })}>
                                                    <SelectTrigger className="h-10 text-sm rounded-lg flex-1 border-slate-200"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="car_sticker">🚗 Car Sticker</SelectItem>
                                                        <SelectItem value="annual_dues">📋 Annual Dues</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <span className="text-base font-bold text-slate-900 shrink-0 tabular-nums">
                                                    ₱{(li.feeType === "car_sticker" ? stickerPrice : duesAmount).toLocaleString()}
                                                </span>
                                                {lineItems.length > 1 && (
                                                    <button onClick={() => removeItem(li.id)} className="text-slate-300 hover:text-red-500 transition-colors p-0.5">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Car sticker details */}
                                            {li.feeType === "car_sticker" && (
                                                <div className="space-y-1.5">
                                                    {/* Vehicle dropdown */}
                                                    {hoVehicles.length > 0 && (
                                                        <Select value={li.vehicleId || "__new__"} onValueChange={v => selectVehicle(li.id, v)}>
                                                            <SelectTrigger className="h-10 text-sm rounded-lg border-slate-200">
                                                                <SelectValue placeholder="Select vehicle" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {hoVehicles.map(v => (
                                                                    <SelectItem key={v.id} value={v.id}>
                                                                        <span className="flex items-center gap-1">
                                                                            <Car className="w-3 h-3 text-slate-400" />
                                                                            {v.plateNo} — {[v.make, v.model].filter(Boolean).join(" ") || "–"} {v.category ? `(${v.category})` : ""}
                                                                        </span>
                                                                    </SelectItem>
                                                                ))}
                                                                <SelectItem value="__new__">+ New Vehicle</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}

                                                    {/* New vehicle fields */}
                                                    {(!li.vehicleId || hoVehicles.length === 0) && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <Input className="h-9 text-sm rounded-lg" placeholder="Plate No" value={li.plateNo} onChange={e => updateItem(li.id, { plateNo: e.target.value })} />
                                                            <Input className="h-9 text-sm rounded-lg" placeholder="Make" value={li.make} onChange={e => updateItem(li.id, { make: e.target.value })} />
                                                            <Input className="h-9 text-sm rounded-lg" placeholder="Model" value={li.model} onChange={e => updateItem(li.id, { model: e.target.value })} />
                                                            <Select value={li.category || "none"} onValueChange={v => updateItem(li.id, { category: v === "none" ? "" : v })}>
                                                                <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue placeholder="Category" /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">Category</SelectItem>
                                                                    <SelectItem value="Sedan">Sedan</SelectItem>
                                                                    <SelectItem value="SUV">SUV</SelectItem>
                                                                    <SelectItem value="Van">Van</SelectItem>
                                                                    <SelectItem value="Truck">Truck</SelectItem>
                                                                    <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                                                                    <SelectItem value="Electric">Electric</SelectItem>
                                                                    <SelectItem value="ELF">ELF</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}

                                                    <Input className="h-10 text-sm rounded-lg" placeholder="Sticker # (from physical sticker)" value={li.stickerCode} onChange={e => updateItem(li.id, { stickerCode: e.target.value })} />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            <button
                                onClick={() => setLineItems(prev => [...prev, makeBlankItem()])}
                                className="w-full flex items-center justify-center gap-1.5 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Add Item
                            </button>
                        </div>

                        {/* ── Total ── */}
                        <div className="bg-slate-900 rounded-xl p-3.5 flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase font-semibold text-slate-400 tracking-wide">Total</p>
                                <p className="text-sm text-slate-300">{lineItems.length} item{lineItems.length > 1 ? "s" : ""} • {METHOD_LABELS[globalMethod]}</p>
                            </div>
                            <p className="text-2xl font-bold text-white tabular-nums">
                                ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        </div>

                        {/* Notes */}
                        <Input placeholder="Notes / OR# (optional)" value={globalNotes} onChange={e => setGlobalNotes(e.target.value)} className="h-11 text-base rounded-xl" />

                        <Button
                            onClick={handleCreate}
                            disabled={creating || !selectedHo}
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-base"
                        >
                            {creating ? "Recording…" : `Record ${lineItems.length} Payment${lineItems.length > 1 ? "s" : ""}`}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
