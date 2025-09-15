// Admin homeowners management page

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { ArrowLeft, Plus, Search, Home, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react"

function HomeownersContent() {
  const router = useRouter()
  const basePath = "/admin"
  const [items, setItems] = useState<Homeowner[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [owner, setOwner] = useState<"all" | "owner" | "renter">("all")
  const [phase, setPhase] = useState("")
  const [block, setBlock] = useState("")
  const [lot, setLot] = useState("")
  const [street, setStreet] = useState("")
  const [moveInFrom, setMoveInFrom] = useState("")
  const [moveInTo, setMoveInTo] = useState("")
  const [hasEmail, setHasEmail] = useState<boolean | undefined>(undefined)
  const [hasPhone, setHasPhone] = useState<boolean | undefined>(undefined)
  const [lengthMin, setLengthMin] = useState("")
  const [lengthMax, setLengthMax] = useState("")
  const [sort, setSort] = useState<"created_at" | "name" | "address" | "move_in_date">("created_at")
  const [order, setOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)

  // Helpers: format suffix and build display name
  const formatSuffix = (s?: string | null) => {
    if (!s) return ""
    const lower = s.toLowerCase().replace(/\.$/, "")
    if (lower === "jr") return "Jr."
    if (lower === "sr") return "Sr."
    if (["ii", "iii", "iv", "v"].includes(lower)) return lower.toUpperCase()
    if (["2nd", "3rd", "4th", "5th"].includes(lower)) return lower
    return s
  }

  const displayName = (h: Homeowner) => {
    const base = [h.firstName, h.lastName].filter(Boolean).join(" ").trim()
    const withSuffix = [base, formatSuffix((h as any).suffix)].filter(Boolean).join(" ").trim()
    return withSuffix || (h as any).fullName || "-"
  }

  // Create dialog state
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    moveInDate: "",
    isOwner: "true",
    emergencyContactName: "",
    emergencyContactPhone: "",
    notes: "",
    // PRD-aligned optional details
    firstName: "",
    lastName: "",
    middleInitial: "",
    suffix: "",
    phase: "",
    block: "",
    lot: "",
    street: "",
    contactNumber: "",
    email: "",
    facebookProfile: "",
    lengthOfResidency: "",
  })
  const [saving, setSaving] = useState(false)

  const fetchItems = async (query = "") => {
    setLoading(true)
    setError(null)
    try {
      const url = new URL("/api/admin/homeowners", window.location.origin)
      if (query) url.searchParams.set("q", query)
      if (owner !== "all") url.searchParams.set("owner", owner)
      if (phase) url.searchParams.set("phase", phase)
      if (block) url.searchParams.set("block", block)
      if (lot) url.searchParams.set("lot", lot)
      if (street) url.searchParams.set("street", street)
      if (moveInFrom) url.searchParams.set("moveInFrom", moveInFrom)
      if (moveInTo) url.searchParams.set("moveInTo", moveInTo)
      if (typeof hasEmail === "boolean") url.searchParams.set("hasEmail", String(hasEmail))
      if (typeof hasPhone === "boolean") url.searchParams.set("hasPhone", String(hasPhone))
      if (lengthMin) url.searchParams.set("lengthMin", lengthMin)
      if (lengthMax) url.searchParams.set("lengthMax", lengthMax)
      url.searchParams.set("sort", sort)
      url.searchParams.set("order", order)
      url.searchParams.set("page", String(page))
      url.searchParams.set("pageSize", String(pageSize))
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
      const fetched: Homeowner[] = (json.items || []) as Homeowner[]
      setItems(fetched)
      setTotal(typeof json.total === "number" ? json.total : 0)
      if (typeof json.page === "number") setPage(json.page)
      if (typeof json.pageSize === "number") setPageSize(json.pageSize)
      return fetched
    } catch (e: any) {
      setError(e?.message || "Failed to load homeowners")
      return [] as Homeowner[]
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced search on query changes
  useEffect(() => {
    const handle = setTimeout(() => {
      if (page !== 1) {
        setPage(1)
      } else {
        ;(async () => {
          const results = await fetchItems(q)
          if ((results?.length ?? 0) === 0 && q.trim()) {
            try {
              const res = await fetch(`/api/admin/vehicles/lookup?plate=${encodeURIComponent(q.trim())}`, { cache: "no-store" })
              const j = await res.json().catch(() => ({}))
              if (res.ok && j?.homeowner?.id) {
                const r2 = await fetch(`/api/admin/homeowners/${j.homeowner.id}`, { cache: "no-store" })
                const j2 = await r2.json().catch(() => ({}))
                if (r2.ok && j2?.item) {
                  setItems([j2.item as Homeowner])
                  setTotal(1)
                }
              }
            } catch {}
          }
        })()
      }
    }, 400)
    return () => clearTimeout(handle)
    // We intentionally do not include `page` in deps to avoid immediate extra triggers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  // Re-fetch on sort/order/page/pageSize changes
  useEffect(() => {
    fetchItems(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, order, page, pageSize])

  const handleSort = (col: "name" | "address" | "move_in_date") => {
    setPage(1)
    if (sort === col) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSort(col)
      setOrder("asc")
    }
  }

  const handleResetFilters = () => {
    setQ("")
    setOwner("all")
    setPhase("")
    setBlock("")
    setLot("")
    setStreet("")
    setMoveInFrom("")
    setMoveInTo("")
    setHasEmail(undefined)
    setHasPhone(undefined)
    setLengthMin("")
    setLengthMax("")
    setSort("created_at")
    setOrder("desc")
    setPage(1)
    setPageSize(25)
    fetchItems("")
  }

  const handleExportCsv = () => {
    const headers = [
      "Name",
      "Address",
      "Ownership",
      "Move-in",
      "Contact Number",
      "Email",
    ]
    const rows = items.map((h) => [
      displayName(h),
      h.propertyAddress || "",
      h.isOwner ? "Owner" : "Renter",
      h.moveInDate || "",
      (h as any).contactNumber || "",
      (h as any).email || "",
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `homeowners-page-${page}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }


  const onCreate = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        moveInDate: form.moveInDate || null,
        isOwner: form.isOwner === "true",
        emergencyContactName: form.emergencyContactName.trim() || null,
        emergencyContactPhone: form.emergencyContactPhone.trim() || null,
        notes: form.notes.trim() || null,
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
        lengthOfResidency: form.lengthOfResidency !== "" ? Number(form.lengthOfResidency) : null,
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
        moveInDate: "",
        isOwner: "true",
        emergencyContactName: "",
        emergencyContactPhone: "",
        notes: "",
        firstName: "",
        lastName: "",
        middleInitial: "",
        suffix: "",
        phase: "",
        block: "",
        lot: "",
        street: "",
        contactNumber: "",
        email: "",
        facebookProfile: "",
        lengthOfResidency: "",
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
  const canSubmit = Boolean(form.street.trim() || (form.block.trim() && form.lot.trim()))

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
                    <Label>Homeowner Name</Label>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <Input placeholder="First Name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
                      <Input placeholder="Last Name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
                      <Input placeholder="M.I." value={form.middleInitial} onChange={(e) => setForm((f) => ({ ...f, middleInitial: e.target.value }))} />
                      <Input placeholder="Suffix (e.g., Jr.)" value={form.suffix} onChange={(e) => setForm((f) => ({ ...f, suffix: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Phase</Label>
                    <Input placeholder="e.g., Phase 1" value={form.phase} onChange={(e) => setForm((f) => ({ ...f, phase: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Block</Label>
                    <Input placeholder="e.g., B2" value={form.block} onChange={(e) => setForm((f) => ({ ...f, block: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Lot</Label>
                    <Input placeholder="e.g., L10" value={form.lot} onChange={(e) => setForm((f) => ({ ...f, lot: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Street</Label>
                    <Input placeholder="e.g., Oak St" value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} />
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
                    <Label>Contact Number</Label>
                    <Input placeholder="e.g., +63 9xx xxx xxxx" value={form.contactNumber} onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input placeholder="name@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Facebook Profile</Label>
                    <Input placeholder="https://facebook.com/username" value={form.facebookProfile} onChange={(e) => setForm((f) => ({ ...f, facebookProfile: e.target.value }))} />
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
                  <div className="space-y-2">
                    <Label>Length of Residency (years)</Label>
                    <Input type="number" inputMode="numeric" placeholder="e.g., 3" value={form.lengthOfResidency} onChange={(e) => setForm((f) => ({ ...f, lengthOfResidency: e.target.value }))} />
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
                  <Button onClick={onCreate} disabled={saving || !canSubmit}>
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
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, address, notes, or plate number..."
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          ;(async () => {
                            const results = await fetchItems(q)
                            if ((results?.length ?? 0) === 0 && q.trim()) {
                              try {
                                const res = await fetch(`/api/admin/vehicles/lookup?plate=${encodeURIComponent(q.trim())}`, { cache: "no-store" })
                                const j = await res.json().catch(() => ({}))
                                if (res.ok && j?.homeowner?.id) {
                                  router.push(`/admin/homeowners/${j.homeowner.id}`)
                                }
                              } catch {}
                            }
                          })()
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const results = await fetchItems(q)
                      if ((results?.length ?? 0) === 0 && q.trim()) {
                        try {
                          const res = await fetch(`/api/admin/vehicles/lookup?plate=${encodeURIComponent(q.trim())}`, { cache: "no-store" })
                          const j = await res.json().catch(() => ({}))
                          if (res.ok && j?.homeowner?.id) {
                            router.push(`/admin/homeowners/${j.homeowner.id}`)
                            return
                          }
                        } catch {}
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? "Searching..." : "Search"}
                  </Button>
                  <Button variant="ghost" onClick={handleResetFilters}>
                    Reset
                  </Button>
                  <Button variant="outline" onClick={handleExportCsv}>
                    Export CSV
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label>Ownership</Label>
                  <Select value={owner} onValueChange={(v) => setOwner(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="renter">Renter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Phase</Label>
                  <Input value={phase} onChange={(e) => setPhase(e.target.value)} placeholder="e.g., Phase 1" />
                </div>
                <div className="space-y-1">
                  <Label>Block</Label>
                  <Input value={block} onChange={(e) => setBlock(e.target.value)} placeholder="e.g., B2" />
                </div>
                <div className="space-y-1">
                  <Label>Lot</Label>
                  <Input value={lot} onChange={(e) => setLot(e.target.value)} placeholder="e.g., L10" />
                </div>
                <div className="space-y-1">
                  <Label>Street</Label>
                  <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="e.g., Oak St" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <Label>Move-in From</Label>
                  <Input type="date" value={moveInFrom} onChange={(e) => setMoveInFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Move-in To</Label>
                  <Input type="date" value={moveInTo} onChange={(e) => setMoveInTo(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Checkbox id="hasEmail" checked={hasEmail === true} onCheckedChange={(v) => setHasEmail(Boolean(v))} />
                  <Label htmlFor="hasEmail">Has Email</Label>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Checkbox id="hasPhone" checked={hasPhone === true} onCheckedChange={(v) => setHasPhone(Boolean(v))} />
                  <Label htmlFor="hasPhone">Has Phone</Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="space-y-1">
                  <Label>Length Min</Label>
                  <Input type="number" inputMode="numeric" value={lengthMin} onChange={(e) => setLengthMin(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Length Max</Label>
                  <Input type="number" inputMode="numeric" value={lengthMax} onChange={(e) => setLengthMax(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Rows per page</Label>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(parseInt(v, 10)); setPage(1) }}>
                    <SelectTrigger>
                      <SelectValue placeholder="25" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
              <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">
                    <button className="inline-flex items-center gap-1" onClick={() => handleSort("name")}>
                      Name {sort === "name" ? (order === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-2 font-medium">
                    <button className="inline-flex items-center gap-1" onClick={() => handleSort("address")}>
                      Address {sort === "address" ? (order === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-2 font-medium">Ownership</th>
                  <th className="text-left px-4 py-2 font-medium">
                    <button className="inline-flex items-center gap-1" onClick={() => handleSort("move_in_date")}>
                      Move-in {sort === "move_in_date" ? (order === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-2 font-medium">Contact Number</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      Loading homeowners...
                    </td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center">
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
                  const fullName = displayName(h)
                  return (
                    <tr key={h.id} className="border-t odd:bg-muted/30">
                      <td className="px-4 py-2">{fullName}</td>
                      <td className="px-4 py-2">{h.propertyAddress}</td>
                      <td className="px-4 py-2">{h.isOwner ? "Owner" : "Renter"}</td>
                      <td className="px-4 py-2">{h.moveInDate || "-"}</td>
                      <td className="px-4 py-2">{h.contactNumber || "-"}</td>
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

        {/* Pagination */}
        <div className="flex items-center justify-between py-3 text-sm text-muted-foreground">
          <div>
            Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              Page {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * pageSize >= total}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomeownersPage() {
  return <HomeownersContent />
}
