"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Homeowner, Member, Vehicle, Sticker } from "@/lib/types"
import { ArrowLeft, Calendar, Home, Phone, User2, UsersRound, Car, Tag } from "lucide-react"

export default function HomeownerDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const basePath = "/admin"

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [homeowner, setHomeowner] = useState<Homeowner | null>(null)

  const [members, setMembers] = useState<Member[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [stickers, setStickers] = useState<Sticker[]>([])

  // Create form states
  const [memberForm, setMemberForm] = useState({ fullName: "", relation: "" })
  const [vehicleForm, setVehicleForm] = useState({ plateNo: "", make: "", model: "", color: "" })
  const [stickerForm, setStickerForm] = useState({ code: "", vehiclePlateNo: "", issuedAt: "", expiresAt: "", notes: "" })

  const [savingMember, setSavingMember] = useState(false)
  const [savingVehicle, setSavingVehicle] = useState(false)
  const [savingSticker, setSavingSticker] = useState(false)

  const refreshAll = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [dRes, mRes, vRes, sRes] = await Promise.all([
        fetch(`/api/admin/homeowners/${id}`, { cache: "no-store" }),
        fetch(`/api/admin/homeowners/${id}/members`, { cache: "no-store" }),
        fetch(`/api/admin/homeowners/${id}/vehicles`, { cache: "no-store" }),
        fetch(`/api/admin/homeowners/${id}/stickers`, { cache: "no-store" }),
      ])
      const dTxt = await dRes.text()
      const mTxt = await mRes.text()
      const vTxt = await vRes.text()
      const sTxt = await sRes.text()
      let dJson: any, mJson: any, vJson: any, sJson: any
      try { dJson = dTxt ? JSON.parse(dTxt) : null } catch { throw new Error("Access denied. Please sign in as an admin and try again.") }
      try { mJson = mTxt ? JSON.parse(mTxt) : null } catch { throw new Error("Access denied. Please sign in as an admin and try again.") }
      try { vJson = vTxt ? JSON.parse(vTxt) : null } catch { throw new Error("Access denied. Please sign in as an admin and try again.") }
      try { sJson = sTxt ? JSON.parse(sTxt) : null } catch { throw new Error("Access denied. Please sign in as an admin and try again.") }
      if (!dRes.ok) throw new Error(dJson?.error || "Failed to load homeowner")
      if (!mRes.ok) throw new Error(mJson?.error || "Failed to load members")
      if (!vRes.ok) throw new Error(vJson?.error || "Failed to load vehicles")
      if (!sRes.ok) throw new Error(sJson?.error || "Failed to load stickers")
      setHomeowner(dJson.item)
      setMembers(mJson.items || [])
      setVehicles(vJson.items || [])
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
    const blps = [homeowner.block, homeowner.lot, homeowner.phase, homeowner.street].filter(Boolean).join(" • ")
    if (blps) parts.push(blps)
    if (homeowner.contactNumber) parts.push(`📞 ${homeowner.contactNumber}`)
    return parts.join(" • ")
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

  const onUpsertVehicle = async () => {
    if (!id) return
    setSavingVehicle(true)
    setError(null)
    try {
      const payload = {
        plateNo: vehicleForm.plateNo.trim(),
        make: vehicleForm.make.trim() || null,
        model: vehicleForm.model.trim() || null,
        color: vehicleForm.color.trim() || null,
      }
      const res = await fetch(`/api/admin/homeowners/${id}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const txt = await res.text()
      let json: any = null
      try { json = txt ? JSON.parse(txt) : null } catch { throw new Error("Access denied. Please sign in as an admin.") }
      if (!res.ok) throw new Error(json?.error || "Failed to save vehicle")
      setVehicleForm({ plateNo: "", make: "", model: "", color: "" })
      refreshAll()
    } catch (e: any) {
      setError(e?.message || "Failed to save vehicle")
    } finally {
      setSavingVehicle(false)
    }
  }

  const onUpsertSticker = async () => {
    if (!id) return
    setSavingSticker(true)
    setError(null)
    try {
      const payload = {
        code: stickerForm.code.trim(),
        vehiclePlateNo: stickerForm.vehiclePlateNo.trim() || null,
        issuedAt: stickerForm.issuedAt || null,
        expiresAt: stickerForm.expiresAt || null,
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
      setStickerForm({ code: "", vehiclePlateNo: "", issuedAt: "", expiresAt: "", notes: "" })
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
                  <p className="text-sm text-muted-foreground">{homeowner?.propertyAddress}</p>
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
              <span>{homeowner?.propertyAddress}</span>
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
            <TabsTrigger value="vehicles"><Car className="h-4 w-4" /> Vehicles</TabsTrigger>
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

          <TabsContent value="vehicles" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader><CardTitle>Vehicles</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {vehicles.length === 0 ? <p className="text-sm text-muted-foreground">No vehicles yet</p> : null}
                  {vehicles.map(v => (
                    <div key={v.id} className="border rounded-md p-3">
                      <div className="font-medium">{v.plateNo}</div>
                      <div className="text-sm text-muted-foreground">{[v.make, v.model, v.color].filter(Boolean).join(" • ") || "—"}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Add/Update Vehicle</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2"><Label>Plate No</Label><Input value={vehicleForm.plateNo} onChange={(e) => setVehicleForm(f => ({...f, plateNo: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Make</Label><Input value={vehicleForm.make} onChange={(e) => setVehicleForm(f => ({...f, make: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Model</Label><Input value={vehicleForm.model} onChange={(e) => setVehicleForm(f => ({...f, model: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Color</Label><Input value={vehicleForm.color} onChange={(e) => setVehicleForm(f => ({...f, color: e.target.value}))} /></div>
                  <Button onClick={onUpsertVehicle} disabled={savingVehicle || !vehicleForm.plateNo.trim()}>
                    {savingVehicle ? "Saving..." : "Save Vehicle"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stickers" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader><CardTitle>Stickers</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {stickers.length === 0 ? <p className="text-sm text-muted-foreground">No stickers yet</p> : null}
                  {stickers.map(s => (
                    <div key={s.id} className="border rounded-md p-3">
                      <div className="font-medium">{s.code} <Badge variant="outline" className="ml-2">{s.status}</Badge></div>
                      <div className="text-sm text-muted-foreground">{s.issuedAt}{s.expiresAt ? ` → ${s.expiresAt}` : ""}</div>
                      {s.notes ? <div className="text-sm text-muted-foreground mt-1">{s.notes}</div> : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Issue/Update Sticker</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2"><Label>Code</Label><Input value={stickerForm.code} onChange={(e) => setStickerForm(f => ({...f, code: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Vehicle Plate (optional)</Label><Input value={stickerForm.vehiclePlateNo} onChange={(e) => setStickerForm(f => ({...f, vehiclePlateNo: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Issued At</Label><Input type="date" value={stickerForm.issuedAt} onChange={(e) => setStickerForm(f => ({...f, issuedAt: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Expires At</Label><Input type="date" value={stickerForm.expiresAt} onChange={(e) => setStickerForm(f => ({...f, expiresAt: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Notes</Label><Input value={stickerForm.notes} onChange={(e) => setStickerForm(f => ({...f, notes: e.target.value}))} /></div>
                  <Button onClick={onUpsertSticker} disabled={savingSticker || !stickerForm.code.trim()}>
                    {savingSticker ? "Saving..." : "Save Sticker"}
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
