"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, LogOut, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface IssueItem {
  id: string
  ref_code: string
  title: string
  description: string
  category: string
  priority: "P1" | "P2" | "P3" | "P4"
  status: "not_started" | "in_progress" | "on_hold" | "resolved" | "closed"
  location: string | null
  reporterBlock: string | null
  reporterLot: string | null
  reporterPhase: string | null
  reporterStreet: string | null
  reporterFullName: string | null
  reporterEmail: string | null
  createdAt: string
  updatedAt: string
}

export default function DeptIssuesPage() {
  const router = useRouter()
  const [dept, setDept] = useState<{ id: string; name: string } | null>(null)
  const [issues, setIssues] = useState<IssueItem[]>([])
  const [statusFilter, setStatusFilter] = useState("not_started")
  const [loading, setLoading] = useState(true)

  const loadMe = async () => {
    const r = await fetch("/api/dept/me", { cache: "no-store" })
    const j = await r.json()
    if (!r.ok) throw new Error(j?.error || "Unauthorized")
    setDept(j.department)
  }

  const loadIssues = async () => {
    const q = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ""
    const r = await fetch(`/api/dept/issues${q}`, { cache: "no-store" })
    const j = await r.json()
    if (!r.ok) throw new Error(j?.error || "Failed to load issues")
    setIssues(Array.isArray(j.items) ? j.items : [])
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await loadMe()
        await loadIssues()
      } catch (e) {
        toast.error((e as any)?.message || "Failed to load department portal")
        router.replace("/dept/login")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!dept) return
    ;(async () => {
      try {
        await loadIssues()
      } catch (e) {
        toast.error((e as any)?.message || "Failed to load issues")
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dept?.id])

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString()

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

  const handlePriorityChange = async (issueId: string, newPriority: string) => {
    try {
      const res = await fetch(`/api/dept/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to update priority")
      toast.success("Priority updated successfully")
      setIssues((prev) => prev.map((it) => (it.id === issueId ? { ...it, priority: newPriority as any } : it)))
    } catch (e) {
      const msg = (e as any)?.message || e
      toast.error(`Failed to update priority: ${msg}`)
    }
  }

  const onLogout = async () => {
    try {
      await fetch("/api/dept/session/logout", { method: "POST" })
      router.replace("/dept/login")
    } catch {}
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Department Issues</h1>
            <p className="text-sm text-muted-foreground">{dept ? `Department: ${dept.name}` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadIssues()} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-4 flex gap-3 items-center">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : issues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">No issues found</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {issues.map((i) => (
              <Card key={i.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getStatusVariant(i.status)} className="capitalize">{i.status.replace("_", " ")}</Badge>
                        <Badge variant={getPriorityVariant(i.priority)} className="capitalize">{i.priority}</Badge>
                        <Badge variant="outline">{i.category}</Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(i.createdAt)}</span>
                        </div>
                      </div>
                      <CardTitle className="text-lg">{i.title}</CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {i.description}
                      </p>
                    </div>
                    <div>
                      <Button size="sm" onClick={() => router.push(`/dept/issues/${i.id}`)}>View</Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
