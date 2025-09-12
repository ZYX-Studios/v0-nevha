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

        {/* Issues Content */}
        {viewMode === "cards" ? (
          <div className="space-y-4">
            {filteredIssues.length === 0 ? (
              <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30">
                <CardContent className="text-center py-12">
                  <div className="bg-gray-800/50 rounded-full p-3 w-fit mx-auto mb-4">
                    <Search className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">No issues found</h3>
                  <p className="text-gray-400">
                    {searchTerm || statusFilter !== "all" || priorityFilter !== "all" || departmentFilter !== "all"
                      ? "Try adjusting your search or filters."
                      : "No issues have been reported yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredIssues.map((issue) => (
                <Card key={issue.id} className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-2">
                          {issue.referenceCode && (
                            <Badge variant="outline" className="text-orange-400 border-orange-500/30 bg-orange-500/10 font-mono">
                              {issue.referenceCode}
                            </Badge>
                          )}
                          <Badge variant={getPriorityVariant(issue.priority)} className="capitalize">
                            {issue.priority}
                          </Badge>
                          <Badge variant={getStatusVariant(issue.status)} className="flex items-center space-x-1">
                            {getStatusIcon(issue.status)}
                            <span className="capitalize">{issue.status.replace("_", " ")}</span>
                          </Badge>
                          <Badge variant="outline" className="text-xs text-gray-300 border-gray-600">
                            {issue.category}
                          </Badge>
                          <div className="flex items-center space-x-1 text-sm text-gray-400">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(issue.createdAt)}</span>
                          </div>
                        </div>
                        <CardTitle className="text-xl text-white">{issue.title}</CardTitle>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
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
                        
                        {/* Assigned Departments */}
                        {assignedDepartments[issue.id] && assignedDepartments[issue.id].length > 0 && (
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <div className="flex flex-wrap gap-1">
                              {assignedDepartments[issue.id].map((deptId) => {
                                const dept = departments.find(d => d.id === deptId)
                                return dept ? (
                                  <Badge key={deptId} variant="secondary" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                                    {dept.name}
                                  </Badge>
                                ) : null
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Dialog open={isAssigningDepartment && selectedIssue?.id === issue.id} onOpenChange={setIsAssigningDepartment}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setSelectedIssue(issue)}
                              className="border-gray-600 text-gray-300 hover:bg-gray-800"
                            >
                              <Building2 className="h-4 w-4 mr-2" />
                              Assign Dept
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 text-white">
                            <DialogHeader>
                              <DialogTitle className="text-white">Assign Department</DialogTitle>
                              <DialogDescription className="text-gray-400">
                                Assign this issue to one or more departments for handling.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2 text-white">{selectedIssue?.title}</h4>
                                <p className="text-sm text-gray-400">{selectedIssue?.description}</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-gray-300">Select Department</Label>
                                <Select onValueChange={(deptId) => {
                                  if (selectedIssue) {
                                    handleAssignDepartment(selectedIssue.id, deptId)
                                    setIsAssigningDepartment(false)
                                  }
                                }}>
                                  <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                                    <SelectValue placeholder="Choose department" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-800 border-gray-600">
                                    {departments.map((dept) => (
                                      <SelectItem key={dept.id} value={dept.id}>
                                        <div className="flex items-center space-x-2">
                                          <span>{dept.name}</span>
                                          <span className="text-xs text-gray-400">({dept.email})</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Dialog open={isAddingComment && selectedIssue?.id === issue.id} onOpenChange={setIsAddingComment}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setSelectedIssue(issue)}
                              className="border-gray-600 text-gray-300 hover:bg-gray-800"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Comment
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 text-white">
                            <DialogHeader>
                              <DialogTitle className="text-white">Add Comment</DialogTitle>
                              <DialogDescription className="text-gray-400">
                                Add a comment or update to this issue.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-gray-300">Comment</Label>
                                <Textarea
                                  placeholder="Enter your comment or update..."
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                                  rows={4}
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setIsAddingComment(false)}
                                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={() => selectedIssue && handleAddComment(selectedIssue.id)}
                                  className="bg-orange-500 hover:bg-orange-600 text-white"
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Add Comment
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setSelectedIssue(issue)}
                              className="border-gray-600 text-gray-300 hover:bg-gray-800"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Update
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 text-white">
                            <DialogHeader>
                              <DialogTitle className="text-white">Update Issue Status</DialogTitle>
                              <DialogDescription className="text-gray-400">
                                Change the status of this issue and add resolution notes if needed.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2 text-white">{selectedIssue?.title}</h4>
                                <p className="text-sm text-gray-400">{selectedIssue?.description}</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-gray-300">New Status</Label>
                                <Select
                                  defaultValue={selectedIssue?.status}
                                  onValueChange={(value) => handleStatusChange(selectedIssue?.id || "", value)}
                                >
                                  <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-800 border-gray-600">
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-gray-300">Resolution Notes (Optional)</Label>
                                <Textarea
                                  placeholder="Add notes about how this issue was resolved..."
                                  value={resolutionNotes}
                                  onChange={(e) => setResolutionNotes(e.target.value)}
                                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                                  rows={3}
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 mb-4">{issue.description}</p>
                    
                    {/* Comments Section */}
                    {issueComments[issue.id] && issueComments[issue.id].length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h5 className="font-medium text-sm text-white">Comments:</h5>
                        {issueComments[issue.id].map((comment) => (
                          <div key={comment.id} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
                            <p className="text-sm text-gray-300">{comment.comment}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(comment.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {issue.resolutionNotes && (
                      <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <h5 className="font-medium text-sm mb-1 text-green-400">Resolution Notes:</h5>
                        <p className="text-sm text-gray-300">{issue.resolutionNotes}</p>
                        {issue.resolvedAt && (
                          <p className="text-xs text-gray-500 mt-2">Resolved on {formatDate(issue.resolvedAt)}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30">
            <CardHeader>
              <CardTitle className="text-white">Issues Table View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300">Reference</TableHead>
                      <TableHead className="text-gray-300">Title</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Priority</TableHead>
                      <TableHead className="text-gray-300">Category</TableHead>
                      <TableHead className="text-gray-300">Departments</TableHead>
                      <TableHead className="text-gray-300">Reporter</TableHead>
                      <TableHead className="text-gray-300">Created</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIssues.map((issue) => (
                      <TableRow key={issue.id} className="border-gray-700 hover:bg-gray-800/50">
                        <TableCell>
                          <span className="font-mono text-orange-400 text-sm">
                            {issue.referenceCode || `ISS-${issue.id.slice(0, 8)}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="font-medium text-white truncate">{issue.title}</div>
                            <div className="text-sm text-gray-400 truncate">{issue.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(issue.status)} className="flex items-center space-x-1 w-fit">
                            {getStatusIcon(issue.status)}
                            <span className="capitalize">{issue.status.replace("_", " ")}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityVariant(issue.priority)} className="capitalize">
                            {issue.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-gray-300 border-gray-600">
                            {issue.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {assignedDepartments[issue.id]?.map((deptId) => {
                              const dept = departments.find(d => d.id === deptId)
                              return dept ? (
                                <Badge key={deptId} variant="secondary" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                                  {dept.name}
                                </Badge>
                              ) : null
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-300">{getReporterName(issue.reporterId)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-400">{formatDate(issue.createdAt)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-white hover:bg-gray-800"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-white hover:bg-gray-800"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
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
