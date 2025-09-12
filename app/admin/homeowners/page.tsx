// Admin homeowners management page

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Homeowner } from "@/lib/types"
import { ArrowLeft, Plus, Search, Home, Calendar, User2, Phone } from "lucide-react"

function HomeownersContent() {
  const router = useRouter()
  const [items, setItems] = useState<Homeowner[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")

  // Create dialog state
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    propertyAddress: "",
    unitNumber: "",
    moveInDate: "",
    isOwner: "true",
    emergencyContactName: "",
    emergencyContactPhone: "",
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  const fetchItems = async (query = "") => {
    setLoading(true)
    setError(null)
    try {
      const url = new URL("/api/admin/homeowners", window.location.origin)
      if (query) url.searchParams.set("q", query)
      const res = await fetch(url.toString(), { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to load homeowners")
      setItems(json.items || [])
    } catch (e: any) {
      setError(e?.message || "Failed to load homeowners")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onCreate = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        propertyAddress: form.propertyAddress.trim(),
        unitNumber: form.unitNumber.trim() || null,
        moveInDate: form.moveInDate || null,
        isOwner: form.isOwner === "true",
        emergencyContactName: form.emergencyContactName.trim() || null,
        emergencyContactPhone: form.emergencyContactPhone.trim() || null,
        notes: form.notes.trim() || null,
      }
      const res = await fetch("/api/admin/homeowners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to create homeowner")
      setOpen(false)
      setForm({
        propertyAddress: "",
        unitNumber: "",
        moveInDate: "",
        isOwner: "true",
        emergencyContactName: "",
        emergencyContactPhone: "",
        notes: "",
      })
      fetchItems(q)
    } catch (e: any) {
      setError(e?.message || "Failed to create homeowner")
    } finally {
      setSaving(false)
    }
  }

  const filteredCount = useMemo(() => items.length, [items])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin")} className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div className="flex items-center space-x-2">
                <div className="bg-primary rounded-lg p-2">
                  <Home className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Manage Homeowners</h1>
                  <p className="text-sm text-muted-foreground">List, search, and create homeowner records</p>
                </div>
              </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Homeowner
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Homeowner</DialogTitle>
                  <DialogDescription>Create a homeowner record</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Property Address</Label>
                    <Input
                      placeholder="e.g., 123 Oak Street"
                      value={form.propertyAddress}
                      onChange={(e) => setForm((f) => ({ ...f, propertyAddress: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Number</Label>
                    <Input placeholder="A1" value={form.unitNumber} onChange={(e) => setForm((f) => ({ ...f, unitNumber: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Move-in Date</Label>
                    <Input type="date" value={form.moveInDate} onChange={(e) => setForm((f) => ({ ...f, moveInDate: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ownership</Label>
                    <Select value={form.isOwner} onValueChange={(v) => setForm((f) => ({ ...f, isOwner: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Owner</SelectItem>
                        <SelectItem value="false">Renter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency Contact Name</Label>
                    <Input
                      placeholder="Contact name"
                      value={form.emergencyContactName}
                      onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency Contact Phone</Label>
                    <Input
                      placeholder="Contact phone"
                      value={form.emergencyContactPhone}
                      onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Notes</Label>
                    <Input
                      placeholder="Additional notes"
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={onCreate} disabled={saving || !form.propertyAddress.trim()}>
                    {saving ? "Creating..." : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by address, unit, or notes..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") fetchItems(q)
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline" onClick={() => fetchItems(q)} disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <div className="space-y-4">
          {error && (
            <Card>
              <CardContent className="py-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {filteredCount === 0 && !loading ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="bg-muted rounded-full p-3 w-fit mx-auto mb-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No homeowners found</h3>
                <p className="text-muted-foreground mb-4">
                  {q ? "Try adjusting your search." : "Create your first homeowner to get started."}
                </p>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Homeowner
                </Button>
              </CardContent>
            </Card>
          ) : (
            items.map((h) => (
              <Card key={h.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">
                        {h.propertyAddress}
                        {h.unitNumber ? <span className="text-muted-foreground"> • Unit {h.unitNumber}</span> : null}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <Badge variant={h.isOwner ? "default" : "outline"}>{h.isOwner ? "Owner" : "Renter"}</Badge>
                        {h.moveInDate && (
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Moved in: {h.moveInDate}</span>
                        )}
                        {h.emergencyContactName && (
                          <span className="flex items-center gap-1"><User2 className="h-3 w-3" /> {h.emergencyContactName}</span>
                        )}
                        {h.emergencyContactPhone && (
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {h.emergencyContactPhone}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Button variant="outline" size="sm" onClick={() => router.push(`/admin/homeowners/${h.id}`)}>
                        View
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function HomeownersPage() {
  return (
    <ProtectedRoute requiredRole="staff">
      <HomeownersContent />
    </ProtectedRoute>
  )
}
