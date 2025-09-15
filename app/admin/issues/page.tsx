// Admin issues management page

"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import type { Issue } from "@/lib/types"
import { ArrowLeft, Search, Edit, CheckCircle, Clock, AlertCircle, Calendar, MapPin, User } from "lucide-react"
import { toast } from "sonner"

type IssuesStats = {
  total: number
  openCount: number
  statusCounts: Record<string, number>
  priorityCounts: Record<string, number>
  createdLast7Days: number
  resolvedLast7Days: number
  avgResolutionDays: number | null
  perDepartment: { departmentId: string; departmentName: string; count: number }[]
}

function IssuesManagementContent() {
  const router = useRouter()
  const basePath = "/admin"
  const [issues, setIssues] = useState<Issue[]>([])
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState("")
  // Resolution notes are handled within status updates; detailed view available per-issue
  const [stats, setStats] = useState<IssuesStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/admin/issues", { cache: "no-store" })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || "Failed to load issues")
        const items = Array.isArray(json.items) ? (json.items as Issue[]) : []
        if (!cancelled) setIssues(items)
      } catch {
        if (!cancelled) setIssues([])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Load dashboard stats
  useEffect(() => {
    let cancelled = false
    async function loadStats() {
      try {
        setStatsLoading(true)
        const res = await fetch("/api/admin/issues/stats", { cache: "no-store" })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || "Failed to load stats")
        if (!cancelled) setStats(json as IssuesStats)
      } catch {
        if (!cancelled) setStats(null)
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }
    loadStats()
    return () => {
      cancelled = true
    }
  }, [])

  // Reload issues on-demand (keeps dashboard counts in sync even if something else updated the DB)
  const reloadIssues = async () => {
    try {
      const res = await fetch("/api/admin/issues", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to load issues")
      const items = Array.isArray(json.items) ? (json.items as Issue[]) : []
      setIssues(items)
    } catch {
      // keep previous issues if refresh fails
    }
  }

  // Reload stats on-demand (e.g., after updates)
  const reloadStats = async () => {
    try {
      setStatsLoading(true)
      const res = await fetch("/api/admin/issues/stats", { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to load stats")
      setStats(json as IssuesStats)
    } catch {
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }

  // Map backend statusCounts (DB enums) to UI status buckets
  const uiStatusCounts = useMemo(() => {
    const raw = stats?.statusCounts || {}
    // Normalize keys defensively (uppercase) to avoid casing or snake-case issues
    const sc: Record<string, number> = {}
    for (const [k, v] of Object.entries(raw)) {
      sc[(k || "").toUpperCase()] = Number(v) || 0
    }
    return {
      not_started: (sc.NEW || 0) + (sc.TRIAGED || 0),
      in_progress: sc.IN_PROGRESS || 0,
      on_hold: sc.NEEDS_INFO || 0,
      resolved: sc.RESOLVED || 0,
      closed: sc.CLOSED || 0,
    }
  }, [stats])

  // Derive UI status counts directly from the loaded issues so dashboard updates instantly
  const uiCountsFromIssues = useMemo(() => {
    const counts = {
      not_started: 0,
      in_progress: 0,
      on_hold: 0,
      resolved: 0,
      closed: 0,
    }
    for (const i of issues) {
      const k = (i.status || "not_started") as keyof typeof counts
      if (k in counts) counts[k] += 1
    }
    return counts
  }, [issues])

  // Add update without specifying status -> API defaults to in_progress
  const handleAddUpdate = async (issueId: string) => {
    try {
      const payload: any = {}
      if (resolutionNotes.trim()) payload.notes = resolutionNotes.trim()
      const res = await fetch(`/api/admin/issues/${issueId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to add update")
      toast.success("Update added (set to In Progress)")
      setIssues((prev) => prev.map((it) => (it.id === issueId ? { ...it, status: "in_progress" as any } : it)))
      setSelectedIssue(null)
      setResolutionNotes("")
      await reloadIssues()
      await reloadStats()
    } catch (e) {
      const msg = (e as any)?.message || e
      toast.error(String(msg))
    }
  }

  // Toggle between resolved and in_progress
  const handleToggleResolve = async (issue: Issue) => {
    try {
      const targetStatus = issue.status === "resolved" ? "in_progress" : "resolved"
      const payload: any = { status: targetStatus }
      if (resolutionNotes.trim()) payload.notes = resolutionNotes.trim()
      const res = await fetch(`/api/admin/issues/${issue.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to update status")
      toast.success(targetStatus === "resolved" ? "Marked as resolved" : "Reopened (In Progress)")
      setIssues((prev) => prev.map((it) => (it.id === issue.id ? { ...it, status: targetStatus as any } : it)))
      setSelectedIssue(null)
      setResolutionNotes("")
      await reloadIssues()
      await reloadStats()
    } catch (e) {
      toast.error((e as any)?.message || "Failed to update")
    }
  }

  // Toggle On Hold <-> In Progress
  const handleToggleHold = async (issue: Issue) => {
    try {
      const targetStatus = issue.status === "on_hold" ? "in_progress" : "on_hold"
      const payload: any = { status: targetStatus }
      if (resolutionNotes.trim()) payload.notes = resolutionNotes.trim()
      const res = await fetch(`/api/admin/issues/${issue.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to update status")
      toast.success(targetStatus === "on_hold" ? "Put on hold" : "Resumed (In Progress)")
      setIssues((prev) => prev.map((it) => (it.id === issue.id ? { ...it, status: targetStatus as any } : it)))
      setSelectedIssue(null)
      setResolutionNotes("")
      await reloadStats()
    } catch (e) {
      toast.error((e as any)?.message || "Failed to update")
    }
  }

  useEffect(() => {
    // Apply filters
    let filtered = issues

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (issue) =>
          issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          issue.category.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((issue) => issue.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((issue) => issue.priority === priorityFilter)
    }

    setFilteredIssues(filtered)
  }, [issues, searchTerm, statusFilter, priorityFilter])

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      const body: any = { status: newStatus }
      if (resolutionNotes.trim()) {
        body.notes = resolutionNotes.trim()
      }

      if (!issueId) {
        console.warn("[Issues] Missing issueId for status update", { newStatus, body })
        return
      }

      console.log("[Issues] PATCH status", { issueId, newStatus, body })
      const res = await fetch(`/api/admin/issues/${issueId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to update status")
      console.log("[Issues] Status updated", { issueId, newStatus })
      toast.success("Status updated")

      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                status: newStatus as any,
                resolvedAt: newStatus === "resolved" ? new Date().toISOString() : issue.resolvedAt,
                resolutionNotes: newStatus === "resolved" ? (body.notes || issue.resolutionNotes) : issue.resolutionNotes,
              }
            : issue,
        ),
      )
      setSelectedIssue(null)
      setResolutionNotes("")
    } catch (e) {
      const msg = (e as any)?.message || e
      console.warn("Update status failed:", msg)
      toast.error(`Failed to update status: ${String(msg)}`)
    }
  }

  // No updates timeline on list page; use details page for in-depth view

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-orange-600" />
    }
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "resolved":
        return "default"
      case "in_progress":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getPriorityVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case "urgent":
        return "destructive"
      case "high":
        return "secondary"
      default:
        return "outline"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getReporterLabel = (i: Issue) => {
    return i.reporterFullName || i.reporterEmail || "Anonymous"
  }

  const getAddress = (i: Issue) => {
    const parts: string[] = []
    if (i.reporterPhase) parts.push(`Phase ${i.reporterPhase}`)
    if (i.reporterBlock) parts.push(`Block ${i.reporterBlock}`)
    if (i.reporterLot) parts.push(`Lot ${i.reporterLot}`)
    if (i.reporterStreet) parts.push(`Street ${i.reporterStreet}`)
    if (i.location) parts.push(i.location)
    return parts.join(" • ")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(basePath)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-lg font-bold">Manage Issues</h1>
              <p className="text-sm text-muted-foreground">Review and resolve community issues</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statsLoading ? "…" : stats?.total ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Open Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{uiCountsFromIssues.not_started + uiCountsFromIssues.in_progress + uiCountsFromIssues.on_hold}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Created (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statsLoading ? "…" : stats?.createdLast7Days ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Resolved (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statsLoading ? "…" : stats?.resolvedLast7Days ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Avg Resolution Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statsLoading ? "…" : stats?.avgResolutionDays != null ? `${stats.avgResolutionDays}d` : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Average days from creation to first RESOLVED update.</p>
            </CardContent>
          </Card>
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {issues.length === 0 ? (
                <div className="text-sm text-muted-foreground">No issues yet.</div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { k: "not_started", label: "Not Started", value: uiCountsFromIssues.not_started },
                    { k: "in_progress", label: "In Progress", value: uiCountsFromIssues.in_progress },
                    { k: "on_hold", label: "On Hold", value: uiCountsFromIssues.on_hold },
                    { k: "resolved", label: "Resolved", value: uiCountsFromIssues.resolved },
                    { k: "closed", label: "Closed", value: uiCountsFromIssues.closed },
                  ].map((s) => (
                    <div key={s.k} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-medium">{s.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Priority Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading || !stats ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { k: "P1", label: "Urgent" },
                    { k: "P2", label: "High" },
                    { k: "P3", label: "Normal" },
                    { k: "P4", label: "Low" },
                  ].map((p) => (
                    <div key={p.k} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{p.label}</span>
                      <span className="font-medium">{stats.priorityCounts?.[p.k] ?? 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Issues by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading || !stats ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : stats.perDepartment && stats.perDepartment.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {stats.perDepartment.map((d) => (
                  <div key={d.departmentId} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{d.departmentName}</span>
                    <span className="font-medium">{d.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No department links found.</div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search issues..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Issues List */}
        <div className="space-y-4">
          {filteredIssues.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="bg-muted rounded-full p-3 w-fit mx-auto mb-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No issues found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                    ? "Try adjusting your search or filters."
                    : "No issues have been reported yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredIssues.map((issue) => (
              <Card key={issue.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <Badge variant={getPriorityVariant(issue.priority)} className="capitalize">
                          {issue.priority}
                        </Badge>
                        <Badge variant={getStatusVariant(issue.status)} className="flex items-center space-x-1">
                          {getStatusIcon(issue.status)}
                          <span className="capitalize">{issue.status.replace("_", " ")}</span>
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {issue.category}
                        </Badge>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(issue.createdAt)}</span>
                        </div>
                      </div>
                      <CardTitle className="text-xl">{issue.title}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span title={issue.reporterEmail || undefined}>{getReporterLabel(issue)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedIssue(issue)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Update Status
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[560px] w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto p-4 md:p-6">
                          <DialogHeader>
                            <DialogTitle>Update Issue Status</DialogTitle>
                            <DialogDescription>
                              Change the status of this issue and add resolution notes if needed.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <h4 className="font-medium">{selectedIssue?.title}</h4>
                              <p className="text-sm text-muted-foreground break-words">{selectedIssue?.description}</p>
                            </div>
                            {/* No status picker: Add Update => In Progress; or Toggle Resolved/Reopen */}
                            {/* Notes entry (optional) */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Notes (Optional)</label>
                              <Textarea
                                placeholder="Add notes about this status update..."
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                rows={3}
                                className="resize-y min-h-[96px]"
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              <DialogClose asChild>
                                <Button variant="outline" onClick={() => setSelectedIssue(null)} className="w-full">
                                  Cancel
                                </Button>
                              </DialogClose>
                              <Button onClick={() => handleAddUpdate(issue.id)} className="w-full" variant="secondary">
                                Add Update (In Progress)
                              </Button>
                              <Button onClick={() => handleToggleHold(issue)} className="w-full" variant="outline">
                                {issue.status === "on_hold" ? "Resume (In Progress)" : "Put On Hold"}
                              </Button>
                              <Button onClick={() => handleToggleResolve(issue)} className="w-full">
                                {issue.status === "resolved" ? "Reopen" : "Mark Resolved"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/issues/${issue.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground mb-2">{issue.description}</p>
                  {getAddress(issue) && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" />
                      <span className="text-muted-foreground">Address:</span>
                      <span className="text-foreground">{getAddress(issue)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function IssuesManagementPage() {
  return <IssuesManagementContent />
}
