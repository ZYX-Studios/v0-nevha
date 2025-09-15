"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Calendar, CheckCircle, Clock, AlertCircle, Tag, Mail, RefreshCw, MapPin } from "lucide-react"
import { toast } from "sonner"

interface IssueDetailItem {
  id: string
  ref_code: string
  title: string
  description: string
  category: string
  priority: "low" | "normal" | "high" | "urgent"
  status: "not_started" | "in_progress" | "on_hold" | "resolved" | "closed"
  location: string | null
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  resolutionNotes: string | null
  reporterFullName: string | null
  reporterEmail: string | null
  reporterPhone: string | null
  departmentName: string | null
  reporterBlock: string | null
  reporterLot: string | null
  reporterPhase: string | null
  reporterStreet: string | null
}

interface StatusUpdateItem {
  id: string
  status: "not_started" | "in_progress" | "on_hold" | "resolved" | "closed"
  notes: string | null
  authorLabel: string | null
  createdAt: string
}

const statusIcon = (status: string) => {
  switch (status) {
    case "resolved":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "in_progress":
      return <Clock className="h-4 w-4 text-blue-600" />
    case "closed":
      return <CheckCircle className="h-4 w-4 text-muted-foreground" />
    default:
      return <AlertCircle className="h-4 w-4 text-orange-600" />
  }
}

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "resolved":
      return "default"
    case "in_progress":
      return "secondary"
    case "closed":
      return "outline"
    default:
      return "outline"
  }
}

export default function IssueDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const issueId = params.id
  const [item, setItem] = useState<IssueDetailItem | null>(null)
  const [updates, setUpdates] = useState<StatusUpdateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState("")

  async function load() {
    try {
      setLoading(true)
      const [r1, r2] = await Promise.all([
        fetch(`/api/admin/issues/${issueId}`, { cache: "no-store" }),
        fetch(`/api/admin/issues/${issueId}/updates`, { cache: "no-store" }),
      ])
      const j1 = await r1.json()
      const j2 = await r2.json()
      if (!r1.ok) throw new Error(j1?.error || "Failed to load issue")
      if (!r2.ok) throw new Error(j2?.error || "Failed to load updates")
      setItem(j1.item as IssueDetailItem)
      setUpdates(Array.isArray(j2.items) ? (j2.items as StatusUpdateItem[]) : [])
      setNotes("")
    } catch (e) {
      toast.error((e as any)?.message || "Failed to load issue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId])

  const reloadUpdates = async () => {
    if (!issueId) return
    try {
      const r = await fetch(`/api/admin/issues/${issueId}/updates`, { cache: "no-store" })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || "Failed to load updates")
      setUpdates(Array.isArray(j.items) ? (j.items as StatusUpdateItem[]) : [])
    } catch (e) {
      toast.error((e as any)?.message || "Failed to load updates")
    }
  }

  const createdStr = useMemo(() => (item?.createdAt ? new Date(item.createdAt).toLocaleString() : ""), [item])
  const currentStatus = useMemo<"not_started" | "in_progress" | "on_hold" | "resolved" | "closed">(
    () => (updates.length > 0 ? updates[0].status : (item?.status || "not_started")),
    [updates, item],
  )
  const address = useMemo(() => {
    if (!item) return ""
    const parts: string[] = []
    if (item.reporterPhase) parts.push(`Phase ${item.reporterPhase}`)
    if (item.reporterBlock) parts.push(`Block ${item.reporterBlock}`)
    if (item.reporterLot) parts.push(`Lot ${item.reporterLot}`)
    if (item.reporterStreet) parts.push(`Street ${item.reporterStreet}`)
    if (item.location) parts.push(item.location)
    return parts.join(" • ")
  }, [item])

  async function addUpdate() {
    if (!item) return
    setSaving(true)
    try {
      const payload: any = {}
      if (notes.trim()) payload.notes = notes.trim()
      const res = await fetch(`/api/admin/issues/${item.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to add update")
      toast.success("Update added (set to In Progress)")
      // Optimistically update pill
      setItem((prev) => (prev ? { ...prev, status: "in_progress" } : prev))
      setUpdates((prev) => [{ id: "optimistic", status: "in_progress", notes: notes.trim() || null, authorLabel: "You", createdAt: new Date().toISOString() }, ...prev])
      setNotes("")
      await load()
    } catch (e) {
      toast.error((e as any)?.message || "Failed to add update")
    } finally {
      setSaving(false)
    }
  }

  async function toggleResolve() {
    if (!item) return
    setSaving(true)
    try {
      const targetStatus: "in_progress" | "resolved" = currentStatus === "resolved" ? "in_progress" : "resolved"
      const payload: any = { status: targetStatus }
      if (notes.trim()) payload.notes = notes.trim()
      const res = await fetch(`/api/admin/issues/${item.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to update status")
      toast.success(targetStatus === "resolved" ? "Marked as resolved" : "Reopened (In Progress)")
      // Optimistically sync by inserting a synthetic first update so the pill reflects immediately
      setUpdates((prev) => [{ id: "optimistic", status: targetStatus, notes: notes.trim() || null, authorLabel: "You", createdAt: new Date().toISOString() }, ...prev])
      setNotes("")
      await load()
    } catch (e) {
      toast.error((e as any)?.message || "Failed to update status")
    } finally {
      setSaving(false)
    }
  }

  async function toggleHold() {
    if (!item) return
    setSaving(true)
    try {
      const targetStatus: "in_progress" | "on_hold" = currentStatus === "on_hold" ? "in_progress" : "on_hold"
      const payload: any = { status: targetStatus }
      if (notes.trim()) payload.notes = notes.trim()
      const res = await fetch(`/api/admin/issues/${item.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to update status")
      toast.success(targetStatus === "on_hold" ? "Put on hold" : "Resumed (In Progress)")
      setUpdates((prev) => [{ id: "optimistic", status: targetStatus, notes: notes.trim() || null, authorLabel: "You", createdAt: new Date().toISOString() }, ...prev])
      setNotes("")
      await load()
    } catch (e) {
      toast.error((e as any)?.message || "Failed to update status")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/issues")} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-lg font-bold">Issue Details</h1>
                <p className="text-sm text-muted-foreground">Reference: {item?.ref_code}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : !item ? (
          <div className="text-sm text-destructive">Issue not found</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{item.title}</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={statusVariant(currentStatus)} className="flex items-center gap-1 capitalize">
                          {statusIcon(currentStatus)}
                          <span>{currentStatus.replace("_", " ")}</span>
                        </Badge>
                        <Badge variant="outline" className="capitalize">{item.priority}</Badge>
                        <Badge variant="outline" className="capitalize" title="Category">
                          <Tag className="h-3 w-3 mr-1" /> {item.category}
                        </Badge>
                        {item.departmentName && (
                          <Badge variant="outline">Dept: {item.departmentName}</Badge>
                        )}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{createdStr}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p className="whitespace-pre-wrap text-foreground">{item.description}</p>
                    </div>
                    {address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span className="text-muted-foreground">Address:</span>
                        <span className="text-foreground">{address}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {item.reporterFullName && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Reporter:</span>
                          <span>{item.reporterFullName}</span>
                        </div>
                      )}
                      {item.reporterEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span>{item.reporterEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Update Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add notes (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                  <div className="flex gap-2 mt-3">
                    <Button variant="secondary" disabled={saving} onClick={addUpdate}>Add Update (In Progress)</Button>
                    <Button variant="outline" disabled={saving} onClick={toggleHold}>
                      {currentStatus === "on_hold" ? "Resume (In Progress)" : "Put On Hold"}
                    </Button>
                    <Button disabled={saving} onClick={toggleResolve}>{currentStatus === "resolved" ? "Reopen" : "Mark Resolved"}</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Status Updates {updates.length > 0 ? `(${updates.length})` : ""}</CardTitle>
                    <Button variant="outline" size="sm" onClick={reloadUpdates} className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {updates.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No status updates yet.</div>
                  ) : (
                    <ul className="rounded-md border divide-y divide-border overflow-hidden">
                      {updates.map((u) => {
                        const d = new Date(u.createdAt)
                        const dateStr = d.toLocaleString()
                        const statusLabel = u.status.replace("_", " ")
                        return (
                          <li key={u.id} className="p-3">
                            {u.notes && (
                              <div className="text-foreground text-sm md:text-base whitespace-pre-wrap">
                                {u.notes}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {dateStr} — set to <span className="capitalize">{statusLabel}</span>
                              {u.authorLabel ? ` by ${u.authorLabel}` : ""}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
