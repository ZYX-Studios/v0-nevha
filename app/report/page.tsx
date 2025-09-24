"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, AlertCircle, CheckCircle, User, Phone, Mail, MapPin } from "lucide-react"
import { BottomNav } from "@/components/ui/bottom-nav"

// Categories now come from live departments via /api/departments; we append an "Others" option client-side

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

type PendingReport = (FormState & { verified_resident_token?: string }) & { queuedAt: number }

export default function ReportPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successRef, setSuccessRef] = useState<string | null>(null)
  const [deptOptions, setDeptOptions] = useState<string[]>([])
  // Resident verification state
  const [selectedResidentToken, setSelectedResidentToken] = useState<string | null>(null)
  const [nameSuggestions, setNameSuggestions] = useState<{ name: string; token: string }[]>([])
  const [isSearchingName, setIsSearchingName] = useState(false)
  const nameSearchAbortRef = useRef<AbortController | null>(null)
  const [verifyError, setVerifyError] = useState(false)
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
        // Skip legacy items without verification token to avoid stuck queue
        if (!item.verified_resident_token) continue
        try {
          const res = await fetch("/api/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          })
          if (!res.ok) {
            // If forbidden due to verification, drop the item permanently
            if (res.status === 403) continue
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

  // Load active departments for the "Issue Related To" options
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/departments", { cache: "no-store" })
        const json = await res.json().catch(() => ({}))
        if (!mounted) return
        if (res.ok && Array.isArray(json.items)) {
          const names = json.items.map((i: any) => String(i.name || "")).filter(Boolean)
          setDeptOptions(names)
        } else {
          setDeptOptions([])
        }
      } catch {
        setDeptOptions([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Debounced resident name suggestions (subtle verification)
  useEffect(() => {
    const q = form.reporter_full_name.trim()
    // Clear suggestions when verified or query is short
    if (selectedResidentToken || q.length < 3) {
      if (nameSuggestions.length) setNameSuggestions([])
      return
    }

    setIsSearchingName(true)
    const handle = setTimeout(async () => {
      try {
        // Abort prior request
        if (nameSearchAbortRef.current) {
          nameSearchAbortRef.current.abort()
        }
        const ctrl = new AbortController()
        nameSearchAbortRef.current = ctrl
        const res = await fetch(`/api/residents/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal, cache: "no-store" })
        const json = await res.json().catch(() => ({ items: [] }))
        if (Array.isArray(json.items)) {
          setNameSuggestions(json.items as { name: string; token: string }[])
        } else {
          setNameSuggestions([])
        }
      } catch {
        setNameSuggestions([])
      } finally {
        setIsSearchingName(false)
      }
    }, 300)

    return () => clearTimeout(handle)
  }, [form.reporter_full_name, selectedResidentToken])

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

    // Require verified resident selection
    if (!selectedResidentToken) {
      setVerifyError(true)
      setError("Please select your name from the suggestions to verify residency before submitting.")
      return
    }

    setIsSubmitting(true)
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        // queue for later
        const key = "hoa-report-queue"
        const raw = localStorage.getItem(key)
        const queue: PendingReport[] = raw ? JSON.parse(raw) : []
        queue.push({ ...form, verified_resident_token: selectedResidentToken, queuedAt: Date.now() })
        localStorage.setItem(key, JSON.stringify(queue))
        setSuccessRef("PENDING-OFFLINE")
        return
      }

      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, verified_resident_token: selectedResidentToken }),
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4 font-inter">
        <Card className="w-full max-w-md border-0 shadow-md bg-white overflow-hidden border border-gray-100">
          <CardContent className="text-center py-8">
            <div className="bg-green-100 rounded-full p-3 w-fit mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">
              {isPending ? "Report Queued for Upload" : "Report Submitted Successfully"}
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              {isPending
                ? "You were offline. We queued your report and will upload it once you go online."
                : "Your report has been submitted. Use the reference code below to check status."}
            </p>
            {!isPending && (
              <div className="mb-6">
                <div className="font-mono text-lg font-semibold text-gray-900 bg-gray-50 p-3 rounded-lg border">{successRef}</div>
                <div className="mt-3 flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(successRef)}
                    className="px-3 border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    Copy Code
                  </Button>
                  <Button onClick={() => router.push(`/status/${encodeURIComponent(successRef)}`)} className="px-3 bg-blue-600 hover:bg-blue-700 text-white">
                    View Status
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <Button onClick={() => router.push("/")} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
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
                  setSelectedResidentToken(null)
                  setNameSuggestions([])
                }}
                className="w-full border-gray-200 text-gray-600 hover:bg-gray-50"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 font-inter">
      {/* Safe Area Top */}
      <div className="h-safe-area-inset-top bg-transparent" />
      
      {/* Header */}
      <header className="px-4 py-4 bg-white/95 backdrop-blur-xl border-b border-blue-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src="/NEVHA logo.svg"
              alt="NEVHA Logo"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900">NEVHA</h1>
              <p className="text-xs text-blue-600 font-medium">Northfields Executive Village</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => router.push("/status")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2"
          >
            Check Status
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-4">
        {/* Page Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Report a Concern</h2>
              <p className="text-sm text-gray-600">Share details to help us resolve it quickly</p>
            </div>
          </div>
        </div>

        <Card className="rounded-xl border-0 shadow-md bg-white overflow-hidden border border-gray-100 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-gray-900 text-base">Issue Details</CardTitle>
            <CardDescription className="text-gray-600 text-sm">
              Please provide as much detail as possible. You don't need to sign in to submit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              <div className="pt-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Your Details</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reporter_full_name" className="text-gray-700 text-sm">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="reporter_full_name"
                    placeholder="Full Name"
                    value={form.reporter_full_name}
                    onChange={(e) => {
                      update("reporter_full_name", e.target.value)
                      // If user edits the field, clear previous verification
                      if (selectedResidentToken) setSelectedResidentToken(null)
                      if (verifyError) setVerifyError(false)
                    }}
                    disabled={isSubmitting}
                    className={`bg-white text-gray-900 placeholder:text-gray-400 pl-9 focus:ring-2 ${selectedResidentToken ? "pr-9" : ""} ${verifyError ? "border-red-300 focus:border-red-400 focus:ring-red-200" : "border-gray-200 focus:border-blue-300 focus:ring-blue-200"}`}
                  />
                  {selectedResidentToken && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                  )}
                </div>
                {!selectedResidentToken && (
                  <div className="mt-2 text-[11px] sm:text-xs border border-yellow-200 bg-yellow-50 text-yellow-800 rounded px-3 py-2">
                    Only registered homeowners can submit. Start typing your full name and select from the list to verify.
                  </div>
                )}
                {verifyError && (
                  <p className="mt-1 text-xs text-red-600">Please select your name from the suggestions to verify before submitting.</p>
                )}
                {/* Subtle suggestions list appears only while typing and not yet verified */}
                {!selectedResidentToken && (nameSuggestions.length > 0 || isSearchingName) && (
                  <div className="mt-2 border border-gray-200 rounded-md bg-white shadow-sm">
                    {isSearchingName && (
                      <div className="px-3 py-2 text-xs text-gray-500">Searching…</div>
                    )}
                    {nameSuggestions.map((s) => (
                      <button
                        type="button"
                        key={s.token}
                        onClick={() => {
                          setSelectedResidentToken(s.token)
                          update("reporter_full_name", s.name)
                          setNameSuggestions([])
                          if (verifyError) setVerifyError(false)
                        }}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
                {/* Verified state is indicated by the check icon inside the input */}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reporter_phone" className="text-gray-700 text-sm">Contact Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="reporter_phone"
                    placeholder="Contact Number"
                    value={form.reporter_phone}
                    onChange={(e) => update("reporter_phone", e.target.value)}
                    disabled={isSubmitting}
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pl-9 focus:border-blue-300 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="reporter_block" className="text-gray-700 text-sm">Block</Label>
                  <Input
                    id="reporter_block"
                    placeholder="Block"
                    value={form.reporter_block}
                    onChange={(e) => update("reporter_block", e.target.value)}
                    disabled={isSubmitting}
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:ring-blue-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporter_lot" className="text-gray-700 text-sm">Lot</Label>
                  <Input
                    id="reporter_lot"
                    placeholder="Lot"
                    value={form.reporter_lot}
                    onChange={(e) => update("reporter_lot", e.target.value)}
                    disabled={isSubmitting}
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:ring-blue-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporter_phase" className="text-gray-700 text-sm">Phase</Label>
                  <Input
                    id="reporter_phase"
                    placeholder="Phase"
                    value={form.reporter_phase}
                    onChange={(e) => update("reporter_phase", e.target.value)}
                    disabled={isSubmitting}
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:ring-blue-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporter_street" className="text-gray-700 text-sm">Street</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="reporter_street"
                      placeholder="Street"
                      value={form.reporter_street}
                      onChange={(e) => update("reporter_street", e.target.value)}
                      disabled={isSubmitting}
                      className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pl-9 focus:border-blue-300 focus:ring-blue-200"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reporter_email" className="text-gray-700 text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="reporter_email"
                    type="email"
                    placeholder="Email"
                    value={form.reporter_email}
                    onChange={(e) => update("reporter_email", e.target.value)}
                    disabled={isSubmitting}
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pl-9 focus:border-blue-300 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Concern Details</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-gray-700 text-sm">Issue Related To *</Label>
                <Select value={form.category} onValueChange={(v) => update("category", v)} disabled={isSubmitting}>
                  <SelectTrigger className="bg-white border-gray-200 text-gray-900 focus:border-blue-300 focus:ring-blue-200">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {deptOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                    <SelectItem key="Others" value="Others">
                      Others
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-700 text-sm">Describe Your Concern *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide details (when it started, frequency, any context)."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  disabled={isSubmitting}
                  rows={5}
                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:ring-blue-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="suggested_solution" className="text-gray-700 text-sm">Do you have any solution to suggest?</Label>
                <Textarea
                  id="suggested_solution"
                  placeholder="Your suggestion"
                  value={form.suggested_solution}
                  onChange={(e) => update("suggested_solution", e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:ring-blue-200"
                />
              </div>

              <div className="flex items-start gap-4 rounded-lg border-2 border-blue-200 p-4 bg-blue-50">
                <Checkbox
                  id="acknowledged"
                  checked={form.acknowledged}
                  onCheckedChange={(v) => update("acknowledged", Boolean(v))}
                  disabled={isSubmitting}
                  className="mt-0.5 h-5 w-5 border-2 border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <Label htmlFor="acknowledged" className="text-sm text-gray-800 leading-relaxed font-medium cursor-pointer">
                  I understand that this is not an Emergency hotline and I shouldn't expect immediate response. The
                  concern I am raising is to further improve the community of Northfields.
                </Label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="button" variant="outline" onClick={() => router.push("/")} disabled={isSubmitting} className="w-full sm:flex-1 border-gray-200 text-gray-600 hover:bg-gray-50">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !selectedResidentToken} className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
