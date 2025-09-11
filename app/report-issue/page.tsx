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
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, AlertCircle, CheckCircle, Shield, AlertTriangle } from "lucide-react"

const ISSUE_CATEGORIES = [
  "Maintenance",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Landscaping",
  "Noise",
  "Parking",
  "Security",
  "Trash/Recycling",
  "Common Areas",
  "Other",
]

interface CreateIssueData {
  title: string
  description: string
  category: string
  priority: string
  location: string
}

export default function ReportIssuePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<CreateIssueData>({
    title: "",
    description: "",
    category: "",
    priority: "normal",
    location: "",
  })

  const handleChange = (field: keyof CreateIssueData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
      setError("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        setError("You must be logged in to report an issue")
        return
      }

      const { error: insertError } = await supabase.from("issues").insert({
        reporter_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        status: "open",
        location: formData.location?.trim() || null,
      })

      if (insertError) {
        throw insertError
      }

      setIsSubmitted(true)
    } catch (err) {
      console.error("Error submitting issue:", err)
      setError("Failed to submit issue. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="text-center py-8">
            <div className="bg-primary/10 rounded-full p-3 w-fit mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-foreground">Issue Reported Successfully</h2>
            <p className="text-muted-foreground mb-6">
              Your issue has been submitted and will be reviewed by our management team. You'll receive updates on its
              progress.
            </p>
            <div className="space-y-2">
              <Button onClick={() => router.push("/")} className="w-full">
                Back to Home
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSubmitted(false)
                  setFormData({
                    title: "",
                    description: "",
                    category: "",
                    priority: "normal",
                    location: "",
                  })
                }}
                className="w-full"
              >
                Report Another Issue
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
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Report an Issue</h1>
              <p className="text-sm text-muted-foreground">Let us know about any problems or concerns</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card
            className="border-0 shadow-sm bg-card hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setFormData((prev) => ({ ...prev, priority: "urgent" }))}
          >
            <CardHeader className="text-center">
              <div className="bg-destructive/10 rounded-full p-4 w-fit mx-auto mb-2">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Emergency Issue</CardTitle>
              <CardDescription>
                For urgent matters requiring immediate attention (safety hazards, flooding, etc.)
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="border-0 shadow-sm bg-card hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setFormData((prev) => ({ ...prev, priority: "normal" }))}
          >
            <CardHeader className="text-center">
              <div className="bg-primary/10 rounded-full p-4 w-fit mx-auto mb-2">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-primary">General Issue</CardTitle>
              <CardDescription>Non-urgent maintenance and community concerns</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground">Issue Details</CardTitle>
            <CardDescription>
              Please provide as much detail as possible to help us resolve your issue quickly.
            </CardDescription>
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
                <Label htmlFor="title">Issue Title *</Label>
                <Input
                  id="title"
                  placeholder="Brief description of the issue"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  disabled={isSubmitting}
                  className="bg-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleChange("category", value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleChange("priority", value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-input">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Where is the issue located? (e.g., Building A, Unit 123, Pool area)"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  disabled={isSubmitting}
                  className="bg-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide detailed information about the issue, including when it started, how often it occurs, and any other relevant details."
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  disabled={isSubmitting}
                  rows={5}
                  className="bg-input"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/")}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Submitting..." : "Submit Issue"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
