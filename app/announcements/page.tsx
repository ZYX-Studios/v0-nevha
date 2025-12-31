// Public announcements page (accessible without login)

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { Announcement } from "@/lib/types"
import { Home, ArrowLeft, Search, Calendar, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { AnimatedSection } from "@/components/ui/animated-section"

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([])
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/announcements", { cache: "no-store" })
        const json = await res.json()
        const items = (json?.items || []) as Announcement[]
        setAnnouncements(items)
      } catch (e) {
        setAnnouncements([])
      }
    }
    load()
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
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="px-4 py-4 bg-white/80 backdrop-blur-md border-b border-border/40 sticky top-0 z-10">
        <div className="container mx-auto max-w-3xl flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="flex items-center space-x-2 rounded-full text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="bg-primary/10 rounded-xl p-2.5">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Community Announcements</h1>
                <p className="text-sm text-muted-foreground">Stay informed with the latest updates</p>
              </div>
            </div>
          </div>
          <Button onClick={() => router.push("/report")} variant="outline" className="hidden sm:inline-flex rounded-full border-primary/20 text-primary hover:bg-primary/5">
            Report a Concern
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Search */}
        <AnimatedSection className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-12 bg-secondary/30 border-transparent focus:border-primary/30 focus:bg-white transition-all rounded-full shadow-sm"
            />
          </div>
        </AnimatedSection>

        {/* Announcements */}
        <div className="space-y-6">
          {filteredAnnouncements.length === 0 ? (
            <AnimatedSection>
              <Card className="bg-card border-border/50 shadow-md rounded-[2rem]">
                <CardContent className="text-center py-16">
                  <div className="bg-secondary/50 rounded-full p-4 w-fit mx-auto mb-4">
                    <Info className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">
                    {searchTerm ? "No matching announcements" : "No announcements available"}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "Try adjusting your search terms." : "Check back later for community updates."}
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>
          ) : (
            filteredAnnouncements.map((announcement, idx) => (
              <AnimatedSection key={announcement.id} delay={idx * 0.06}>
                <Card className="overflow-hidden bg-card border-border/50 shadow-md hover:shadow-lg transition-all duration-300 rounded-[2rem]">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center space-x-3">
                          <Badge
                            variant={getPriorityVariant(announcement.priority)}
                            className="flex items-center space-x-1.5 px-3 py-1 rounded-full"
                          >
                            {getPriorityIcon(announcement.priority)}
                            <span className="capitalize font-semibold">{announcement.priority}</span>
                          </Badge>
                          <div className="flex items-center space-x-1.5 text-xs font-medium text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(announcement.publishDate || announcement.createdAt)}</span>
                          </div>
                        </div>
                        <CardTitle className="text-2xl font-bold text-foreground leading-tight px-1">{announcement.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-muted-foreground bg-secondary/20 p-6 rounded-2xl">
                      <p className="whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
                    </div>
                    {announcement.expiryDate && (
                      <div className="mt-4 pt-2 px-2">
                        <p className="text-xs font-medium text-destructive/70 flex items-center space-x-1.5 bg-destructive/5 px-3 py-2 rounded-lg w-fit">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>Expires: {formatDate(announcement.expiryDate)}</span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))
          )}
        </div>

        {/* Call to Action */}
        <AnimatedSection className="mt-12 text-center">
          <Card className="bg-gradient-to-br from-primary/5 to-secondary/30 border-primary/10 shadow-lg rounded-[2.5rem]">
            <CardContent className="py-12 px-6">
              <h3 className="text-2xl font-bold mb-3 text-foreground">Want to report a concern?</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Help us keep the community safe and tidy. Share details so we can act quickly.
              </p>
              <Button onClick={() => router.push("/report")} size="lg" className="rounded-full px-8 py-6 text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                Report a Concern
                <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
              </Button>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  )
}
