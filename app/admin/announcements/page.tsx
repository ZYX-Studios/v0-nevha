// Admin announcements management page

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { mockAnnouncements } from "@/lib/mock-data"
import type { Announcement } from "@/lib/types"
import { ArrowLeft, Plus, Search, Edit, Trash2, Eye, EyeOff, Calendar } from "lucide-react"

function AnnouncementsManagementContent() {
  const router = useRouter()
  const basePath = "/admin"
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  useEffect(() => {
    // Sort announcements by creation date (newest first)
    const sorted = [...mockAnnouncements].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    setAnnouncements(sorted)
  }, [])

  useEffect(() => {
    // Apply filters
    let filtered = announcements

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (announcement) =>
          announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          announcement.content.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((announcement) => {
        if (statusFilter === "published") return announcement.isPublished
        if (statusFilter === "draft") return !announcement.isPublished
        return true
      })
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((announcement) => announcement.priority === priorityFilter)
    }

    setFilteredAnnouncements(filtered)
  }, [announcements, searchTerm, statusFilter, priorityFilter])

  const handleTogglePublish = (id: string) => {
    setAnnouncements((prev) =>
      prev.map((announcement) =>
        announcement.id === id ? { ...announcement, isPublished: !announcement.isPublished } : announcement,
      ),
    )
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this announcement?")) {
      setAnnouncements((prev) => prev.filter((announcement) => announcement.id !== id))
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
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-lg font-bold">Manage Announcements</h1>
                <p className="text-sm text-muted-foreground">Create and manage community announcements</p>
              </div>
            </div>
            <Button onClick={() => router.push(`${basePath}/announcements/new`)}>
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Button>
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
                    placeholder="Search announcements..."
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
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
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

        {/* Announcements List */}
        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="bg-muted rounded-full p-3 w-fit mx-auto mb-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No announcements found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                    ? "Try adjusting your search or filters."
                    : "Create your first announcement to get started."}
                </p>
                <Button onClick={() => router.push(`${basePath}/announcements/new`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Announcement
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredAnnouncements.map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getPriorityVariant(announcement.priority)} className="capitalize">
                          {announcement.priority}
                        </Badge>
                        <Badge variant={announcement.isPublished ? "default" : "outline"}>
                          {announcement.isPublished ? "Published" : "Draft"}
                        </Badge>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(announcement.createdAt)}</span>
                        </div>
                      </div>
                      <CardTitle className="text-xl">{announcement.title}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleTogglePublish(announcement.id)}>
                        {announcement.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/announcements/${announcement.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(announcement.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3">{announcement.content}</p>
                  {announcement.publishDate && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Publish Date: {formatDate(announcement.publishDate)}
                        {announcement.expiryDate && <span> • Expires: {formatDate(announcement.expiryDate)}</span>}
                      </p>
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

export default function AnnouncementsManagementPage() {
  return <AnnouncementsManagementContent />
}
