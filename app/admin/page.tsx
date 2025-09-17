// Admin dashboard with overview and management tools

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
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
    adminUsers: 0,
    recentIssues: [] as Issue[],
    recentAnnouncements: [] as Announcement[],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/admin/stats', { cache: 'no-store' })
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard statistics')
        }
        
        const data = await response.json()
        
        setStats({
          totalHomeowners: data.stats.totalHomeowners,
          activeIssues: data.stats.activeIssues,
          publishedAnnouncements: data.stats.publishedAnnouncements,
          activeCarStickers: data.stats.activeCarStickers,
          adminUsers: data.stats.adminUsers,
          recentIssues: data.recentItems.issues,
          recentAnnouncements: data.recentItems.announcements,
        })
      } catch (err: any) {
        console.error('Failed to fetch dashboard stats:', err)
        setError(err.message || 'Failed to load dashboard statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
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
                onClick={() => {
                  console.log("[admin] Starting logout process (non-blocking)...")
                  // Fire-and-forget: do not await to avoid UI hang if signOut stalls
                  try { void logout() } catch {}
                  const dest = "/auth?logout=1"
                  console.log("[admin] Redirecting immediately ->", dest)
                  if (typeof window !== "undefined") {
                    window.location.replace(dest)
                  } else {
                    router.replace(dest)
                  }
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="p-4">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => !loading && router.push("/admin/homeowners")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Homeowners</p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : stats.totalHomeowners}
                  </p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => !loading && router.push("/admin/issues")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Issues</p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : stats.activeIssues}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => !loading && router.push("/admin/announcements")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Announcements</p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : stats.publishedAnnouncements}
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => !loading && router.push("/admin/homeowners")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Car Stickers</p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : stats.activeCarStickers}
                  </p>
                </div>
                <Car className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => !loading && router.push("/admin/users")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admin Users</p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : stats.adminUsers}
                  </p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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

          <Button
            variant="outline"
            onClick={() => router.push("/admin/users")}
            className="h-16 flex-col space-y-2"
          >
            <Users className="h-5 w-5" />
            <span className="text-sm">Manage Users</span>
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
                {loading ? (
                  <p className="text-center text-muted-foreground py-4">Loading recent issues...</p>
                ) : stats.recentIssues.length === 0 ? (
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
                {loading ? (
                  <p className="text-center text-muted-foreground py-4">Loading recent announcements...</p>
                ) : stats.recentAnnouncements.length === 0 ? (
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
