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
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import type { CreateAnnouncementData } from "@/lib/types"
import { ArrowLeft, AlertCircle, CheckCircle, Calendar } from "lucide-react"

function CreateAnnouncementContent() {
  const { session } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")
  const titleMax = 120
  const contentMax = 2000

  const initialForm: CreateAnnouncementData & { isPublished: boolean; schedulePublish: boolean } = {
    title: "",
    content: "",
    priority: "normal",
    publishDate: "",
    expiryDate: "",
    isPublished: false,
    schedulePublish: false,
  }

  const [formData, setFormData] = useState<
    CreateAnnouncementData & {
      isPublished: boolean
      schedulePublish: boolean
    }
  >(initialForm)

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
      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
        // If scheduling, mark published with a future publishDate
        isPublished: formData.schedulePublish ? true : formData.isPublished,
        publishDate: formData.schedulePublish ? formData.publishDate : undefined,
        expiryDate: formData.expiryDate || undefined,
      }

      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || "Failed to create announcement")
      }

      setIsSubmitted(true)
    } catch (err: any) {
      setError(err?.message || "Failed to create announcement. Please try again.")
    } finally {
      setIsSubmitting(false)
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return ""
    const d = new Date(dateString)
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const toLocalInputValue = (date: Date) => {
    const pad = (n: number) => `${n}`.padStart(2, "0")
    const yyyy = date.getFullYear()
    const mm = pad(date.getMonth() + 1)
    const dd = pad(date.getDate())
    const hh = pad(date.getHours())
    const mi = pad(date.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }

  const setExpiryInDays = (days: number) => {
    const base = formData.schedulePublish && formData.publishDate ? new Date(formData.publishDate) : new Date()
    const d = new Date(base)
    d.setDate(d.getDate() + days)
    handleChange("expiryDate", toLocalInputValue(d))
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
                  maxLength={titleMax}
                />
                <div className="text-xs text-muted-foreground text-right">{formData.title.length} / {titleMax}</div>
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
                <p className="text-xs text-muted-foreground">Urgent items appear highlighted on the public page.</p>
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
                  maxLength={contentMax}
                />
                <div className="text-xs text-muted-foreground text-right">{formData.content.length} / {contentMax}</div>
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
                    className="h-5 w-5 border-2 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />
                  <Label htmlFor="isPublished" className="font-medium">Publish immediately</Label>
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
                    className="h-5 w-5 border-2 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />
                  <Label htmlFor="schedulePublish" className="font-medium">Schedule for later</Label>
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
                      min={toLocalInputValue(new Date())}
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
                    min={formData.publishDate || toLocalInputValue(new Date())}
                  />
                  <p className="text-xs text-muted-foreground">
                    The announcement will automatically be hidden after this date
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" variant="secondary" size="sm" disabled={isSubmitting} onClick={() => setExpiryInDays(7)}>
                      +7 days
                    </Button>
                    <Button type="button" variant="secondary" size="sm" disabled={isSubmitting} onClick={() => setExpiryInDays(14)}>
                      +14 days
                    </Button>
                    <Button type="button" variant="secondary" size="sm" disabled={isSubmitting} onClick={() => setExpiryInDays(30)}>
                      +30 days
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={() => handleChange("expiryDate", "")}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/announcements")}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setFormData(initialForm)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Reset
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Creating..." : "Create Announcement"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>How this will appear on the public announcements page</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={getPriorityVariant(formData.priority)} className="capitalize">
                    {formData.priority}
                  </Badge>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formData.schedulePublish && formData.publishDate
                        ? formatDate(formData.publishDate)
                        : "Publishes immediately"}
                    </span>
                    {formData.expiryDate && <span> • Expires: {formatDate(formData.expiryDate)}</span>}
                  </div>
                </div>
                <h3 className="text-xl font-semibold">{formData.title || "Untitled announcement"}</h3>
              </div>
            </div>
            <div className="mt-2 text-muted-foreground whitespace-pre-wrap">
              {formData.content || "Content preview will appear here as you type."}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function CreateAnnouncementPage() {
  return <CreateAnnouncementContent />
}
