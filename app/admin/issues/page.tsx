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
import { mockIssues, mockUsers } from "@/lib/mock-data"
import type { Issue } from "@/lib/types"
import { ArrowLeft, Search, Edit, CheckCircle, Clock, AlertCircle, Calendar, MapPin, User } from "lucide-react"

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

  useEffect(() => {
    // Sort issues by creation date (newest first)
    const sorted = [...mockIssues].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setIssues(sorted)
  }, [])

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

  const handleStatusChange = (issueId: string, newStatus: string) => {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              status: newStatus as any,
              resolvedAt: newStatus === "resolved" ? new Date().toISOString() : undefined,
              resolutionNotes: newStatus === "resolved" ? resolutionNotes : issue.resolutionNotes,
            }
          : issue,
      ),
    )
    setSelectedIssue(null)
    setResolutionNotes("")
  }

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

  const getReporterName = (reporterId?: string) => {
    if (!reporterId) return "Unknown"
    const reporter = mockUsers.find((user) => user.id === reporterId)
    return reporter ? `${reporter.firstName} ${reporter.lastName}` : "Unknown"
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
                          <span>{getReporterName(issue.reporterId)}</span>
                        </div>
                        {issue.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{issue.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedIssue(issue)}>
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
                            <div className="space-y-2">
                              <label className="text-sm font-medium">New Status</label>
                              <Select
                                defaultValue={selectedIssue?.status}
                                onValueChange={(value) => {
                                  if (value === "resolved") {
                                    // Show resolution notes field
                                  } else {
                                    handleStatusChange(selectedIssue?.id || "", value)
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Resolution Notes (Optional)</label>
                              <Textarea
                                placeholder="Add notes about how this issue was resolved..."
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                rows={3}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setSelectedIssue(null)} className="flex-1">
                                Cancel
                              </Button>
                              <Button
                                onClick={() => handleStatusChange(selectedIssue?.id || "", "resolved")}
                                className="flex-1"
                              >
                                Update Status
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground mb-4">{issue.description}</p>
                  {issue.resolutionNotes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <h5 className="font-medium text-sm mb-1">Resolution Notes:</h5>
                      <p className="text-sm text-muted-foreground">{issue.resolutionNotes}</p>
                      {issue.resolvedAt && (
                        <p className="text-xs text-muted-foreground mt-2">Resolved on {formatDate(issue.resolvedAt)}</p>
                      )}
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
