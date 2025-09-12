"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, AlertCircle, CheckCircle, User, Phone, Mail, MapPin } from "lucide-react"

const ISSUE_CATEGORIES = [
  "Maintenance",
  "Peace and Order",
  "Sports",
  "Social Media",
  "Grievance",
  "Finance",
  "Membership",
  "Livelihood",
]

type FormState = {
  // Core required fields
  description: string
  category: string
  // Optional derived
  title?: string
  // Public reporter fields
  reporter_full_name: string
  reporter_phone: string
  reporter_email: string
  reporter_block: string
  reporter_lot: string
  reporter_phase: string
  reporter_street: string
  suggested_solution: string
  // Submission flags
  acknowledged: boolean
  // Priority kept but hidden in UI (default P3)
  priority: "P1" | "P2" | "P3" | "P4"
}

type PendingReport = FormState & { queuedAt: number }

export default function ReportPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successRef, setSuccessRef] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    description: "",
    category: "",
    reporter_full_name: "",
    reporter_phone: "",
    reporter_email: "",
    reporter_block: "",
    reporter_lot: "",
    reporter_phase: "",
    reporter_street: "",
    suggested_solution: "",
    acknowledged: false,
    priority: "P3",
  })

  // Minimal offline queue using localStorage
  useEffect(() => {
    async function flushQueue() {
      if (typeof window === "undefined") return
      const key = "hoa-report-queue"
      const raw = localStorage.getItem(key)
      if (!raw) return
      let queue: PendingReport[] = []
      try {
        queue = JSON.parse(raw) as PendingReport[]
      } catch {
        localStorage.removeItem(key)
        return
      }
      if (!navigator.onLine || queue.length === 0) return

      const remaining: PendingReport[] = []
      for (const item of queue) {
        try {
          const res = await fetch("/api/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          })
          if (!res.ok) {
            remaining.push(item)
          }
        } catch {
          remaining.push(item)
        }
      }
      if (remaining.length > 0) localStorage.setItem(key, JSON.stringify(remaining))
      else localStorage.removeItem(key)
    }

    function onlineHandler() {
      flushQueue()
    }

    window.addEventListener("online", onlineHandler)
    flushQueue()
    return () => window.removeEventListener("online", onlineHandler)
  }, [])

  const update = (field: keyof FormState, value: string | boolean) => setForm((p) => ({ ...p, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!form.description.trim() || !form.category) {
      setError("Please fill in all required fields")
      return
    }
    if (!form.acknowledged) {
      setError("Please acknowledge the notice before submitting.")
      return
    }

    setIsSubmitting(true)
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        // queue for later
        const key = "hoa-report-queue"
        const raw = localStorage.getItem(key)
        const queue: PendingReport[] = raw ? JSON.parse(raw) : []
        queue.push({ ...form, queuedAt: Date.now() })
        localStorage.setItem(key, JSON.stringify(queue))
        setSuccessRef("PENDING-OFFLINE")
        return
      }

      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit report")
      }
      setSuccessRef(data.ref_code as string)
    } catch (err: any) {
      setError(err?.message || "Failed to submit report")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (successRef) {
    const isPending = successRef === "PENDING-OFFLINE"
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl animate-scale-in bg-gray-900/95 backdrop-blur-xl border border-gray-700/30">
          <CardContent className="text-center py-8">
            <div className="bg-green-500/20 rounded-full p-3 w-fit mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-white">
              {isPending ? "Report Queued for Upload" : "Report Submitted Successfully"}
            </h2>
            <p className="text-gray-400 mb-6">
              {isPending
                ? "You were offline. We queued your report and will upload it once you go online."
                : "Your report has been submitted. Use the reference code below to check status."}
            </p>
            {!isPending && (
              <div className="mb-6">
                <div className="font-mono text-lg font-semibold text-white">{successRef}</div>
                <div className="mt-2 flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(successRef)}
                    className="px-3 border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Copy Code
                  </Button>
                  <Button onClick={() => router.push(`/status/${encodeURIComponent(successRef)}`)} className="px-3 bg-orange-500 hover:bg-orange-600 text-white">
                    View Status
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Button onClick={() => router.push("/")} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                Back to Home
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccessRef(null)
                  setForm({
                    description: "",
                    category: "",
                    reporter_full_name: "",
                    reporter_phone: "",
                    reporter_email: "",
                    reporter_block: "",
                    reporter_lot: "",
                    reporter_phase: "",
                    reporter_street: "",
                    suggested_solution: "",
                    acknowledged: false,
                    priority: "P3",
                  })
                }}
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
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
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      <div className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_50%_at_50%_10%,#000_40%,transparent_100%)]">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl"></div>
      </div>
      <header className="border-b border-gray-700/30 bg-gray-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="text-gray-300 hover:text-white hover:bg-gray-800"> 
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-2">Back</span>
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white">Report a Concern</h1>
              <p className="text-sm text-gray-400">Share details to help us resolve it quickly</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 max-w-2xl">
        <div className="rounded-2xl p-[1.5px] bg-gradient-to-b from-orange-500/30 via-orange-500/10 to-transparent">
        <Card className="rounded-2xl border border-gray-700/30 shadow-2xl bg-gray-900/95 supports-[backdrop-filter]:backdrop-blur-xl animate-fade-in-up">
          <CardHeader className="pb-0 sm:pb-2 animate-fade-in-up">
            <CardTitle className="text-white">Issue Details</CardTitle>
            <CardDescription className="text-gray-400">
              Please provide as much detail as possible. You don't need to sign in to submit.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 animate-fade-in-up">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="pt-1 animate-fade-in-up">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Your Details</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reporter_full_name" className="text-gray-300">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="reporter_full_name"
                    placeholder="Full Name"
                    value={form.reporter_full_name}
                    onChange={(e) => update("reporter_full_name", e.target.value)}
                    disabled={isSubmitting}
                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reporter_phone" className="text-gray-300">Contact Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="reporter_phone"
                    placeholder="Contact Number"
                    value={form.reporter_phone}
                    onChange={(e) => update("reporter_phone", e.target.value)}
                    disabled={isSubmitting}
                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 pl-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up">
                <div className="space-y-2">
                  <Label htmlFor="reporter_block" className="text-gray-300">Block</Label>
                  <Input
                    id="reporter_block"
                    placeholder="Block"
                    value={form.reporter_block}
                    onChange={(e) => update("reporter_block", e.target.value)}
                    disabled={isSubmitting}
                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporter_lot" className="text-gray-300">Lot</Label>
                  <Input
                    id="reporter_lot"
                    placeholder="Lot Number"
                    value={form.reporter_lot}
                    onChange={(e) => update("reporter_lot", e.target.value)}
                    disabled={isSubmitting}
                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporter_phase" className="text-gray-300">Phase</Label>
                  <Input
                    id="reporter_phase"
                    placeholder="Phase"
                    value={form.reporter_phase}
                    onChange={(e) => update("reporter_phase", e.target.value)}
                    disabled={isSubmitting}
                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
                <div className="space-y-2">
                  <Label htmlFor="reporter_street" className="text-gray-300">Street</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="reporter_street"
                      placeholder="Street"
                      value={form.reporter_street}
                      onChange={(e) => update("reporter_street", e.target.value)}
                      disabled={isSubmitting}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporter_email" className="text-gray-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="reporter_email"
                      type="email"
                      placeholder="Email"
                      value={form.reporter_email}
                      onChange={(e) => update("reporter_email", e.target.value)}
                      disabled={isSubmitting}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 animate-fade-in-up">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Concern Details</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-gray-300">Issue Related To *</Label>
                  <Select value={form.category} onValueChange={(v) => update("category", v)} disabled={isSubmitting}>
                    <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Priority hidden in UI; default P3 kept for backend triage */}
              </div>

              {/* Location fields represented above as block/lot/phase/street */}

              <div className="space-y-2 animate-fade-in-up">
                <Label htmlFor="description" className="text-gray-300">Describe Your Concern *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide details (when it started, frequency, any context)."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  disabled={isSubmitting}
                  rows={5}
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2 animate-fade-in-up">
                <Label htmlFor="suggested_solution" className="text-gray-300">Do you have any solution to suggest?</Label>
                <Textarea
                  id="suggested_solution"
                  placeholder="Your suggestion"
                  value={form.suggested_solution}
                  onChange={(e) => update("suggested_solution", e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="flex items-start gap-3 rounded-md border border-gray-600 p-3 bg-gray-800/20 animate-fade-in-up">
                <Checkbox
                  id="acknowledged"
                  checked={form.acknowledged}
                  onCheckedChange={(v) => update("acknowledged", Boolean(v))}
                  disabled={isSubmitting}
                />
                <Label htmlFor="acknowledged" className="text-sm text-gray-400 leading-relaxed">
                  I understand that this is not an Emergency hotline and I shouldn’t expect immediate response. The
                  concern I am raising is to further improve the community of Northfields.
                </Label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up">
                <Button type="button" variant="outline" onClick={() => router.push("/")} disabled={isSubmitting} className="w-full sm:flex-1 border-gray-600 text-gray-300 hover:bg-gray-800">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="w-full sm:flex-1 shadow-md hover:shadow-lg bg-orange-500 hover:bg-orange-600 text-white">
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
