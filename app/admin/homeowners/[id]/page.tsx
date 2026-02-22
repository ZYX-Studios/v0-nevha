"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Homeowner, Member, Sticker, Payment } from "@/lib/types"
import {
  ArrowLeft, Calendar, Home, Phone, User2, UsersRound, Tag, Mail, MapPin,
  CircleDollarSign, ExternalLink, DollarSign, Edit, CheckCircle2, XCircle,
  Clock, CreditCard, FileText, ChevronRight,
} from "lucide-react"

// ── helpers ──────────────────────────────────────────────────────────────────

const formatSuffix = (s?: string | null) => {
  if (!s) return ""
  const lower = s.toLowerCase().replace(/\.$/, "")
  if (lower === "jr") return "Jr."
  if (lower === "sr") return "Sr."
  if (["ii", "iii", "iv", "v"].includes(lower)) return lower.toUpperCase()
  return s
}

const formatDateLocal = (input?: string | null) => {
  if (!input) return ""
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(input)
  let d: Date
  if (m) { const [y, mo, da] = input.split("-").map(Number); d = new Date(y, (mo as number) - 1, da as number) }
  else d = new Date(input)
  if (isNaN(d.getTime())) return input
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

const formatCurrency = (amount?: number | null) => {
  if (typeof amount !== "number") return ""
  return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const ensureHttp = (url?: string | null) => {
  if (!url) return ""
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

const sanitizeNA = (val?: string | null) => {
  if (!val) return ""
  const s = String(val).trim()
  const lower = s.toLowerCase()
  if (!s || lower === "na" || lower === "n/a" || lower === "n.a." || lower === "-" || lower === "none") return ""
  return s
}

const sanitizeNotes = (val?: string | null) => {
  if (!val) return ""
  let s = String(val)
  s = s.replace(/(^|\s*[|•\-]\s*)Contact:\s*[+()\-\d\s]+/gi, (_, p1) => (p1 ? "" : ""))
  s = s.replace(/(^|\s*[|•\-]\s*)FB:\s*(NA|N\/A|N\.A\.|-|none)\b/gi, (_, p1) => (p1 ? "" : ""))
  s = s.replace(/\s*\|\s*/g, " | ").replace(/\s{2,}/g, " ")
  s = s.replace(/^(\s*[|•\-]\s*)+/, "").replace(/(\s*[|•\-]\s*)+$/, "").trim()
  return sanitizeNA(s)
}

const METHOD_LABELS: Record<string, string> = {
  gcash: "GCash",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  check: "Check",
}

const FEE_TYPE_LABELS: Record<string, string> = {
  annual_dues: "Annual Dues",
  car_sticker: "Car Sticker",
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  verified: { label: "Verified", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
}

// ── component ─────────────────────────────────────────────────────────────────

export default function HomeownerDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [homeowner, setHomeowner] = useState<Homeowner | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [duesStatus, setDuesStatus] = useState<any>(null)

  // Create forms
  const [memberForm, setMemberForm] = useState({ fullName: "", relation: "" })
  const [stickerForm, setStickerForm] = useState({
    code: "", vehiclePlateNo: "", make: "", model: "", category: "",
    amountPaid: "", issuedAt: "", notes: "",
  })

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", middleInitial: "", suffix: "",
    block: "", lot: "", phase: "", street: "", unitNumber: "",
    contactNumber: "", email: "", facebookProfile: "",
    isOwner: "true", moveInDate: "", residencyStartDate: "",
    lengthOfResidency: "",
    emergencyContactName: "", emergencyContactPhone: "", notes: "",
  })

  const [savingMember, setSavingMember] = useState(false)
  const [savingSticker, setSavingSticker] = useState(false)

  useEffect(() => {
    if (homeowner) {
      setEditForm({
        firstName: homeowner.firstName || "",
        lastName: homeowner.lastName || "",
        middleInitial: homeowner.middleInitial || "",
        suffix: (homeowner as any).suffix || "",
        block: homeowner.block || "",
        lot: homeowner.lot || "",
        phase: homeowner.phase || "",
        street: homeowner.street || "",
        unitNumber: (homeowner as any).unitNumber || "",
        contactNumber: homeowner.contactNumber || "",
        email: (homeowner as any).email || "",
        facebookProfile: (homeowner as any).facebookProfile || "",
        isOwner: homeowner.isOwner ? "true" : "false",
        moveInDate: homeowner.moveInDate || "",
        residencyStartDate: (homeowner as any).residencyStartDate || "",
        lengthOfResidency: homeowner.lengthOfResidency != null ? String(homeowner.lengthOfResidency) : "",
        emergencyContactName: homeowner.emergencyContactName || "",
        emergencyContactPhone: homeowner.emergencyContactPhone || "",
        notes: (homeowner as any).notes || "",
      })
    }
  }, [homeowner])

  const refreshAll = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [dRes, mRes, sRes, pRes] = await Promise.all([
        fetch(`/api/admin/homeowners/${id}`, { cache: "no-store" }),
        fetch(`/api/admin/homeowners/${id}/members`, { cache: "no-store" }),
        fetch(`/api/admin/homeowners/${id}/stickers`, { cache: "no-store" }),
        fetch(`/api/admin/homeowners/${id}/payments`, { cache: "no-store" }),
      ])

      const dJson = await dRes.json().catch(() => null)
      const mJson = await mRes.json().catch(() => null)
      const sJson = await sRes.json().catch(() => null)
      const pJson = await pRes.json().catch(() => null)

      if (!dRes.ok) throw new Error(dJson?.error || "Failed to load homeowner")
      setHomeowner(dJson.item)
      setMembers(mJson?.items || [])
      setStickers(sJson?.items || [])
      setPayments(pJson?.items || [])

      // Dues fetch — isolated so it doesn't block the page
      try {
        const duRes = await fetch(`/api/admin/homeowners/dues-status?homeowner_ids=${id}&year=${new Date().getFullYear()}`, { cache: "no-store" })
        const duJson = await duRes.json().catch(() => null)
        setDuesStatus(duJson?.dues_status?.[id] || null)
      } catch {
        setDuesStatus(null) // Fail silently — dues info is optional
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refreshAll() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const onUpdate = async () => {
    if (!id) return
    setEditSaving(true)
    setError(null)
    try {
      const payload = {
        firstName: editForm.firstName.trim() || null,
        lastName: editForm.lastName.trim() || null,
        middleInitial: editForm.middleInitial.trim() || null,
        suffix: editForm.suffix.trim() || null,
        block: editForm.block.trim() || null,
        lot: editForm.lot.trim() || null,
        phase: editForm.phase.trim() || null,
        street: editForm.street.trim() || null,
        unitNumber: editForm.unitNumber.trim() || null,
        contactNumber: editForm.contactNumber.trim() || null,
        email: editForm.email.trim() || null,
        facebookProfile: editForm.facebookProfile.trim() || null,
        isOwner: editForm.isOwner === "true",
        moveInDate: editForm.moveInDate || null,
        residencyStartDate: editForm.residencyStartDate || null,
        lengthOfResidency: editForm.lengthOfResidency,
        emergencyContactName: editForm.emergencyContactName.trim() || null,
        emergencyContactPhone: editForm.emergencyContactPhone.trim() || null,
        notes: editForm.notes.trim() || null,
      }
      const res = await fetch(`/api/admin/homeowners/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to update homeowner")
      setEditOpen(false)
      toast.success("Homeowner updated")
      refreshAll()
    } catch (e: any) {
      toast.error(e.message || "Failed to update homeowner")
    } finally {
      setEditSaving(false)
    }
  }

  const onCreateMember = async () => {
    if (!id) return
    setSavingMember(true)
    try {
      const res = await fetch(`/api/admin/homeowners/${id}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: memberForm.fullName.trim(), relation: memberForm.relation.trim() || null }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to add member")
      setMemberForm({ fullName: "", relation: "" })
      toast.success("Member added")
      refreshAll()
    } catch (e: any) { toast.error(e?.message || "Failed") }
    finally { setSavingMember(false) }
  }

  const setIssuedToday = () => {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    setStickerForm(f => ({ ...f, issuedAt: local }))
  }

  const onUpsertSticker = async () => {
    if (!id) return
    setSavingSticker(true)
    try {
      const payload = {
        code: stickerForm.code.trim(),
        vehiclePlateNo: stickerForm.vehiclePlateNo.trim() || null,
        vehicleMake: stickerForm.make.trim() || null,
        vehicleModel: stickerForm.model.trim() || null,
        vehicleCategory: stickerForm.category || null,
        issuedAt: stickerForm.issuedAt || null,
        amountPaid: stickerForm.amountPaid !== "" ? Number(stickerForm.amountPaid) : null,
        notes: stickerForm.notes.trim() || null,
      }
      const res = await fetch(`/api/admin/homeowners/${id}/stickers`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to save sticker")
      setStickerForm({ code: "", vehiclePlateNo: "", make: "", model: "", category: "", amountPaid: "", issuedAt: "", notes: "" })
      toast.success("Sticker saved")
      refreshAll()
    } catch (e: any) { toast.error(e?.message || "Failed") }
    finally { setSavingSticker(false) }
  }

  // Derived
  const headerName = useMemo(() => {
    if (!homeowner) return ""
    const base = `${homeowner.firstName ?? ""} ${homeowner.lastName ?? ""}`.trim()
    const suffix = formatSuffix((homeowner as any).suffix)
    return [base, suffix].filter(Boolean).join(" ").trim() || (homeowner as any).fullName || ""
  }, [homeowner])

  const headerAddress = useMemo(() => {
    if (!homeowner) return ""
    const parts: string[] = []
    if (homeowner.block) parts.push(`Blk ${homeowner.block}`)
    if (homeowner.lot) parts.push(`Lot ${homeowner.lot}`)
    if (homeowner.phase) parts.push(`Ph ${homeowner.phase}`)
    if (homeowner.street) parts.push(homeowner.street)
    return parts.join(", ") || homeowner.propertyAddress || ""
  }, [homeowner])

  const getDuesStatusBadge = () => {
    if (!duesStatus) return null
    if (duesStatus.is_paid_in_full) return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Paid in Full</Badge>
    if (duesStatus.amount_paid > 0) return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Partial</Badge>
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">Unpaid</Badge>
  }

  if (loading && !homeowner) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <button onClick={() => router.push("/admin/homeowners")} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 truncate">{headerName || "Homeowner"}</h1>
              {typeof homeowner?.isOwner === "boolean" && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${homeowner.isOwner ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                  {homeowner.isOwner ? "Owner" : "Renter"}
                </span>
              )}
              {getDuesStatusBadge()}
            </div>
            <p className="text-sm text-slate-400 truncate">{headerAddress}</p>
          </div>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-sm shrink-0">
                <Edit className="w-4 h-4" /> Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Homeowner</DialogTitle>
                <DialogDescription>Update homeowner details</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Name</Label>
                  <div className="grid grid-cols-4 gap-2">
                    <Input placeholder="First" value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} />
                    <Input placeholder="Last" value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} />
                    <Input placeholder="M.I." value={editForm.middleInitial} onChange={e => setEditForm(f => ({ ...f, middleInitial: e.target.value }))} />
                    <Input placeholder="Suffix" value={editForm.suffix} onChange={e => setEditForm(f => ({ ...f, suffix: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Ownership</Label>
                  <Select value={editForm.isOwner} onValueChange={v => setEditForm(f => ({ ...f, isOwner: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Owner</SelectItem><SelectItem value="false">Renter</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Unit</Label><Input placeholder="Unit" value={editForm.unitNumber} onChange={e => setEditForm(f => ({ ...f, unitNumber: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Block</Label><Input value={editForm.block} onChange={e => setEditForm(f => ({ ...f, block: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Lot</Label><Input value={editForm.lot} onChange={e => setEditForm(f => ({ ...f, lot: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Phase</Label><Input value={editForm.phase} onChange={e => setEditForm(f => ({ ...f, phase: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Street</Label><Input value={editForm.street} onChange={e => setEditForm(f => ({ ...f, street: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={editForm.contactNumber} onChange={e => setEditForm(f => ({ ...f, contactNumber: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="space-y-1.5 md:col-span-2"><Label className="text-xs">Facebook</Label><Input value={editForm.facebookProfile} onChange={e => setEditForm(f => ({ ...f, facebookProfile: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Move-in Date</Label><Input type="date" value={editForm.moveInDate} onChange={e => setEditForm(f => ({ ...f, moveInDate: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Residency Start</Label><Input type="date" value={editForm.residencyStartDate} onChange={e => setEditForm(f => ({ ...f, residencyStartDate: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Length (yrs)</Label><Input type="number" value={editForm.lengthOfResidency} onChange={e => setEditForm(f => ({ ...f, lengthOfResidency: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Emergency Name</Label><Input value={editForm.emergencyContactName} onChange={e => setEditForm(f => ({ ...f, emergencyContactName: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Emergency Phone</Label><Input value={editForm.emergencyContactPhone} onChange={e => setEditForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} /></div>
                <div className="space-y-1.5 md:col-span-2"><Label className="text-xs">Notes</Label><Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving} className="flex-1">Cancel</Button>
                <Button onClick={onUpdate} disabled={editSaving} className="flex-1 bg-blue-600 hover:bg-blue-700">{editSaving ? "Saving…" : "Save Changes"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Overview card */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-base">
            {(homeowner as any)?.unitNumber && <InfoRow icon={Home} label="Unit" value={(homeowner as any).unitNumber} />}
            {homeowner?.contactNumber && <InfoRow icon={Phone} label="Phone" value={homeowner.contactNumber} href={`tel:${homeowner.contactNumber}`} />}
            {sanitizeNA((homeowner as any)?.email) && <InfoRow icon={Mail} label="Email" value={sanitizeNA((homeowner as any)?.email)!} href={`mailto:${sanitizeNA((homeowner as any)?.email)}`} />}
            {sanitizeNA((homeowner as any)?.facebookProfile) && (
              <InfoRow icon={ExternalLink} label="Facebook" value="Profile" href={ensureHttp(sanitizeNA((homeowner as any)?.facebookProfile))} external />
            )}
            {homeowner?.moveInDate && <InfoRow icon={Calendar} label="Move-in" value={formatDateLocal(homeowner.moveInDate)} />}
            {(homeowner as any)?.residencyStartDate && <InfoRow icon={Calendar} label="Residency Start" value={formatDateLocal((homeowner as any).residencyStartDate)} />}
            {typeof homeowner?.lengthOfResidency === "number" && <InfoRow icon={Calendar} label="Residency" value={`${homeowner.lengthOfResidency} ${homeowner.lengthOfResidency === 1 ? "year" : "years"}`} />}
            {homeowner?.street && <InfoRow icon={MapPin} label="Street" value={homeowner.street} />}
            {homeowner?.emergencyContactName && <InfoRow icon={User2} label="Emergency" value={homeowner.emergencyContactName} />}
            {homeowner?.emergencyContactPhone && <InfoRow icon={Phone} label="Emergency Ph" value={homeowner.emergencyContactPhone} href={`tel:${homeowner.emergencyContactPhone}`} />}
            {duesStatus && (
              <InfoRow icon={DollarSign} label={`Dues ${new Date().getFullYear()}`} value={`${formatCurrency(duesStatus.amount_paid)} / ${formatCurrency(duesStatus.annual_amount)}`} />
            )}
            {duesStatus?.balance_due > 0 && (
              <div className="flex items-center gap-2 text-red-600"><DollarSign className="w-4 h-4 shrink-0" /><span className="text-sm font-semibold">Balance: {formatCurrency(duesStatus.balance_due)}</span></div>
            )}
          </div>

          {sanitizeNotes((homeowner as any)?.notes) && (
            <div className="pt-2 border-t border-slate-50">
              <p className="text-sm text-slate-400 font-medium mb-0.5">Notes</p>
              <p className="text-base text-slate-600 whitespace-pre-wrap">{sanitizeNotes((homeowner as any)?.notes)}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="members">
          <TabsList className="bg-slate-100 p-1 rounded-lg h-auto gap-1">
            <TabsTrigger value="members" className="gap-1.5 text-sm px-3.5 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <UsersRound className="w-4 h-4" /> Members {members.length > 0 && <span className="text-xs text-slate-400">({members.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="stickers" className="gap-1.5 text-sm px-3.5 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Tag className="w-4 h-4" /> Stickers {stickers.length > 0 && <span className="text-xs text-slate-400">({stickers.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5 text-sm px-3.5 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <CreditCard className="w-4 h-4" /> Payments {payments.length > 0 && <span className="text-xs text-slate-400">({payments.length})</span>}
            </TabsTrigger>
          </TabsList>

          {/* ── Members ───────────────────────────────────────────────────── */}
          <TabsContent value="members" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                {members.length === 0 ? (
                  <EmptyState icon={UsersRound} text="No household members" />
                ) : members.map(m => (
                  <div key={m.id} className="bg-white rounded-lg border border-slate-100 shadow-sm p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><User2 className="w-4.5 h-4.5 text-slate-400" /></div>
                    <div><p className="text-base font-medium text-slate-900">{m.fullName}</p><p className="text-sm text-slate-400">{m.relation || "—"}</p></div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 space-y-3 h-fit">
                <p className="text-sm font-semibold text-slate-500 uppercase">Add Member</p>
                <Input placeholder="Full Name" value={memberForm.fullName} onChange={e => setMemberForm(f => ({ ...f, fullName: e.target.value }))} />
                <Select value={memberForm.relation} onValueChange={v => setMemberForm(f => ({ ...f, relation: v }))}>
                  <SelectTrigger><SelectValue placeholder="Relation" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Child of homeowner/tenant">Child</SelectItem>
                    <SelectItem value="Spouse of homeowner/tenant">Spouse</SelectItem>
                    <SelectItem value="Relative of homeowner/tenant">Relative</SelectItem>
                    <SelectItem value="Parent of homeowner/tenant">Parent</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={onCreateMember} disabled={savingMember || !memberForm.fullName.trim()} className="w-full bg-blue-600 hover:bg-blue-700">
                  {savingMember ? "Adding…" : "Add Member"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── Stickers ──────────────────────────────────────────────────── */}
          <TabsContent value="stickers" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                {stickers.length === 0 ? (
                  <EmptyState icon={Tag} text="No stickers" />
                ) : stickers.map(s => (
                  <div key={s.id} className="bg-white rounded-lg border border-slate-100 shadow-sm p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base font-semibold text-slate-900">{s.code}</span>
                      <Badge className={`border-0 text-xs ${s.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : s.status === "EXPIRED" ? "bg-slate-100 text-slate-500" : "bg-red-100 text-red-700"}`}>
                        {s.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-500 space-y-0.5">
                      {s.vehiclePlateNo && <p>Plate: {s.vehiclePlateNo} {[s.vehicleMake, s.vehicleModel].filter(Boolean).join(" ")}</p>}
                      <p>Issued: {formatDateLocal(s.issuedAt)} {typeof s.amountPaid === "number" ? `• ${formatCurrency(s.amountPaid)}` : ""}</p>
                      {s.notes && <p className="text-slate-400">Note: {s.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 space-y-3 h-fit">
                <p className="text-sm font-semibold text-slate-500 uppercase">Add Sticker</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Sticker No" value={stickerForm.code} onChange={e => setStickerForm(f => ({ ...f, code: e.target.value }))} />
                  <Input placeholder="Plate No" value={stickerForm.vehiclePlateNo} onChange={e => setStickerForm(f => ({ ...f, vehiclePlateNo: e.target.value }))} />
                  <Input placeholder="Make" value={stickerForm.make} onChange={e => setStickerForm(f => ({ ...f, make: e.target.value }))} />
                  <Input placeholder="Model" value={stickerForm.model} onChange={e => setStickerForm(f => ({ ...f, model: e.target.value }))} />
                  <Input type="number" placeholder="Amount" value={stickerForm.amountPaid} onChange={e => setStickerForm(f => ({ ...f, amountPaid: e.target.value }))} />
                  <div className="space-y-0.5">
                    <Input type="date" value={stickerForm.issuedAt} onChange={e => setStickerForm(f => ({ ...f, issuedAt: e.target.value }))} />
                    <button type="button" onClick={setIssuedToday} className="text-xs text-blue-600 hover:underline">Set today</button>
                  </div>
                  <Select value={stickerForm.category} onValueChange={v => setStickerForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sedan">Sedan</SelectItem><SelectItem value="Van">Van</SelectItem>
                      <SelectItem value="SUV">SUV</SelectItem><SelectItem value="Truck">Truck</SelectItem>
                      <SelectItem value="Motorcycle">Motorcycle</SelectItem><SelectItem value="Electric">Electric</SelectItem>
                      <SelectItem value="ELF">ELF</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Notes" value={stickerForm.notes} onChange={e => setStickerForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <Button onClick={onUpsertSticker} disabled={savingSticker || !stickerForm.code.trim()} className="w-full bg-blue-600 hover:bg-blue-700">
                  {savingSticker ? "Saving…" : "Add Sticker"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── Payments ──────────────────────────────────────────────────── */}
          <TabsContent value="payments" className="mt-4 space-y-2">
            {payments.length === 0 ? (
              <EmptyState icon={CreditCard} text="No payments recorded" />
            ) : payments.map(p => {
              const sb = STATUS_BADGE[p.status] || STATUS_BADGE.pending
              return (
                <div key={p.id} className="bg-white rounded-lg border border-slate-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${p.status === "verified" ? "bg-emerald-50" : p.status === "rejected" ? "bg-red-50" : "bg-amber-50"
                        }`}>
                        {p.status === "verified" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                          p.status === "rejected" ? <XCircle className="w-4 h-4 text-red-500" /> :
                            <Clock className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-base font-semibold text-slate-900">{formatCurrency(p.amount)}</span>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sb.className}`}>{sb.label}</span>
                        </div>
                        <div className="text-sm text-slate-500 space-y-0.5">
                          <p>{FEE_TYPE_LABELS[p.fee_type] || p.fee_type} • {p.fee_year} • {METHOD_LABELS[p.payment_method] || p.payment_method}</p>
                          <p>Submitted {formatDateLocal(p.created_at)}</p>
                          {p.verified_at && <p>{p.status === "verified" ? "Verified" : "Reviewed"} {formatDateLocal(p.verified_at)}</p>}
                          {p.admin_notes && <p className="text-slate-400">Note: {p.admin_notes}</p>}
                        </div>
                      </div>
                    </div>
                    {(p.proof_url || p.proof_drive_file_id) && (
                      <a
                        href={p.proof_drive_file_id ? `/api/gdrive-proxy?fileId=${p.proof_drive_file_id}` : p.proof_url}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline shrink-0"
                      >
                        <FileText className="w-3 h-3" /> Proof
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// ── small sub-components ──────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, href, external }: {
  icon: React.ElementType; label: string; value: string; href?: string; external?: boolean
}) {
  const content = href ? (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="text-blue-600 hover:underline truncate">{value}</a>
  ) : <span className="text-slate-700 truncate">{value}</span>

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
      <span className="text-sm text-slate-400 shrink-0">{label}:</span>
      <span className="text-sm truncate">{content}</span>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-10 text-center">
      <Icon className="w-10 h-10 text-slate-200 mx-auto mb-2" />
      <p className="text-base text-slate-400">{text}</p>
    </div>
  )
}
