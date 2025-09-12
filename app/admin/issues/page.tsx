// Enhanced Admin issues management page with task tracker functionality

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { mockIssues, mockUsers } from "@/lib/mock-data"
import type { Issue, Department, IssueComment } from "@/lib/types"
import { 
  ArrowLeft, 
  Search, 
  Edit, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  User,
  Building2,
  MessageSquare,
  Plus,
  Send,
  Eye,
  Users,
  Mail,
  FileText,
  Target,
  Timer
} from "lucide-react"

function IssuesManagementContent() {
  const router = useRouter()
  const [issues, setIssues] = useState<Issue[]>([])
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [newComment, setNewComment] = useState("")
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
  
  // Mock departments data
  const [departments] = useState<Department[]>([
    { id: "1", name: "Maintenance", description: "Property maintenance and repairs", email: "maintenance@hoa.local", isActive: true, createdAt: "", updatedAt: "" },
    { id: "2", name: "Security", description: "Security and safety concerns", email: "security@hoa.local", isActive: true, createdAt: "", updatedAt: "" },
    { id: "3", name: "Landscaping", description: "Grounds and landscaping issues", email: "landscaping@hoa.local", isActive: true, createdAt: "", updatedAt: "" },
    { id: "4", name: "Administration", description: "Administrative and general inquiries", email: "admin@hoa.local", isActive: true, createdAt: "", updatedAt: "" },
    { id: "5", name: "Finance", description: "Billing and financial matters", email: "finance@hoa.local", isActive: true, createdAt: "", updatedAt: "" }
  ])
  
  const [assignedDepartments, setAssignedDepartments] = useState<{[key: string]: string[]}>({})
  const [issueComments, setIssueComments] = useState<{[key: string]: IssueComment[]}>({})
  const [isAssigningDepartment, setIsAssigningDepartment] = useState(false)
  const [isAddingComment, setIsAddingComment] = useState(false)

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
          issue.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          issue.referenceCode?.toLowerCase().includes(searchTerm.toLowerCase()),
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

    // Department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter((issue) => 
        assignedDepartments[issue.id]?.includes(departmentFilter)
      )
    }

    setFilteredIssues(filtered)
  }, [issues, searchTerm, statusFilter, priorityFilter, departmentFilter, assignedDepartments])

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

  const handleAssignDepartment = (issueId: string, departmentId: string) => {
    setAssignedDepartments(prev => ({
      ...prev,
      [issueId]: [...(prev[issueId] || []), departmentId]
    }))
    // TODO: Send email notification to department
    console.log(`Assigned issue ${issueId} to department ${departmentId}`)
  }

  const handleAddComment = (issueId: string) => {
    if (!newComment.trim()) return
    
    const comment: IssueComment = {
      id: Date.now().toString(),
      issueId,
      authorId: "current-user", // TODO: Get from auth
      comment: newComment,
      isInternal: false,
      createdAt: new Date().toISOString()
    }
    
    setIssueComments(prev => ({
      ...prev,
      [issueId]: [...(prev[issueId] || []), comment]
    }))
    setNewComment("")
    setIsAddingComment(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      {/* Header */}
      <header className="bg-gray-900/95 backdrop-blur-xl border-b border-gray-700/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin")}
                className="flex items-center space-x-2 text-gray-300 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Admin</span>
              </Button>
              <div className="flex items-center space-x-2">
                <div className="bg-orange-500 rounded-lg p-2">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Issues Task Tracker</h1>
                  <p className="text-sm text-gray-400">Manage and track community issues across departments</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className={viewMode === "cards" ? "bg-orange-500 hover:bg-orange-600" : "border-gray-600 text-gray-300 hover:bg-gray-800"}
              >
                Cards
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={viewMode === "table" ? "bg-orange-500 hover:bg-orange-600" : "border-gray-600 text-gray-300 hover:bg-gray-800"}
              >
                Table
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Issues</p>
                  <p className="text-2xl font-bold text-white">{issues.length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Open</p>
                  <p className="text-2xl font-bold text-orange-400">{issues.filter(i => i.status === 'open').length}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">In Progress</p>
                  <p className="text-2xl font-bold text-blue-400">{issues.filter(i => i.status === 'in_progress').length}</p>
                </div>
                <Timer className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Resolved</p>
                  <p className="text-2xl font-bold text-green-400">{issues.filter(i => i.status === 'resolved').length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search issues by title, description, category, or reference code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40 bg-gray-800/50 border-gray-600 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-40 bg-gray-800/50 border-gray-600 text-white">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full md:w-40 bg-gray-800/50 border-gray-600 text-white">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-gray-300 border-gray-600 whitespace-nowrap">
                {filteredIssues.length} issues
              </Badge>
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
  return (
    <ProtectedRoute requiredRole="staff">
      <IssuesManagementContent />
    </ProtectedRoute>
  )
}
