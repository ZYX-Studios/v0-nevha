// Admin dashboard with overview and management tools

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { mockHomeowners, mockAnnouncements, mockIssues, mockCarStickers } from "@/lib/mock-data"
import type { Announcement, Issue } from "@/lib/types"
import { Home, Users, MessageSquare, AlertCircle, Car, Plus, ArrowLeft, CheckCircle, Clock } from "lucide-react"

function AdminDashboardContent() {
  const { session, logout } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalHomeowners: 0,
    activeIssues: 0,
    publishedAnnouncements: 0,
    activeCarStickers: 0,
    recentIssues: [] as Issue[],
    recentAnnouncements: [] as Announcement[],
  })
  

  useEffect(() => {
    // Calculate statistics
    const totalHomeowners = mockHomeowners.length
    const activeIssues = mockIssues.filter((issue) => issue.status !== "resolved" && issue.status !== "closed").length
    const publishedAnnouncements = mockAnnouncements.filter((a) => a.isPublished).length
    const activeCarStickers = mockCarStickers.filter((s) => s.isActive).length

    // Get recent items
    const recentIssues = mockIssues
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)

    const recentAnnouncements = mockAnnouncements
      .filter((a) => a.isPublished)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)

    setStats({
      totalHomeowners,
      activeIssues,
      publishedAnnouncements,
      activeCarStickers,
      recentIssues,
      recentAnnouncements,
    })
  }, [])

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back Home</span>
              </Button>
              <div className="flex items-center space-x-2">
                <div className="bg-primary rounded-lg p-2">
                  <Home className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Admin Dashboard</h1>
                  <p className="text-sm text-muted-foreground">Community Management Portal</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await logout()
                  router.push("/auth")
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => router.push("/admin/homeowners")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Homeowners</p>
                  <p className="text-2xl font-bold">{stats.totalHomeowners}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => router.push("/admin/issues")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Issues</p>
                  <p className="text-2xl font-bold">{stats.activeIssues}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => router.push("/admin/announcements")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Announcements</p>
                  <p className="text-2xl font-bold">{stats.publishedAnnouncements}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => router.push("/admin/homeowners")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Car Stickers</p>
                  <p className="text-2xl font-bold">{stats.activeCarStickers}</p>
                </div>
                <Car className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Button onClick={() => router.push("/admin/announcements/new")} className="h-16 flex-col space-y-2">
            <Plus className="h-5 w-5" />
            <span className="text-sm">New Announcement</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/admin/homeowners")}
            className="h-16 flex-col space-y-2"
          >
            <Users className="h-5 w-5" />
            <span className="text-sm">Manage Homeowners</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/admin/departments")}
            className="h-16 flex-col space-y-2"
          >
            <Home className="h-5 w-5" />
            <span className="text-sm">Manage Departments</span>
          </Button>

          <Button variant="outline" onClick={() => router.push("/admin/issues")} className="h-16 flex-col space-y-2">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">Manage Issues</span>
          </Button>

          {/* Parking Management link removed as the route does not exist yet */}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Issues */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Issues</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => router.push("/admin/issues")}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentIssues.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No recent issues</p>
                ) : (
                  stats.recentIssues.map((issue) => (
                    <div key={issue.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium truncate">{issue.title}</h4>
                          <Badge
                            variant={getStatusVariant(issue.status)}
                            className="text-xs flex items-center space-x-1"
                          >
                            {getStatusIcon(issue.status)}
                            <span className="capitalize">{issue.status.replace("_", " ")}</span>
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{issue.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant={getPriorityVariant(issue.priority)} className="text-xs">
                            {issue.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(issue.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Announcements */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Announcements</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => router.push("/admin/announcements")}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentAnnouncements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No recent announcements</p>
                ) : (
                  stats.recentAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="p-3 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium">{announcement.title}</h4>
                        <Badge variant={getPriorityVariant(announcement.priority)} className="text-xs">
                          {announcement.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{announcement.content}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </span>
                        <Badge variant={announcement.isPublished ? "default" : "outline"} className="text-xs">
                          {announcement.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return <AdminDashboardContent />
}
