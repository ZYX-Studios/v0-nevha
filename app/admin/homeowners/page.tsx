"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import type { Homeowner } from "@/lib/types"
import {
  Search, Plus, Home, Users, ChevronLeft, ChevronRight,
  Download, X, Phone, Mail, MapPin, ArrowUpDown, SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"

// ── helpers ──────────────────────────────────────────────────────────────────

const formatSuffix = (s?: string | null) => {
  if (!s) return ""
  const lower = s.toLowerCase().replace(/\.$/, "")
  if (lower === "jr") return "Jr."
  if (lower === "sr") return "Sr."
  if (["ii", "iii", "iv", "v"].includes(lower)) return lower.toUpperCase()
  return s
}

const displayName = (h: Homeowner) => {
  const base = [h.firstName, h.lastName].filter(Boolean).join(" ").trim()
  const withSuffix = [base, formatSuffix((h as any).suffix)].filter(Boolean).join(" ").trim()
  return withSuffix || (h as any).fullName || "—"
}

const EMPTY_FORM = {
  firstName: "", lastName: "", middleInitial: "", suffix: "",
  phase: "", block: "", lot: "", street: "",
  contactNumber: "", email: "", facebookProfile: "",
  isOwner: "true", moveInDate: "",
  emergencyContactName: "", emergencyContactPhone: "",
  lengthOfResidency: "", notes: "",
}

// ── component ─────────────────────────────────────────────────────────────────

export default function HomeownersPage() {
  const router = useRouter()
  const [items, setItems] = useState<Homeowner[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState("")
  const [owner, setOwner] = useState("all")
  const [sort, setSort] = useState<"created_at" | "name" | "address" | "move_in_date">("created_at")
  const [order, setOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)

  // Advanced filters (collapsed by default)
  const [showFilters, setShowFilters] = useState(false)
  const [phase, setPhase] = useState("")
  const [block, setBlock] = useState("")
  const [lot, setLot] = useState("")

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchItems = useCallback(async (query = q) => {
    setLoading(true)
    try {
      const url = new URL("/api/admin/homeowners", window.location.origin)
      if (query.trim()) url.searchParams.set("q", query.trim())
      if (owner !== "all") url.searchParams.set("owner", owner)
      if (phase) url.searchParams.set("phase", phase)
      if (block) url.searchParams.set("block", block)
      if (lot) url.searchParams.set("lot", lot)
      url.searchParams.set("sort", sort)
      url.searchParams.set("order", order)
      url.searchParams.set("page", String(page))
      url.searchParams.set("pageSize", String(pageSize))

      const res = await fetch(url.toString(), { cache: "no-store" })
      const text = await res.text()
      let json: any
      try { json = text ? JSON.parse(text) : null }
      catch { throw new Error("Access denied. Please sign in as an admin.") }
      if (!res.ok) throw new Error(json?.error || "Failed to load homeowners")

      setItems(json.items || [])
      setTotal(typeof json.total === "number" ? json.total : 0)
    } catch (e: any) {
      toast.error(e?.message || "Failed to load homeowners")
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, phase, block, lot, sort, order, page, pageSize])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchItems(q) }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleSort = (col: "name" | "address" | "move_in_date") => {
    setPage(1)
    if (sort === col) setOrder(o => o === "asc" ? "desc" : "asc")
    else { setSort(col); setOrder("asc") }
  }

  const handleExportCsv = () => {
    const csv = [["Name", "Address", "Type", "Move-in", "Phone", "Email"],
    ...items.map(h => [
      displayName(h), h.propertyAddress || "",
      h.isOwner ? "Owner" : "Renter", h.moveInDate || "",
      h.contactNumber || "", (h as any).email || "",
    ])
    ].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `homeowners-p${page}.csv`,
    })
    a.click()
  }

  const onCreate = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        isOwner: form.isOwner === "true",
        moveInDate: form.moveInDate || null,
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        middleInitial: form.middleInitial.trim() || null,
        suffix: form.suffix.trim() || null,
        phase: form.phase.trim() || null,
        block: form.block.trim() || null,
        lot: form.lot.trim() || null,
        street: form.street.trim() || null,
        contactNumber: form.contactNumber.trim() || null,
        email: form.email.trim() || null,
        facebookProfile: form.facebookProfile.trim() || null,
        emergencyContactName: form.emergencyContactName.trim() || null,
        emergencyContactPhone: form.emergencyContactPhone.trim() || null,
        lengthOfResidency: form.lengthOfResidency !== "" ? Number(form.lengthOfResidency) : null,
        notes: form.notes.trim() || null,
      }
      const res = await fetch("/api/admin/homeowners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const txt = await res.text()
      let json: any
      try { json = txt ? JSON.parse(txt) : null } catch { throw new Error("Access denied.") }
      if (!res.ok) throw new Error(json?.error || "Failed to create homeowner")
      toast.success("Homeowner created")
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      fetchItems()
    } catch (e: any) {
      toast.error(e?.message || "Failed to create homeowner")
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = Boolean(form.street.trim() || (form.block.trim() && form.lot.trim()))
  const totalPages = Math.ceil(total / pageSize)
  const activeFilters = [phase, block, lot, owner !== "all" ? owner : ""].filter(Boolean).length

  const SortBtn = ({ col, label }: { col: "name" | "address" | "move_in_date"; label: string }) => (
    <button onClick={() => handleSort(col)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-700 transition-colors">
      {label}
      <ArrowUpDown className={`w-3.5 h-3.5 ${sort === col ? "text-blue-600" : ""}`} />
    </button>
  )

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 sm:px-6 py-3.5 flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900 leading-none">Homeowners</h1>
          <p className="text-xs text-slate-400 mt-0.5">{total.toLocaleString()} records</p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> New
        </Button>
      </header>

      <main className="px-4 sm:px-6 py-4 max-w-6xl mx-auto space-y-3">
        {/* Search bar */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-3 flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, address, or plate…"
              value={q}
              onChange={e => setQ(e.target.value)}
              className="pl-9 h-10 rounded-xl border-slate-200 text-base"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-sm font-semibold border transition-all ${showFilters || activeFilters > 0
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
          </button>
          <button
            onClick={handleExportCsv}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Advanced filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Type</Label>
                  <Select value={owner} onValueChange={v => { setOwner(v); setPage(1) }}>
                    <SelectTrigger className="h-9 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="renter">Renter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Phase</Label>
                  <Input value={phase} onChange={e => { setPhase(e.target.value); setPage(1) }} placeholder="e.g., 1" className="h-9 text-sm rounded-lg" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Block</Label>
                  <Input value={block} onChange={e => { setBlock(e.target.value); setPage(1) }} placeholder="e.g., B2" className="h-9 text-sm rounded-lg" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase text-slate-400 font-semibold">Lot</Label>
                  <Input value={lot} onChange={e => { setLot(e.target.value); setPage(1) }} placeholder="e.g., L10" className="h-9 text-sm rounded-lg" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results table */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_1fr_90px_130px_48px] gap-x-4 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
            <SortBtn col="name" label="Name" />
            <SortBtn col="address" label="Address" />
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Type</span>
            <SortBtn col="move_in_date" label="Move-in" />
            <span />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2">
              <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Loading…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Home className="w-10 h-10 text-slate-200 mx-auto" />
              <p className="text-sm text-slate-400">{q ? "No results found" : "No homeowners yet"}</p>
              {!q && (
                <Button size="sm" onClick={() => setCreateOpen(true)} className="rounded-full gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add First Homeowner
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {items.map((h) => (
                <button
                  key={h.id}
                  onClick={() => router.push(`/admin/homeowners/${h.id}`)}
                  className="w-full grid grid-cols-[1fr_1fr_90px_130px_48px] gap-x-4 px-4 py-3.5 text-left hover:bg-slate-50/60 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {displayName(h)}
                    </p>
                    {(h as any).email && (
                      <p className="text-sm text-slate-400 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 shrink-0" />
                        {(h as any).email}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base text-slate-600 truncate">{h.propertyAddress || "—"}</p>
                    {h.contactNumber && (
                      <p className="text-sm text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 shrink-0" />
                        {h.contactNumber}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${h.isOwner
                      ? "bg-blue-50 text-blue-700 border-blue-100"
                      : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}>
                      {h.isOwner ? "Owner" : "Renter"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 self-center">
                    {h.moveInDate ? new Date(h.moveInDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                  </p>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 self-center transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-slate-400">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-500 font-medium px-2">Page {page} / {totalPages}</span>
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

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-lg">
          <DialogHeader>
            <DialogTitle>New Homeowner</DialogTitle>
            <DialogDescription>Add a new homeowner record</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Name row */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="First name" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="rounded-xl" />
                <Input placeholder="Last name" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="rounded-xl" />
                <Input placeholder="M.I." value={form.middleInitial} onChange={e => setForm(f => ({ ...f, middleInitial: e.target.value }))} className="rounded-xl" />
                <Input placeholder="Suffix (Jr., Sr.…)" value={form.suffix} onChange={e => setForm(f => ({ ...f, suffix: e.target.value }))} className="rounded-xl" />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Address <span className="text-red-400">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Phase" value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))} className="rounded-xl" />
                <Input placeholder="Block" value={form.block} onChange={e => setForm(f => ({ ...f, block: e.target.value }))} className="rounded-xl" />
                <Input placeholder="Lot" value={form.lot} onChange={e => setForm(f => ({ ...f, lot: e.target.value }))} className="rounded-xl" />
              </div>
              <Input placeholder="Street" value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} className="rounded-xl" />
            </div>

            {/* Type + Move-in */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</Label>
                <Select value={form.isOwner} onValueChange={v => setForm(f => ({ ...f, isOwner: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Owner</SelectItem>
                    <SelectItem value="false">Renter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Move-in Date</Label>
                <Input type="date" value={form.moveInDate} onChange={e => setForm(f => ({ ...f, moveInDate: e.target.value }))} className="rounded-xl" />
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Phone" value={form.contactNumber} onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))} className="rounded-xl" />
                <Input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="rounded-xl" />
              </div>
            </div>

            {/* Emergency + Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Emergency Contact</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Name" value={form.emergencyContactName} onChange={e => setForm(f => ({ ...f, emergencyContactName: e.target.value }))} className="rounded-xl" />
                <Input placeholder="Phone" value={form.emergencyContactPhone} onChange={e => setForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} className="rounded-xl" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving} className="flex-1 rounded-xl">Cancel</Button>
            <Button onClick={onCreate} disabled={saving || !canSubmit} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700">
              {saving ? "Creating…" : "Create Homeowner"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
