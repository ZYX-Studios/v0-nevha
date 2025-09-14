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
import { ArrowLeft, Calendar, Home, Phone, User2, UsersRound, Tag } from "lucide-react"

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

  const refreshAll = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [dRes, mRes, sRes] = await Promise.all([
        fetch(`/api/admin/homeowners/${id}`, { cache: "no-store" }),
        fetch(`/api/admin/homeowners/${id}/members`, { cache: "no-store" }),
        fetch(`/api/admin/homeowners/${id}/stickers`, { cache: "no-store" }),
      ])
      const dTxt = await dRes.text()
      const mTxt = await mRes.text()
      const sTxt = await sRes.text()
      let dJson: any, mJson: any, sJson: any
      try { dJson = dTxt ? JSON.parse(dTxt) : null } catch { throw new Error("Access denied. Please sign in as an admin and try again.") }
      try { mJson = mTxt ? JSON.parse(mTxt) : null } catch { throw new Error("Access denied. Please sign in as an admin and try again.") }
      try { sJson = sTxt ? JSON.parse(sTxt) : null } catch { throw new Error("Access denied. Please sign in as an admin and try again.") }
      if (!dRes.ok) throw new Error(dJson?.error || "Failed to load homeowner")
      if (!mRes.ok) throw new Error(mJson?.error || "Failed to load members")
      if (!sRes.ok) throw new Error(sJson?.error || "Failed to load stickers")
      setHomeowner(dJson.item)
      setMembers(mJson.items || [])
      setStickers(sJson.items || [])
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
    const parts: string[] = []
    if (homeowner.firstName || homeowner.lastName) {
      parts.push(`${homeowner.firstName ?? ""} ${homeowner.lastName ?? ""}`.trim())
    }
    if (homeowner.contactNumber) parts.push(`${homeowner.contactNumber}`)
    return parts.join(" • ")
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push(`${basePath}/homeowners`)} className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div className="flex items-center space-x-2">
                <div className="bg-primary rounded-lg p-2">
                  <Home className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Homeowner Detail</h1>
                  <p className="text-sm text-muted-foreground">{headerAddress}</p>
                </div>
              </div>
            </div>
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
            <CardTitle className="flex items-center justify-between">
              <span>{headerAddress}</span>
              <Badge variant={homeowner?.isOwner ? "default" : "outline"}>{homeowner?.isOwner ? "Owner" : "Renter"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">{headerSubtitle}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              {homeowner?.moveInDate && <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Move-in: {homeowner.moveInDate}</div>}
              {homeowner?.emergencyContactName && <div className="flex items-center gap-2"><User2 className="h-4 w-4" /> {homeowner.emergencyContactName}</div>}
              {homeowner?.emergencyContactPhone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {homeowner.emergencyContactPhone}</div>}
            </div>
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
                    <Input value={memberForm.relation} onChange={(e) => setMemberForm(f => ({...f, relation: e.target.value}))} />
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
