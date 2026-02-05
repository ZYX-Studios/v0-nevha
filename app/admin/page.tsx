// Admin dashboard with overview and management tools

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import type { Announcement, Issue } from "@/lib/types"
import { Home, Users, MessageSquare, AlertCircle, Car, Plus, ArrowLeft, CheckCircle, Clock, DollarSign } from "lucide-react"

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
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="border-b border-border/40 bg-white/80 backdrop-blur-md sticky top-0 z-10 transition-all duration-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="flex items-center space-x-2 rounded-full hover:bg-secondary/80"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 rounded-xl p-2.5 transition-transform hover:scale-105 duration-200">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Nevha Admin Dashboard</h1>
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
                  try { void logout() } catch { }
                  const dest = "/auth?logout=1"
                  console.log("[admin] Redirecting immediately ->", dest)
                  if (typeof window !== "undefined") {
                    window.location.replace(dest)
                  } else {
                    router.replace(dest)
                  }
                }}
                className="rounded-full border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all duration-200"
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Homeowners", value: stats.totalHomeowners, icon: Users, route: "/admin/homeowners", color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Active Issues", value: stats.activeIssues, icon: AlertCircle, route: "/admin/issues", color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Announcements", value: stats.publishedAnnouncements, icon: MessageSquare, route: "/admin/announcements", color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Car Stickers", value: stats.activeCarStickers, icon: Car, route: "/admin/homeowners", color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Admin Users", value: stats.adminUsers, icon: Users, route: "/admin/users", color: "text-slate-600", bg: "bg-slate-50" },
          ].map((stat, i) => (
            <Card
              key={i}
              className="cursor-pointer hover:shadow-lg transition-all duration-300 rounded-[2rem] border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden group"
              onClick={() => !loading && router.push(stat.route)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${stat.bg} transition-colors group-hover:scale-110 duration-300`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground mb-1">
                    {loading ? "..." : stat.value}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4 px-1">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "New Announcement", icon: Plus, route: "/admin/announcements/new", primary: true },
              { label: "Manage Homeowners", icon: Users, route: "/admin/homeowners" },
              { label: "HOA Dues", icon: DollarSign, route: "/admin/dues" },
              { label: "Manage Departments", icon: Home, route: "/admin/departments" },
              { label: "Manage Issues", icon: AlertCircle, route: "/admin/issues" },
              { label: "Manage Users", icon: Users, route: "/admin/users" },
            ].map((action, i) => (
              <Button
                key={i}
                variant={action.primary ? "default" : "outline"}
                onClick={() => router.push(action.route)}
                className={`h-auto py-6 flex-col space-y-3 rounded-2xl shadow-sm hover:shadow-md transition-all ${action.primary
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-card hover:bg-secondary/50 border-border/50"
                  }`}
              >
                <div className={`p-2 rounded-full ${action.primary ? "bg-white/20" : "bg-secondary"}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Issues */}
          <Card className="rounded-[2rem] border-border/50 shadow-md bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-foreground">Recent Issues</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => router.push("/admin/issues")} className="rounded-full text-primary hover:text-primary hover:bg-primary/10">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground space-y-2">
                    <Clock className="h-8 w-8 animate-pulse opacity-50" />
                    <p>Loading recent issues...</p>
                  </div>
                ) : stats.recentIssues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-secondary/20 rounded-2xl border border-dashed border-border/50">
                    <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                    <p>No recent issues</p>
                  </div>
                ) : (
                  stats.recentIssues.map((issue) => (
                    <div key={issue.id} className="group flex items-start space-x-4 p-4 rounded-2xl bg-secondary/20 hover:bg-secondary/40 border border-transparent hover:border-border/50 transition-all cursor-pointer" onClick={() => router.push(`/admin/issues/${issue.id}`)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-foreground truncate max-w-[70%]">{issue.title}</h4>
                          <span className="text-[10px] text-muted-foreground font-medium bg-background px-2 py-1 rounded-full shadow-sm">
                            {new Date(issue.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{issue.description}</p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={getStatusVariant(issue.status)}
                            className="text-[10px] px-2 py-0.5 rounded-full shadow-none border-0 ring-1 ring-inset ring-black/5"
                          >
                            <span className="flex items-center gap-1">
                              {getStatusIcon(issue.status)}
                              <span className="capitalize">{issue.status.replace("_", " ")}</span>
                            </span>
                          </Badge>
                          <Badge variant={getPriorityVariant(issue.priority)} className="text-[10px] px-2 py-0.5 rounded-full shadow-none">
                            {issue.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Announcements */}
          <Card className="rounded-[2rem] border-border/50 shadow-md bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-foreground">Recent Announcements</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => router.push("/admin/announcements")} className="rounded-full text-primary hover:text-primary hover:bg-primary/10">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground space-y-2">
                    <Clock className="h-8 w-8 animate-pulse opacity-50" />
                    <p>Loading recent announcements...</p>
                  </div>
                ) : stats.recentAnnouncements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-secondary/20 rounded-2xl border border-dashed border-border/50">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                    <p>No recent announcements</p>
                  </div>
                ) : (
                  stats.recentAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="group p-4 rounded-2xl bg-secondary/20 hover:bg-secondary/40 border border-transparent hover:border-border/50 transition-all cursor-pointer" onClick={() => router.push(`/admin/announcements/${announcement.id}/edit`)}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-foreground truncate">{announcement.title}</h4>
                        <Badge variant={getPriorityVariant(announcement.priority)} className="text-[10px] px-2 py-0.5 rounded-full shadow-none">
                          {announcement.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{announcement.content}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-medium bg-background px-2 py-1 rounded-full shadow-sm">
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </span>
                        <Badge variant={announcement.isPublished ? "default" : "outline"} className={`text-[10px] px-2 py-0.5 rounded-full shadow-none ${announcement.isPublished ? "bg-emerald-500 hover:bg-emerald-600 border-0" : "bg-secondary text-muted-foreground"}`}>
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
