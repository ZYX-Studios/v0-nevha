// Admin issues management page

"use client"

import { useState, useEffect } from "react"
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
} from "@/components/ui/dialog"
import type { Issue } from "@/lib/types"
import { ArrowLeft, Search, Edit, CheckCircle, Clock, AlertCircle, Calendar, MapPin, User } from "lucide-react"
import { toast } from "sonner"

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
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
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
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Issue Status</DialogTitle>
                            <DialogDescription>
                              Change the status of this issue and add resolution notes if needed.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">{selectedIssue?.title}</h4>
                              <p className="text-sm text-muted-foreground">{selectedIssue?.description}</p>
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
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setSelectedIssue(null)} className="flex-1">
                                Cancel
                              </Button>
                              <Button onClick={() => handleAddUpdate(issue.id)} className="flex-1" variant="secondary">
                                Add Update (In Progress)
                              </Button>
                              <Button onClick={() => handleToggleResolve(issue)} className="flex-1">
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
