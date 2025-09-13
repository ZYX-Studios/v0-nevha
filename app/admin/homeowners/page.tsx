// Admin homeowners management page

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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
import { ArrowLeft, Plus, Search, Home } from "lucide-react"

function HomeownersContent() {
  const router = useRouter()
  const basePath = "/admin"
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
      const text = await res.text()
      let json: any = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        // Response is not JSON (likely HTML from a redirect). Treat as unauthorized.
        throw new Error("Access denied. Please sign in as an admin and try again.")
      }
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
      const txt = await res.text()
      let json: any = null
      try { json = txt ? JSON.parse(txt) : null } catch { throw new Error("Access denied. Please sign in as an admin.") }
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

  // derived count
  const filteredCount = useMemo(() => items.length, [items])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push(basePath)} className="flex items-center space-x-2">
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
                    placeholder="Search by name, address, unit, or notes..."
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

        {/* List - Simple Table */}
        {error && (
          <Card className="mb-4">
            <CardContent className="py-4">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="bg-card rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Address</th>
                  <th className="text-left px-4 py-2 font-medium">Unit</th>
                  <th className="text-left px-4 py-2 font-medium">Ownership</th>
                  <th className="text-left px-4 py-2 font-medium">Move-in</th>
                  <th className="text-left px-4 py-2 font-medium">Contact Name</th>
                  <th className="text-left px-4 py-2 font-medium">Contact Phone</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                      Loading homeowners...
                    </td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">No homeowners found</div>
                        <div className="text-xs text-muted-foreground">{q ? "Try adjusting your search." : "Create your first homeowner to get started."}</div>
                        <Button size="sm" onClick={() => setOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" /> New Homeowner
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && items.map((h) => {
                  const fullName = [h.firstName, h.lastName].filter(Boolean).join(" ") || "-"
                  return (
                    <tr key={h.id} className="border-t">
                      <td className="px-4 py-2">{fullName}</td>
                      <td className="px-4 py-2">{h.propertyAddress}</td>
                      <td className="px-4 py-2">{h.unitNumber || "-"}</td>
                      <td className="px-4 py-2">{h.isOwner ? "Owner" : "Renter"}</td>
                      <td className="px-4 py-2">{h.moveInDate || "-"}</td>
                      <td className="px-4 py-2">{h.emergencyContactName || "-"}</td>
                      <td className="px-4 py-2">{h.emergencyContactPhone || "-"}</td>
                      <td className="px-4 py-2 text-right">
                        <Button variant="outline" size="sm" onClick={() => router.push(`${basePath}/homeowners/${h.id}`)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomeownersPage() {
  return <HomeownersContent />
}
