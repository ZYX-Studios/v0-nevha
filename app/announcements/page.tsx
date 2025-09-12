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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      {/* Header */}
      <header className="border-b border-gray-700/30 bg-gray-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <AnimatedSection className="flex items-center justify-between">
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
                <div className="bg-orange-500 rounded-lg p-2">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Community Announcements</h1>
                  <p className="text-sm text-gray-400">Stay informed with the latest updates</p>
                </div>
              </div>
            </div>
            <Button onClick={() => router.push("/report")} variant="outline" className="hidden sm:inline-flex">
              Report a Concern
            </Button>
          </AnimatedSection>
        </div>
      </header>

      <div className="container mx-auto px-3 md:px-4 py-8 md:py-12 max-w-3xl">
        {/* Search */}
        <AnimatedSection className="mb-6 md:mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </AnimatedSection>

        {/* Announcements */}
        <div className="space-y-6">
          {filteredAnnouncements.length === 0 ? (
            <AnimatedSection>
            <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 shadow-2xl">
              <CardContent className="text-center py-12">
                <div className="bg-gray-700/80 rounded-full p-3 w-fit mx-auto mb-4">
                  <Info className="h-6 w-6 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">
                  {searchTerm ? "No matching announcements" : "No announcements available"}
                </h3>
                <p className="text-gray-400">
                  {searchTerm ? "Try adjusting your search terms." : "Check back later for community updates."}
                </p>
              </CardContent>
            </Card>
            </AnimatedSection>
          ) : (
            filteredAnnouncements.map((announcement, idx) => (
              <AnimatedSection key={announcement.id} delay={idx * 0.06}>
              <Card className="overflow-hidden bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 shadow-2xl">
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
                        <div className="flex items-center space-x-1 text-sm text-gray-400">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(announcement.publishDate || announcement.createdAt)}</span>
                        </div>
                      </div>
                      <CardTitle className="text-xl text-white">{announcement.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-300 whitespace-pre-wrap">{announcement.content}</p>
                  </div>
                  {announcement.expiryDate && (
                    <div className="mt-4 pt-4 border-t border-gray-700/30">
                      <p className="text-sm text-gray-400 flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3" />
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
        <AnimatedSection className="mt-10 md:mt-12 text-center">
          <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 shadow-2xl">
            <CardContent className="py-8">
              <h3 className="text-xl font-semibold mb-2 text-white">Want to report a concern?</h3>
              <p className="text-gray-400 mb-4">
                Help us keep the community safe and tidy. Share details so we can act quickly.
              </p>
              <Button onClick={() => router.push("/report")} size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
                Report a Concern
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  )
}
