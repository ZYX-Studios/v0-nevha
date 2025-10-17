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
import { ArrowLeft, Search, Edit, CheckCircle, Clock, AlertCircle, Calendar, MapPin, User, Download, Trash2 } from "lucide-react"
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
  // Optional UI-oriented fields from the API (graceful fallback if absent)
  uiStatusCounts?: {
    not_started: number
    in_progress: number
    on_hold: number
    resolved: number
    closed: number
  }
  uiOpenCount?: number
}

function IssuesManagementContent() {
  const router = useRouter()
  const basePath = "/admin"
  const [issues, setIssues] = useState<Issue[]>([])
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState("")
  // Resolution notes are handled within status updates; detailed view available per-issue
  const [stats, setStats] = useState<IssuesStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([])
  // Sort state
  const [sortBy, setSortBy] = useState<"createdAt" | "priority" | "status">("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/admin/issues", { cache: "no-store", credentials: "same-origin" })
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

  // Load departments for filter
  useEffect(() => {
    let cancelled = false
    async function loadDepartments() {
      try {
        const res = await fetch("/api/departments", { cache: "no-store" })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || "Failed to load departments")
        const items = Array.isArray(json.items) ? json.items : []
        if (!cancelled) setDepartments(items)
      } catch {
        if (!cancelled) setDepartments([])
      }
    }
    loadDepartments()
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
        const res = await fetch("/api/admin/issues/stats", { cache: "no-store", credentials: "same-origin" })
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
      const res = await fetch("/api/admin/issues", { cache: "no-store", credentials: "same-origin" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to load issues")
      const items = Array.isArray(json.items) ? (json.items as Issue[]) : []
      setIssues(items)
    } catch {
      // keep previous issues if refresh fails
    }
  }

  const handleDeleteIssue = async (issueId: string) => {
    try {
      setDeletingId(issueId)
      const res = await fetch(`/api/admin/issues/${issueId}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to delete issue")
      toast.success("Issue deleted")
      setIssues((prev) => prev.filter((it) => it.id !== issueId))
      await reloadStats()
    } catch (e) {
      toast.error((e as any)?.message || "Failed to delete issue")
    } finally {
      setDeletingId(null)
    }
  }

  // Reload stats on-demand (e.g., after updates)
  const reloadStats = async () => {
    try {
      setStatsLoading(true)
      const res = await fetch("/api/admin/issues/stats", { cache: "no-store", credentials: "same-origin" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to load stats")
      setStats(json as IssuesStats)
    } catch {
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }

  // Map backend statusCounts (DB enums) to UI status buckets, prefer API-provided uiStatusCounts
  const uiStatusCounts = useMemo(() => {
    const fromApi = (stats as any)?.uiStatusCounts
    if (fromApi && typeof fromApi === "object") {
      return fromApi as {
        not_started: number
        in_progress: number
        on_hold: number
        resolved: number
        closed: number
      }
    }
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

  const priorityCountsFromIssues = useMemo(() => {
    const counts: Record<string, number> = { P1: 0, P2: 0, P3: 0, P4: 0 }
    for (const i of issues) {
      const k = (i.priority || "P3").toUpperCase()
      if (k in counts) counts[k] += 1
    }
    return counts
  }, [issues])

  // Unified open count: prefer live issues; fallback to API uiOpenCount; then derive from uiStatusCounts
  const openUICount = useMemo(() => {
    const local = uiCountsFromIssues.not_started + uiCountsFromIssues.in_progress + uiCountsFromIssues.on_hold
    if (issues.length > 0) return local
    if (typeof stats?.uiOpenCount === "number") return stats.uiOpenCount
    return uiStatusCounts.not_started + uiStatusCounts.in_progress + uiStatusCounts.on_hold
  }, [issues, uiCountsFromIssues, stats, uiStatusCounts])

  const openUICardCount = useMemo(() => {
    if (typeof stats?.uiOpenCount === "number") return stats.uiOpenCount
    return openUICount
  }, [stats, openUICount])

  const totalUICardCount = useMemo(() => {
    if (issues.length > 0) return issues.length
    if (stats?.uiStatusCounts) {
      const s = stats.uiStatusCounts
      return (s.not_started || 0) + (s.in_progress || 0) + (s.on_hold || 0) + (s.resolved || 0) + (s.closed || 0)
    }
    if (typeof stats?.total === "number") return stats.total
    return 0
  }, [issues, stats])

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

  const handlePriorityChange = async (issueId: string, newPriority: string) => {
    try {
      const res = await fetch(`/api/admin/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to update priority")
      toast.success("Priority updated successfully")
      setIssues((prev) => prev.map((it) => (it.id === issueId ? { ...it, priority: newPriority as any } : it)))
      await reloadIssues()
      await reloadStats()
    } catch (e) {
      const msg = (e as any)?.message || e
      toast.error(`Failed to update priority: ${msg}`)
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
    let list = issues

    // Search filter
    if (searchTerm.trim()) {
      list = list.filter(
        (issue) =>
          issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          issue.category.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((issue) => issue.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== "all") {
      list = list.filter((issue) => issue.priority === priorityFilter)
    }

    // Department filter (by category matching department name, case-insensitive)
    if (departmentFilter !== "all") {
      const selectedDept = departments.find(d => d.id === departmentFilter)
      if (selectedDept) {
        list = list.filter((issue) => 
          issue.category.toLowerCase() === selectedDept.name.toLowerCase()
        )
      }
    }

    // Sorting
    const priOrder: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 }
    const stOrder: Record<string, number> = { not_started: 1, in_progress: 2, on_hold: 3, resolved: 4, closed: 5 }
    const dir = sortDir === "asc" ? 1 : -1
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "createdAt") {
        const aa = new Date(a.createdAt).getTime()
        const bb = new Date(b.createdAt).getTime()
        return (aa - bb) * dir
      }
      if (sortBy === "priority") {
        const aa = priOrder[a.priority] || 99
        const bb = priOrder[b.priority] || 99
        return (aa - bb) * dir
      }
      if (sortBy === "status") {
        const aa = stOrder[a.status] || 99
        const bb = stOrder[b.status] || 99
        return (aa - bb) * dir
      }
      return 0
    })

    setFilteredIssues(sorted)
  }, [issues, searchTerm, statusFilter, priorityFilter, departmentFilter, departments, sortBy, sortDir])

  // Export helpers
  function toCsvValue(v: any) {
    const s = v == null ? "" : String(v)
    // Escape quotes and wrap
    const esc = s.replace(/"/g, '""')
    return `"${esc}"`
  }

  function downloadCsv(filename: string, rows: string[]) {
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function buildCsv(items: Issue[]) {
    const header = [
      "ref_code",
      "title",
      "description",
      "category",
      "priority",
      "status",
      "createdAt",
      "updatedAt",
      "resolvedAt",
      "reporterFullName",
      "reporterEmail",
      "reporterPhase",
      "reporterBlock",
      "reporterLot",
      "reporterStreet",
      "location",
      "assignedTo",
    ]
    const rows = [header.map(toCsvValue).join(",")]
    for (const i of items) {
      rows.push(
        [
          i.ref_code || "",
          i.title,
          i.description,
          i.category,
          i.priority,
          i.status,
          i.createdAt,
          i.updatedAt,
          i.resolvedAt || "",
          i.reporterFullName || "",
          i.reporterEmail || "",
          i.reporterPhase || "",
          i.reporterBlock || "",
          i.reporterLot || "",
          i.reporterStreet || "",
          i.location || "",
          i.assignedTo || "",
        ].map(toCsvValue).join(","),
      )
    }
    return rows
  }

  const handleExportCsv = () => {
    const rows = buildCsv(filteredIssues)
    const ts = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const selectedDept = departments.find(d => d.id === departmentFilter)
    const deptSuffix = selectedDept ? `-${selectedDept.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}` : ""
    const filename = `issues-export${deptSuffix}-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}.csv`
    downloadCsv(filename, rows)
  }

  const handleQuickExportAll = () => {
    // Export all issues by createdAt desc, ignoring current filters
    const sortedAll = [...issues].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const rows = buildCsv(sortedAll)
    const ts = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const filename = `issues-quick-export-all-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}.csv`
    downloadCsv(filename, rows)
  }

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
      case "P1":
        return "destructive"
      case "P2":
        return "secondary"
      case "P3":
        return "default"
      case "P4":
        return "outline"
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
              <div className="text-3xl font-bold">{statsLoading && !stats ? "…" : totalUICardCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Open Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{openUICardCount}</div>
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
                stats?.uiStatusCounts ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { k: "not_started", label: "Not Started", value: uiStatusCounts.not_started },
                      { k: "in_progress", label: "In Progress", value: uiStatusCounts.in_progress },
                      { k: "on_hold", label: "On Hold", value: uiStatusCounts.on_hold },
                      { k: "resolved", label: "Resolved", value: uiStatusCounts.resolved },
                      { k: "closed", label: "Closed", value: uiStatusCounts.closed },
                    ].map((s) => (
                      <div key={s.k} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="font-medium">{s.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                )
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
              {(statsLoading || !stats) ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { k: "P1", label: "Critical" },
                    { k: "P2", label: "High" },
                    { k: "P3", label: "Medium" },
                    { k: "P4", label: "Low" },
                  ].map((p) => (
                    <div key={p.k} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{p.label}</span>
                      <span className="font-medium">{stats?.priorityCounts?.[p.k] ?? (priorityCountsFromIssues[p.k] ?? 0)}</span>
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

        {/* Search and Filters */}
        <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-white to-gray-50/50">
          <CardContent className="p-6">
            {/* Search Bar - Prominent and Large */}
            <div className="mb-6">
              <div className="relative max-w-2xl">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search issues by title, description, category, or reference code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 text-base bg-white border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg shadow-sm transition-all duration-200"
                />
              </div>
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Department</label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="bg-white border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-500/20 transition-colors">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-500/20 transition-colors">
                    <SelectValue placeholder="All Status" />
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
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="bg-white border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-500/20 transition-colors">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="P1">P1 (Critical)</SelectItem>
                    <SelectItem value="P2">P2 (High)</SelectItem>
                    <SelectItem value="P3">P3 (Medium)</SelectItem>
                    <SelectItem value="P4">P4 (Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Sort By</label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="bg-white border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-500/20 transition-colors">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Order</label>
                <Select value={sortDir} onValueChange={(v) => setSortDir(v as any)}>
                  <SelectTrigger className="bg-white border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-500/20 transition-colors">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Actions</label>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleExportCsv} 
                    className="flex-1 bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
              <Button 
                variant="secondary" 
                onClick={handleQuickExportAll} 
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Quick Export (All Issues)
              </Button>
              
              {/* Active Filters Display */}
              {(searchTerm || statusFilter !== "all" || priorityFilter !== "all" || departmentFilter !== "all") && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Active filters:</span>
                  {searchTerm && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                      Search: "{searchTerm}"
                    </span>
                  )}
                  {departmentFilter !== "all" && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md">
                      Dept: {departments.find(d => d.id === departmentFilter)?.name}
                    </span>
                  )}
                  {statusFilter !== "all" && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md">
                      Status: {statusFilter.replace("_", " ")}
                    </span>
                  )}
                  {priorityFilter !== "all" && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md">
                      Priority: {priorityFilter}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("")
                      setStatusFilter("all")
                      setPriorityFilter("all")
                      setDepartmentFilter("all")
                    }}
                    className="text-gray-500 hover:text-gray-700 px-2 py-1 h-auto"
                  >
                    Clear all
                  </Button>
                </div>
              )}
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
                  {searchTerm || statusFilter !== "all" || priorityFilter !== "all" || departmentFilter !== "all"
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
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => { /* open confirm dialog */ }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[520px] w-[calc(100vw-2rem)] p-4 md:p-6">
                          <DialogHeader>
                            <DialogTitle>Delete Issue</DialogTitle>
                            <DialogDescription>
                              This action cannot be undone. This will permanently delete the issue and all related status updates, attachments, comments, and department links.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            <p className="text-sm text-foreground">{issue.title}</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            <DialogClose asChild>
                              <Button variant="outline" className="w-full">
                                Cancel
                              </Button>
                            </DialogClose>
                            <Button
                              variant="destructive"
                              className="w-full"
                              onClick={() => handleDeleteIssue(issue.id)}
                              disabled={deletingId === issue.id}
                            >
                              {deletingId === issue.id ? "Deleting…" : "Delete"}
                            </Button>
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
