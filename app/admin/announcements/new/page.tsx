// Create new announcement page

"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/hooks/use-auth"
import type { CreateAnnouncementData } from "@/lib/types"
import { mockAnnouncements } from "@/lib/mock-data"
import { ArrowLeft, AlertCircle, CheckCircle } from "lucide-react"

function CreateAnnouncementContent() {
  const { session } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<
    CreateAnnouncementData & {
      isPublished: boolean
      schedulePublish: boolean
    }
  >({
    title: "",
    content: "",
    priority: "normal",
    publishDate: "",
    expiryDate: "",
    isPublished: false,
    schedulePublish: false,
  })

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!formData.title.trim() || !formData.content.trim()) {
      setError("Please fill in all required fields")
      return
    }

    if (formData.schedulePublish && !formData.publishDate) {
      setError("Please select a publish date when scheduling")
      return
    }

    if (formData.expiryDate && formData.publishDate) {
      const publishDate = new Date(formData.publishDate)
      const expiryDate = new Date(formData.expiryDate)
      if (expiryDate <= publishDate) {
        setError("Expiry date must be after publish date")
        return
      }
    }

    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Create new announcement
      const newAnnouncement = {
        id: Math.random().toString(36).substr(2, 9),
        title: formData.title.trim(),
        content: formData.content.trim(),
        authorId: session.user?.id,
        priority: formData.priority,
        isPublished: formData.isPublished && !formData.schedulePublish,
        publishDate: formData.schedulePublish
          ? formData.publishDate
          : formData.isPublished
            ? new Date().toISOString()
            : undefined,
        expiryDate: formData.expiryDate || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Add to mock data (in real app, this would be handled by the API)
      mockAnnouncements.unshift(newAnnouncement)

      setIsSubmitted(true)
    } catch (err) {
      setError("Failed to create announcement. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="bg-green-100 rounded-full p-3 w-fit mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Announcement Created</h2>
            <p className="text-muted-foreground mb-6">
              Your announcement has been {formData.isPublished ? "published" : "saved as draft"} successfully.
            </p>
            <div className="space-y-2">
              <Button onClick={() => router.push("/admin/announcements")} className="w-full">
                Back to Announcements
              </Button>
              <Button variant="outline" onClick={() => router.push("/admin/announcements/new")} className="w-full">
                Create Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/announcements")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-lg font-bold">Create Announcement</h1>
              <p className="text-sm text-muted-foreground">Share important information with the community</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Announcement Details</CardTitle>
            <CardDescription>Create a new announcement to share with homeowners.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Announcement title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => handleChange("priority", value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Write your announcement content here..."
                  value={formData.content}
                  onChange={(e) => handleChange("content", e.target.value)}
                  disabled={isSubmitting}
                  rows={6}
                />
              </div>

              {/* Publishing Options */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium">Publishing Options</h3>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPublished"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) => handleChange("isPublished", checked as boolean)}
                    disabled={isSubmitting || formData.schedulePublish}
                  />
                  <Label htmlFor="isPublished">Publish immediately</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="schedulePublish"
                    checked={formData.schedulePublish}
                    onCheckedChange={(checked) => {
                      handleChange("schedulePublish", checked as boolean)
                      if (checked) {
                        handleChange("isPublished", false)
                      }
                    }}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="schedulePublish">Schedule for later</Label>
                </div>

                {formData.schedulePublish && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="publishDate">Publish Date & Time</Label>
                    <Input
                      id="publishDate"
                      type="datetime-local"
                      value={formData.publishDate}
                      onChange={(e) => handleChange("publishDate", e.target.value)}
                      disabled={isSubmitting}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                  <Input
                    id="expiryDate"
                    type="datetime-local"
                    value={formData.expiryDate}
                    onChange={(e) => handleChange("expiryDate", e.target.value)}
                    disabled={isSubmitting}
                    min={formData.publishDate || new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The announcement will automatically be hidden after this date
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/announcements")}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Creating..." : "Create Announcement"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function CreateAnnouncementPage() {
  return (
    <ProtectedRoute requiredRole="staff">
      <CreateAnnouncementContent />
    </ProtectedRoute>
  )
}
