// Public announcements page (accessible without login)

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { mockAnnouncements } from "@/lib/mock-data"
import type { Announcement } from "@/lib/types"
import { Home, ArrowLeft, Search, Calendar, AlertCircle, Info, AlertTriangle } from "lucide-react"

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([])
  const router = useRouter()

  useEffect(() => {
    // Filter only published announcements that haven't expired
    const now = new Date()
    const published = mockAnnouncements.filter((announcement) => {
      const isPublished = announcement.isPublished
      const isNotExpired = !announcement.expiryDate || new Date(announcement.expiryDate) > now
      const isPublishDateReached = !announcement.publishDate || new Date(announcement.publishDate) <= now

      return isPublished && isNotExpired && isPublishDateReached
    })

    // Sort by publish date (newest first)
    published.sort((a, b) => {
      const dateA = new Date(a.publishDate || a.createdAt)
      const dateB = new Date(b.publishDate || b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })

    setAnnouncements(published)
  }, [])

  useEffect(() => {
    // Filter announcements based on search term
    if (!searchTerm.trim()) {
      setFilteredAnnouncements(announcements)
    } else {
      const filtered = announcements.filter(
        (announcement) =>
          announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          announcement.content.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredAnnouncements(filtered)
    }
  }, [announcements, searchTerm])

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertCircle className="h-4 w-4" />
      case "high":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
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
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div className="flex items-center space-x-2">
                <div className="bg-primary rounded-lg p-2">
                  <Home className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Community Announcements</h1>
                  <p className="text-sm text-muted-foreground">Stay informed with the latest updates</p>
                </div>
              </div>
            </div>
            <Button onClick={() => router.push("/auth")} variant="outline">
              Resident Login
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Search */}
        <div className="mb-8">
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

        {/* Announcements */}
        <div className="space-y-6">
          {filteredAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="bg-muted rounded-full p-3 w-fit mx-auto mb-4">
                  <Info className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? "No matching announcements" : "No announcements available"}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm ? "Try adjusting your search terms." : "Check back later for community updates."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={getPriorityVariant(announcement.priority)}
                          className="flex items-center space-x-1"
                        >
                          {getPriorityIcon(announcement.priority)}
                          <span className="capitalize">{announcement.priority}</span>
                        </Badge>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(announcement.publishDate || announcement.createdAt)}</span>
                        </div>
                      </div>
                      <CardTitle className="text-xl">{announcement.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
                  </div>
                  {announcement.expiryDate && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>Expires: {formatDate(announcement.expiryDate)}</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <Card>
            <CardContent className="py-8">
              <h3 className="text-xl font-semibold mb-2">Want to stay more connected?</h3>
              <p className="text-muted-foreground mb-4">
                Sign in to access your personal dashboard, report issues, and manage your account.
              </p>
              <Button onClick={() => router.push("/auth")} size="lg">
                Resident Login
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
