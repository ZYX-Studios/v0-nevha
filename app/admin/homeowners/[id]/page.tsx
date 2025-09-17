"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Homeowner, Member, Sticker } from "@/lib/types"
import { ArrowLeft, Calendar, Home, Phone, User2, UsersRound, Tag, Mail, MapPin, CircleDollarSign, ExternalLink, DollarSign } from "lucide-react"

export default function HomeownerDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const basePath = "/admin"

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [homeowner, setHomeowner] = useState<Homeowner | null>(null)

  const [members, setMembers] = useState<Member[]>([])
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [duesStatus, setDuesStatus] = useState<any>(null)

  // Create form states
  const [memberForm, setMemberForm] = useState({ fullName: "", relation: "" })
  const [stickerForm, setStickerForm] = useState({
    code: "",
    vehiclePlateNo: "",
    make: "",
    model: "",
    category: "",
    amountPaid: "",
    issuedAt: "",
    notes: "",
  })

  const [savingMember, setSavingMember] = useState(false)
  const [savingSticker, setSavingSticker] = useState(false)

  const getDuesStatusBadge = () => {
    if (!duesStatus) return null
    
    if (duesStatus.is_paid_in_full) {
      return <Badge className="bg-green-100 text-green-800">Paid in Full</Badge>
    } else if (duesStatus.amount_paid > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800">Partial Payment</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">Unpaid</Badge>
    }
  }

  const refreshAll = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [dRes, mRes, sRes, duRes] = await Promise.all([
        fetch(`/api/admin/homeowners/${id}`, { cache: "no-store" }),
        fetch(`/api/admin/homeowners/${id}/members`, { cache: "no-store" }),
        fetch(`/api/admin/homeowners/${id}/stickers`, { cache: "no-store" }),
        fetch(`/api/admin/homeowners/dues-status?homeowner_ids=${id}&year=${new Date().getFullYear()}`, { cache: "no-store" }),
      ])
      const dTxt = await dRes.text()
      const mTxt = await mRes.text()
      const sTxt = await sRes.text()
      const duTxt = await duRes.text()
      let dJson: any, mJson: any, sJson: any, duJson: any
      try { dJson = dTxt ? JSON.parse(dTxt) : null } catch { throw new Error("Access denied. Please sign in as an admin and try again.") }
      try { mJson = mTxt ? JSON.parse(mTxt) : null } catch { throw new Error("Access denied. Please sign in as an admin and try again.") }
      try { sJson = sTxt ? JSON.parse(sTxt) : null } catch { throw new Error("Access denied. Please sign in as an admin and try again.") }
      try { duJson = duTxt ? JSON.parse(duTxt) : null } catch { duJson = null }
      if (!dRes.ok) throw new Error(dJson?.error || "Failed to load homeowner")
      if (!mRes.ok) throw new Error(mJson?.error || "Failed to load members")
      if (!sRes.ok) throw new Error(sJson?.error || "Failed to load stickers")
      setHomeowner(dJson.item)
      setMembers(mJson.items || [])
      setStickers(sJson.items || [])
      setDuesStatus(duJson?.dues_status?.[id] || null)
    } catch (e: any) {
      setError(e?.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const headerSubtitle = useMemo(() => {
    if (!homeowner) return ""
    // Compute the display name (first + last + formatted suffix), fallback to fullName
    const formatSuffix = (s?: string | null) => {
      if (!s) return ""
      const lower = s.toLowerCase().replace(/\.$/, "")
      if (lower === "jr") return "Jr."
      if (lower === "sr") return "Sr."
      if (["ii", "iii", "iv", "v"].includes(lower)) return lower.toUpperCase()
      if (["2nd", "3rd", "4th", "5th"].includes(lower)) return lower
      return s
    }
    const baseName = `${homeowner.firstName ?? ""} ${homeowner.lastName ?? ""}`.trim()
    const suffix = formatSuffix((homeowner as any).suffix)
    const nameWithSuffix = [baseName, suffix].filter(Boolean).join(" ").trim() || (homeowner as any).fullName || ""
    return nameWithSuffix
  }, [homeowner])

  const headerAddress = useMemo(() => {
    if (!homeowner) return ""
    const parts: string[] = []
    if (homeowner.block) parts.push(`Block ${homeowner.block}`)
    if (homeowner.lot) parts.push(`Lot ${homeowner.lot}`)
    if (homeowner.phase) parts.push(`Phase ${homeowner.phase}`)
    if (homeowner.street) parts.push(`${homeowner.street}`)
    return parts.join(", ") || homeowner.propertyAddress || ""
  }, [homeowner])

  // Helpers
  const formatDateLocal = (input?: string | null) => {
    if (!input) return ""
    // Handle plain YYYY-MM-DD as local date to avoid TZ shift
    const m = /^\d{4}-\d{2}-\d{2}$/.exec(input)
    let d: Date
    if (m) {
      const [y, mo, da] = input.split("-").map(Number)
      d = new Date(y, (mo as number) - 1, da as number)
    } else {
      d = new Date(input)
    }
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
    if (!s) return ""
    const lower = s.toLowerCase()
    if (lower === "na" || lower === "n/a" || lower === "n.a." || lower === "-" || lower === "none") return ""
    return s
  }
  const sanitizeNotes = (val?: string | null) => {
    if (!val) return ""
    let s = String(val)
    // Remove segments like "Contact: 09xx..." possibly preceded by separators (|, •, -) or newlines
    s = s.replace(/(^|\s*[|•\-]\s*)Contact:\s*[+()\-\d\s]+/gi, (m, p1) => (p1 ? "" : ""))
    // Remove segments like "FB: NA/N.A./N/A/-/none"
    s = s.replace(/(^|\s*[|•\-]\s*)FB:\s*(NA|N\/A|N\.A\.|-|none)\b/gi, (m, p1) => (p1 ? "" : ""))
    // Collapse multiple separators and whitespace
    s = s.replace(/\s*\|\s*/g, " | ")
    s = s.replace(/\s{2,}/g, " ")
    s = s.replace(/^(\s*[|•\-]\s*)+/, "").replace(/(\s*[|•\-]\s*)+$/, "")
    s = s.trim()
    s = sanitizeNA(s)
    return s
  }

  const onCreateMember = async () => {
    if (!id) return
    setSavingMember(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/homeowners/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: memberForm.fullName.trim(),
          relation: memberForm.relation.trim() || null,
        }),
      })
      const txt = await res.text()
      let json: any = null
      try { json = txt ? JSON.parse(txt) : null } catch { throw new Error("Access denied. Please sign in as an admin.") }
      if (!res.ok) throw new Error(json?.error || "Failed to add member")
      setMemberForm({ fullName: "", relation: "" })
      refreshAll()
    } catch (e: any) {
      setError(e?.message || "Failed to add member")
    } finally {
      setSavingMember(false)
    }
  }

  // Vehicles are displayed inline with stickers; creating a sticker can optionally link a vehicle by plate.

  const setIssuedToday = () => {
    const now = new Date()
    const tzOffsetMs = now.getTimezoneOffset() * 60000
    const local = new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10)
    setStickerForm((f) => ({ ...f, issuedAt: local }))
  }

  const onUpsertSticker = async () => {
    if (!id) return
    setSavingSticker(true)
    setError(null)
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const txt = await res.text()
      let json: any = null
      try { json = txt ? JSON.parse(txt) : null } catch { throw new Error("Access denied. Please sign in as an admin.") }
      if (!res.ok) throw new Error(json?.error || "Failed to save sticker")
      setStickerForm({ code: "", vehiclePlateNo: "", make: "", model: "", category: "", amountPaid: "", issuedAt: "", notes: "" })
      refreshAll()
    } catch (e: any) {
      setError(e?.message || "Failed to save sticker")
    } finally {
      setSavingSticker(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => router.push(`${basePath}/homeowners`)} className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        {error && (
          <Card>
            <CardContent className="py-4"><p className="text-destructive">{error}</p></CardContent>
          </Card>
        )}

        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User2 className="h-5 w-5" />
              {headerSubtitle || "Homeowner"}
              {typeof homeowner?.isOwner === "boolean" ? (
                <Badge variant={homeowner.isOwner ? "default" : "outline"}>{homeowner.isOwner ? "Owner" : "Renter"}</Badge>
              ) : null}
              {getDuesStatusBadge()}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {headerAddress}
              {homeowner?.contactNumber ? ` • ${homeowner.contactNumber}` : ""}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              {(homeowner as any)?.unitNumber && (
                <div className="flex items-center gap-2"><Home className="h-4 w-4" /> Unit: {(homeowner as any).unitNumber}</div>
              )}
              {sanitizeNA((homeowner as any)?.email) && (
                <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> <a href={`mailto:${sanitizeNA((homeowner as any)?.email)}`} className="hover:underline">{sanitizeNA((homeowner as any)?.email)}</a></div>
              )}
              {sanitizeNA((homeowner as any)?.facebookProfile) && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  <a href={ensureHttp(sanitizeNA((homeowner as any)?.facebookProfile))} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                    {sanitizeNA((homeowner as any)?.facebookProfile)}
                  </a>
                </div>
              )}
              {homeowner?.moveInDate && (
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Move-in: {formatDateLocal(homeowner.moveInDate)}</div>
              )}
              {(homeowner as any)?.residencyStartDate && (
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Residency Start: {formatDateLocal((homeowner as any).residencyStartDate)}</div>
              )}
              {typeof homeowner?.lengthOfResidency === "number" && (
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Residency: {homeowner.lengthOfResidency} {homeowner.lengthOfResidency === 1 ? "year" : "years"}</div>
              )}
              {(homeowner as any)?.datePaid && (
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Date Paid: {formatDateLocal((homeowner as any).datePaid)}</div>
              )}
              {typeof (homeowner as any)?.amountPaid === "number" && (
                <div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4" /> Amount Paid: {formatCurrency((homeowner as any).amountPaid)}</div>
              )}
              {duesStatus && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> 
                  HOA Dues {new Date().getFullYear()}: {formatCurrency(duesStatus.amount_paid)} / {formatCurrency(duesStatus.annual_amount)}
                </div>
              )}
              {duesStatus && duesStatus.balance_due > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <DollarSign className="h-4 w-4" /> 
                  Balance Due: {formatCurrency(duesStatus.balance_due)}
                </div>
              )}
              {duesStatus && duesStatus.payment_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> 
                  Last Dues Payment: {formatDateLocal(duesStatus.payment_date)}
                </div>
              )}
              {homeowner?.emergencyContactName && (
                <div className="flex items-center gap-2"><User2 className="h-4 w-4" /> Emergency: {homeowner.emergencyContactName}</div>
              )}
              {homeowner?.emergencyContactPhone && (
                <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> <a href={`tel:${homeowner.emergencyContactPhone}`} className="hover:underline">{homeowner.emergencyContactPhone}</a></div>
              )}
              {homeowner?.street && (
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Street: {homeowner.street}</div>
              )}
            </div>
            {sanitizeNotes((homeowner as any)?.notes) ? (
              <div className="text-sm">
                <div className="font-medium mb-1">Notes</div>
                <p className="text-muted-foreground whitespace-pre-wrap">{sanitizeNotes((homeowner as any)?.notes)}</p>
              </div>
            ) : null}
            {(homeowner as any)?.createdAt || (homeowner as any)?.updatedAt ? (
              <div className="text-xs text-muted-foreground">
                {(homeowner as any)?.createdAt ? (
                  <span>Created: {formatDateLocal((homeowner as any).createdAt)}</span>
                ) : null}
                {(homeowner as any)?.updatedAt ? (
                  <span>{(homeowner as any)?.createdAt ? " • " : ""}Updated: {formatDateLocal((homeowner as any).updatedAt)}</span>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members"><UsersRound className="h-4 w-4" /> Members</TabsTrigger>
            <TabsTrigger value="stickers"><Tag className="h-4 w-4" /> Stickers</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader><CardTitle>Household Members</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {members.length === 0 ? <p className="text-sm text-muted-foreground">No members yet</p> : null}
                  {members.map(m => (
                    <div key={m.id} className="border rounded-md p-3">
                      <div className="font-medium">{m.fullName}</div>
                      <div className="text-sm text-muted-foreground">{m.relation || "—"}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Add Member</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={memberForm.fullName} onChange={(e) => setMemberForm(f => ({...f, fullName: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Relation</Label>
                    <Select value={memberForm.relation} onValueChange={(v) => setMemberForm(f => ({...f, relation: v}))}>
                      <SelectTrigger><SelectValue placeholder="Select relation" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Child of homeowner/tenant">Child of homeowner/tenant</SelectItem>
                        <SelectItem value="Spouse of homeowner/tenant">Spouse of homeowner/tenant</SelectItem>
                        <SelectItem value="Relative of homeowner/tenant">Relative of homeowner/tenant</SelectItem>
                        <SelectItem value="Parent of homeowner/tenant">Parent of homeowner/tenant</SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={onCreateMember} disabled={savingMember || !memberForm.fullName.trim()}>
                    {savingMember ? "Saving..." : "Add Member"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vehicles tab removed; vehicles are shown within stickers list via join. */}

          <TabsContent value="stickers" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader><CardTitle>Stickers</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {stickers.length === 0 ? <p className="text-sm text-muted-foreground">No stickers yet</p> : null}
                  {stickers.map(s => (
                    <div key={s.id} className="border rounded-md p-3">
                      <div className="font-medium flex items-center justify-between">
                        <span>{s.code}</span>
                        <Badge variant="outline" className="ml-2">{s.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {s.vehiclePlateNo ? <span>{s.vehiclePlateNo}</span> : null}
                        {s.vehicleMake || s.vehicleModel || s.vehicleColor ? (
                          <span className="ml-2">{[s.vehicleMake, s.vehicleModel, s.vehicleColor].filter(Boolean).join(" • ")}</span>
                        ) : null}
                        {s.vehicleCategory ? <span className="ml-2">{s.vehicleCategory}</span> : null}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Paid/Released: {s.issuedAt}
                      </div>
                      {typeof s.amountPaid === "number" ? (
                        <div className="text-xs text-muted-foreground mt-1">Amount: ₱{s.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      ) : null}
                      {s.notes ? <div className="text-xs text-muted-foreground mt-1">Notes: {s.notes}</div> : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Add Sticker</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Sticker No</Label>
                      <Input placeholder="Sticker No" value={stickerForm.code} onChange={(e) => setStickerForm(f => ({...f, code: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Plate No</Label>
                      <Input placeholder="Plate No" value={stickerForm.vehiclePlateNo} onChange={(e) => setStickerForm(f => ({...f, vehiclePlateNo: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Maker</Label>
                      <Input placeholder="Maker" value={stickerForm.make} onChange={(e) => setStickerForm(f => ({...f, make: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Input placeholder="Model" value={stickerForm.model} onChange={(e) => setStickerForm(f => ({...f, model: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount Paid</Label>
                      <Input type="number" inputMode="decimal" step="0.01" placeholder="Amount Paid" value={stickerForm.amountPaid} onChange={(e) => setStickerForm(f => ({...f, amountPaid: e.target.value}))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Date Issued</Label>
                      <Input type="date" value={stickerForm.issuedAt} onChange={(e) => setStickerForm(f => ({...f, issuedAt: e.target.value}))} />
                      <button type="button" onClick={setIssuedToday} className="text-xs text-muted-foreground underline hover:text-foreground">
                        Set today
                      </button>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={stickerForm.category} onValueChange={(v) => setStickerForm(f => ({...f, category: v}))}>
                        <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sedan">Sedan</SelectItem>
                          <SelectItem value="Van">Van</SelectItem>
                          <SelectItem value="SUV">SUV</SelectItem>
                          <SelectItem value="Truck">Truck</SelectItem>
                          <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                          <SelectItem value="Electric">Electric</SelectItem>
                          <SelectItem value="ELF">ELF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label>Notes</Label>
                      <Input placeholder="Notes" value={stickerForm.notes} onChange={(e) => setStickerForm(f => ({...f, notes: e.target.value}))} />
                    </div>
                  </div>
                  <Button onClick={onUpsertSticker} disabled={savingSticker || !stickerForm.code.trim()}>
                    {savingSticker ? "Saving..." : "Add Sticker"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
