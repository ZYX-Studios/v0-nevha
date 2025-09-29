// Edit announcement page

"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import type { Announcement } from "@/lib/types"
import { ArrowLeft, AlertCircle, Calendar, Save, Trash2 } from "lucide-react"

function isoToLocalInput(iso?: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => `${n}`.padStart(2, "0")
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => `${n}`.padStart(2, "0")
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const mi = pad(date.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function formatDate(dateString?: string) {
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

function getPriorityVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
  switch (priority) {
    case "urgent":
      return "destructive"
    case "high":
      return "secondary"
    default:
      return "outline"
  }
}

export default function EditAnnouncementPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const titleMax = 120
  const contentMax = 2000

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    isPublished: false,
    schedulePublish: false,
    publishDate: "",
    expiryDate: "",
  })

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    let aborted = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await fetch(`/api/admin/announcements/${id}`, { cache: "no-store" })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || "Failed to load announcement")
        const item = json.item as Announcement
        if (!aborted) {
          const isFutureSchedule = item.publishDate ? new Date(item.publishDate) > new Date() : false
          setFormData({
            title: item.title,
            content: item.content,
            priority: item.priority,
            isPublished: item.isPublished,
            schedulePublish: isFutureSchedule,
            publishDate: isoToLocalInput(item.publishDate),
            expiryDate: isoToLocalInput(item.expiryDate),
          })
        }
      } catch (e: any) {
        if (!aborted) setLoadError(e?.message || "Failed to load announcement")
      } finally {
        if (!aborted) setLoading(false)
      }
    }
    if (id) load()
    return () => {
      aborted = true
    }
  }, [id])

  const isValid = useMemo(() => {
    if (!formData.title.trim() || !formData.content.trim()) return false
    if (formData.schedulePublish && !formData.publishDate) return false
    if (formData.expiryDate && formData.publishDate) {
      const pd = new Date(formData.publishDate)
      const ed = new Date(formData.expiryDate)
      if (ed <= pd) return false
    }
    return true
  }, [formData])

  const setExpiryInDays = (days: number) => {
    const base = formData.schedulePublish && formData.publishDate ? new Date(formData.publishDate) : new Date()
    const d = new Date(base)
    d.setDate(d.getDate() + days)
    handleChange("expiryDate", toLocalInputValue(d))
  }

  const handleSave: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setError(null)
    if (!isValid) {
      setError("Please fix the validation errors before saving.")
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
        isPublished: formData.schedulePublish ? false : formData.isPublished,
        publishDate: formData.schedulePublish ? formData.publishDate : null,
        expiryDate: formData.expiryDate ? formData.expiryDate : null,
      }

      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to save announcement")
      // Optionally refresh form with normalized values
      const item = json.item as Announcement
      setFormData((prev) => ({
        ...prev,
        isPublished: item.isPublished,
        publishDate: isoToLocalInput(item.publishDate),
        expiryDate: isoToLocalInput(item.expiryDate),
      }))
    } catch (e: any) {
      setError(e?.message || "Failed to save announcement")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Delete this announcement? This cannot be undone.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to delete announcement")
      router.push("/admin/announcements")
    } catch (e: any) {
      setError(e?.message || "Failed to delete announcement")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/announcements")} className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-lg font-bold">Edit Announcement</h1>
                <p className="text-sm text-muted-foreground">Loading…</p>
              </div>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading announcement…</CardContent></Card>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/announcements")} className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-lg font-bold">Edit Announcement</h1>
                <p className="text-sm text-muted-foreground">{loadError}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4 justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/announcements")} className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-lg font-bold">Edit Announcement</h1>
                <p className="text-sm text-muted-foreground">Update details and publishing options</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                <Trash2 className="mr-2 h-4 w-4" /> {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Announcement Details</CardTitle>
            <CardDescription>Make your changes below and click Save.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
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
                  disabled={saving}
                  maxLength={titleMax}
                />
                <div className="text-xs text-muted-foreground text-right">{formData.title.length} / {titleMax}</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => handleChange("priority", value)} disabled={saving}>
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
                  disabled={saving}
                  rows={6}
                  maxLength={contentMax}
                />
                <div className="text-xs text-muted-foreground text-right">{formData.content.length} / {contentMax}</div>
              </div>

              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium">Publishing Options</h3>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPublished"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) => handleChange("isPublished", checked as boolean)}
                    disabled={saving || formData.schedulePublish}
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
                      if (checked) handleChange("isPublished", false)
                    }}
                    disabled={saving}
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
                      disabled={saving}
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
                    disabled={saving}
                    min={formData.publishDate || toLocalInputValue(new Date())}
                  />
                  <p className="text-xs text-muted-foreground">The announcement will automatically be hidden after this date</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => setExpiryInDays(7)}>+7 days</Button>
                    <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => setExpiryInDays(14)}>+14 days</Button>
                    <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => setExpiryInDays(30)}>+30 days</Button>
                    <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => handleChange("expiryDate", "")}>Clear</Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 flex-wrap">
                <Button type="button" variant="outline" onClick={() => router.push("/admin/announcements")} disabled={saving || deleting} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={!isValid || saving} className="flex-1">
                  <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>How this will appear on the public announcements page</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={getPriorityVariant(formData.priority)} className="capitalize">{formData.priority}</Badge>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formData.schedulePublish && formData.publishDate ? formatDate(formData.publishDate) : "Publishes immediately"}
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
