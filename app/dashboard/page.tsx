// Main dashboard for authenticated users

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/hooks/use-auth"
import { mockAnnouncements, mockIssues } from "@/lib/mock-data"
import type { Announcement, Issue } from "@/lib/types"
import { Home, LogOut, Plus, MessageSquare, AlertCircle, CheckCircle, Clock, Settings, Car, Users } from "lucide-react"

function DashboardContent() {
  const { session, logout } = useAuth()
  const router = useRouter()
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([])
  const [userIssues, setUserIssues] = useState<Issue[]>([])

  useEffect(() => {
    // Get recent published announcements
    const now = new Date()
    const published = mockAnnouncements
      .filter((announcement) => {
        const isPublished = announcement.isPublished
        const isNotExpired = !announcement.expiryDate || new Date(announcement.expiryDate) > now
        const isPublishDateReached = !announcement.publishDate || new Date(announcement.publishDate) <= now
        return isPublished && isNotExpired && isPublishDateReached
      })
      .sort((a, b) => {
        const dateA = new Date(a.publishDate || a.createdAt)
        const dateB = new Date(b.publishDate || b.createdAt)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 3)

    setRecentAnnouncements(published)

    // Get user's issues if they're a homeowner
    if (session.user?.role === "homeowner") {
      const issues = mockIssues
        .filter((issue) => issue.reporterId === session.user?.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
      setUserIssues(issues)
    }
  }, [session.user])

  const handleLogout = async () => {
    await logout()
    router.push("/")
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

  const isAdmin = session.user?.role === "admin" || session.user?.role === "staff"

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="bg-primary rounded-lg p-2">
                  <Home className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Welcome back, {session.user?.firstName}</h1>
                  <p className="text-sm text-muted-foreground capitalize">{session.user?.role} Dashboard</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isAdmin && (
                <Button variant="outline" onClick={() => router.push("/admin")} className="hidden sm:flex">
                  <Settings className="mr-2 h-4 w-4" />
                  Admin Panel
                </Button>
              )}
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Button
            variant="outline"
            className="h-20 flex-col space-y-2 bg-transparent"
            onClick={() => router.push("/report-issue")}
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm">Report Issue</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex-col space-y-2 bg-transparent"
            onClick={() => router.push("/announcements")}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-sm">Announcements</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex-col space-y-2 bg-transparent"
            onClick={() => router.push("/parking")}
          >
            <Car className="h-5 w-5" />
            <span className="text-sm">Parking</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex-col space-y-2 bg-transparent"
            onClick={() => router.push("/directory")}
          >
            <Users className="h-5 w-5" />
            <span className="text-sm">Directory</span>
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Announcements */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Announcements</h2>
              <Button variant="ghost" size="sm" onClick={() => router.push("/announcements")}>
                View All
              </Button>
            </div>

            <div className="space-y-4">
              {recentAnnouncements.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No recent announcements</p>
                  </CardContent>
                </Card>
              ) : (
                recentAnnouncements.map((announcement) => (
                  <Card key={announcement.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base">{announcement.title}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {announcement.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(announcement.publishDate || announcement.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">{announcement.content}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* My Issues (for homeowners) or Recent Issues (for admins) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{isAdmin ? "Recent Issues" : "My Issues"}</h2>
              <Button variant="ghost" size="sm" onClick={() => router.push(isAdmin ? "/admin/issues" : "/my-issues")}>
                View All
              </Button>
            </div>

            <div className="space-y-4">
              {userIssues.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">{isAdmin ? "No recent issues" : "No issues reported"}</p>
                    {!isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 bg-transparent"
                        onClick={() => router.push("/report-issue")}
                      >
                        Report an Issue
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                userIssues.map((issue) => (
                  <Card key={issue.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base">{issue.title}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={getStatusVariant(issue.status)}
                              className="text-xs flex items-center space-x-1"
                            >
                              {getStatusIcon(issue.status)}
                              <span className="capitalize">{issue.status.replace("_", " ")}</span>
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(issue.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">{issue.description}</p>
                      {issue.location && (
                        <p className="text-xs text-muted-foreground mt-1">Location: {issue.location}</p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
