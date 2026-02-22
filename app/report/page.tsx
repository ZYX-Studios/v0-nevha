"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  MapPin,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Truck,
  Trees,
  Zap,
  Droplets,
  ShieldAlert,
  HelpCircle,
  User,
  Wallet,
  MessageSquare,
  Store,
  Users,
  Share2,
  Trophy
} from "lucide-react"

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
  const [step, setStep] = useState(1) // 1: Category, 2: Location/Verify, 3: Details, 4: Review
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successRef, setSuccessRef] = useState<string | null>(null)
  const [deptOptions, setDeptOptions] = useState<string[]>([])

  // Resident verification state
  const [selectedResidentToken, setSelectedResidentToken] = useState<string | null>(null)
  const [nameSuggestions, setNameSuggestions] = useState<{ name: string; token: string }[]>([])
  const [isSearchingName, setIsSearchingName] = useState(false)
  const nameSearchAbortRef = useRef<AbortController | null>(null)

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

  // Category Icons Mapping
  const getCategoryIcon = (cat: string) => {
    const lower = cat.toLowerCase()
    if (lower.includes("security") || lower === "peace and order") return ShieldAlert
    if (lower.includes("water")) return Droplets
    if (lower.includes("power") || lower.includes("electric")) return Zap
    if (lower.includes("maintenance")) return Truck
    if (lower.includes("environment") || lower.includes("garden")) return Trees
    if (lower.includes("street") || lower.includes("light")) return Lightbulb

    // New mappings
    if (lower.includes("finance")) return Wallet
    if (lower.includes("grievance")) return MessageSquare
    if (lower.includes("livelihood")) return Store
    if (lower.includes("membership")) return Users
    if (lower.includes("social")) return Share2
    if (lower.includes("sports")) return Trophy

    return HelpCircle
  }

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
      ; (async () => {
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

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const isValidPhone = (phone: string) => {
    // Basic PH mobile number check or generic 10+ digits
    const digits = phone.replace(/\D/g, "")
    return digits.length >= 10
  }

  // Navigation Handlers
  const nextStep = () => {
    setError("")
    if (step === 1 && !form.category) {
      setError("Please select a category first.")
      return
    }
    if (step === 2) {
      if (!form.reporter_full_name) {
        setError("Please enter your name.")
        return
      }
      if (!selectedResidentToken) {
        setError("Please select your name from the list to verify you are a resident.")
        return
      }
    }
    if (step === 3) {
      if (!form.description.trim()) {
        setError("Please tell us what happened.")
        return
      }
      const email = form.reporter_email.trim()
      if (!email) {
        setError("Please enter your email address for status tracking.")
        return
      }
      if (!isValidEmail(email)) {
        setError("Please enter a valid email address (e.g. name@example.com).")
        return
      }
      if (form.reporter_phone && !isValidPhone(form.reporter_phone)) {
        setError("Please enter a valid phone number (at least 10 digits).")
        return
      }
    }
    setStep(s => s + 1)
  }

  const prevStep = () => setStep(s => s - 1)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!form.acknowledged) {
      setError("Please check the box to confirm this report is true.")
      return
    }

    setIsSubmitting(true)
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        // queue for later
        const key = "hoa-report-queue"
        const raw = localStorage.getItem(key)
        const queue: PendingReport[] = raw ? JSON.parse(raw) : []
        queue.push({ ...form, verified_resident_token: selectedResidentToken ?? undefined, queuedAt: Date.now() })
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
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-4 font-sans">
        <Card className="w-full max-w-md border-0 shadow-lg rounded-[2rem] bg-white overflow-hidden">
          <CardContent className="text-center py-10 px-6">
            <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-slate-900">
              {isPending ? "Saved Offline" : "Report Sent!"}
            </h2>
            <p className="text-slate-500 mb-8 text-[15px] leading-relaxed">
              {isPending
                ? "You're offline right now. We'll send your report automatically when you have internet."
                : "Thank you for helping us. We have received your report."}
            </p>
            {!isPending && (
              <div className="mb-8 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Reference Code</span>
                <div className="font-mono text-xl font-bold text-slate-900">{successRef}</div>
              </div>
            )}
            <div className="space-y-3">
              <Button onClick={() => router.push("/")} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-500/30">
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32">
      {/* Sticky Glass Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          {step > 1 ? (
            <Button onClick={prevStep} variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-slate-900 -ml-2">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          ) : (
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-slate-900 -ml-2">
                <ArrowLeft className="w-6 h-6" />
              </Button>
            </Link>
          )}

          <h1 className="text-[17px] font-semibold text-slate-900">
            {step === 1 ? "Report Issue" : step === 2 ? "Who & Where" : step === 3 ? "Details" : "Review"}
          </h1>
        </div>
        <div className="text-[13px] font-semibold text-slate-400">
          Step {step} of 4
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">

        {/* Progress Bar */}
        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Step 1: Category Selection */}
        {step === 1 && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-[20px] font-bold text-slate-900 leading-tight px-2">
              What kind of problem is it?
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {deptOptions.map((cat) => {
                const Icon = getCategoryIcon(cat)
                const isSelected = form.category === cat
                return (
                  <button
                    key={cat}
                    onClick={() => update("category", cat)}
                    className={`p-4 rounded-2xl border text-left transition-all active:scale-[0.98] ${isSelected
                      ? "bg-blue-600 border-blue-600 shadow-md shadow-blue-500/20"
                      : "bg-white border-slate-100 shadow-sm hover:border-slate-200"
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${isSelected ? "bg-white/20 text-white" : "bg-slate-50 text-slate-600"
                      }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`font-bold text-[15px] block leading-tight ${isSelected ? "text-white" : "text-slate-900"}`}>
                      {cat}
                    </span>
                  </button>
                )
              })}
              <button
                onClick={() => update("category", "Others")}
                className={`p-4 rounded-2xl border text-left transition-all active:scale-[0.98] ${form.category === "Others"
                  ? "bg-slate-800 border-slate-800 shadow-lg shadow-slate-900/30"
                  : "bg-white border-slate-100 shadow-sm hover:border-slate-200"
                  }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${form.category === "Others" ? "bg-white/20 text-white" : "bg-slate-50 text-slate-600"
                  }`}>
                  <HelpCircle className="w-5 h-5" />
                </div>
                <span className={`font-bold text-[15px] block leading-tight ${form.category === "Others" ? "text-white" : "text-slate-900"}`}>
                  Others
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Who & Where */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="px-2">
              <h2 className="text-[24px] font-bold text-slate-900 leading-tight mb-2">
                First, let's verify it's you.
              </h2>
              <p className="text-slate-500 text-[15px]">
                Start typing your name and select it from the list.
              </p>
            </div>

            <div className="bg-white p-6 rounded-[1.75rem] shadow-sm border border-slate-100 space-y-4">
              <div>
                <Label className="text-[13px] text-slate-500 font-bold uppercase tracking-wide mb-2 block pl-1">Your Name</Label>
                <div className="relative">
                  <Input
                    value={form.reporter_full_name}
                    onChange={(e) => {
                      update("reporter_full_name", e.target.value)
                      if (selectedResidentToken) setSelectedResidentToken(null)
                    }}
                    className="h-14 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500/20 text-[17px] px-4"
                    placeholder="e.g. Juan Della Cruz"
                    autoFocus
                  />
                  {selectedResidentToken && (
                    <div className="absolute right-4 top-4 text-emerald-500 bg-white rounded-full p-0.5 shadow-sm">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Suggestions */}
                {!selectedResidentToken && form.reporter_full_name.length > 2 && (
                  <div className="mt-3 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden divide-y divide-slate-50">
                    {nameSuggestions.map(s => (
                      <button
                        key={s.token}
                        onClick={() => {
                          setSelectedResidentToken(s.token)
                          update("reporter_full_name", s.name)
                          setNameSuggestions([])
                        }}
                        className="w-full text-left p-4 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                      >
                        <span className="font-medium text-slate-700 group-hover:text-blue-700">{s.name}</span>
                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-blue-500" />
                      </button>
                    ))}
                    {nameSuggestions.length === 0 && !isSearchingName && (
                      <div className="p-4 text-slate-400 text-sm italic text-center">No residents found. Keep typing...</div>
                    )}
                  </div>
                )}
                {selectedResidentToken && (
                  <p className="text-emerald-600 text-sm font-medium mt-2 pl-2 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Verified Resident
                  </p>
                )}
              </div>

              <div className="pt-2">
                <Label className="text-[13px] text-slate-500 font-bold uppercase tracking-wide mb-2 block pl-1">Category Selected</Label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    {(() => {
                      const Icon = getCategoryIcon(form.category)
                      return <Icon className="w-5 h-5" />
                    })()}
                  </div>
                  <span className="font-bold text-slate-900">{form.category}</span>
                  <button onClick={() => setStep(1)} className="ml-auto text-xs font-bold text-blue-600 px-3 py-1 bg-white rounded-lg shadow-sm">
                    Change
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="px-2">
              <h2 className="text-[24px] font-bold text-slate-900 leading-tight mb-2">
                Describe the issue.
              </h2>
              <p className="text-slate-500 text-[15px]">
                The more details, the faster we can fix it.
              </p>
            </div>

            <div className="bg-white p-6 rounded-[1.75rem] shadow-sm border border-slate-100 space-y-4">
              <div>
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className="min-h-[180px] bg-slate-50 border-0 rounded-2xl text-[16px] leading-[1.6] resize-none p-5 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Example: Street light blinking in front of Block 5, Lot 2..."
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <Label className="text-[13px] text-slate-500 font-bold uppercase tracking-wide mb-2 block pl-1">Phone (Optional)</Label>
                  <Input
                    value={form.reporter_phone}
                    onChange={(e) => update("reporter_phone", e.target.value)}
                    className="h-12 bg-slate-50 border-0 rounded-xl"
                    placeholder="0917..."
                  />
                </div>
                <div>
                  <Label className="text-[13px] text-slate-500 font-bold uppercase tracking-wide mb-2 block pl-1">Email (Required)</Label>
                  <Input
                    value={form.reporter_email}
                    onChange={(e) => update("reporter_email", e.target.value)}
                    className="h-12 bg-slate-50 border-0 rounded-xl"
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <Label className="text-[13px] text-slate-500 font-bold uppercase tracking-wide mb-2 block pl-1">Location (Optional)</Label>
                  <Input
                    value={form.reporter_block}
                    onChange={(e) => update("reporter_block", e.target.value)}
                    className="h-12 bg-slate-50 border-0 rounded-xl"
                    placeholder="Blk/Lot..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="px-2">
              <h2 className="text-[24px] font-bold text-slate-900 leading-tight">
                Almost done!
              </h2>
              <p className="text-slate-500 text-[15px]">
                Review your report before sending.
              </p>
            </div>

            <div className="bg-white p-6 rounded-[1.75rem] shadow-sm border border-slate-100 space-y-6">

              {/* Summary Cards */}
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                    {(() => {
                      const Icon = getCategoryIcon(form.category)
                      return <Icon className="w-5 h-5" />
                    })()}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{form.category}</h4>
                    <p className="text-slate-500 text-sm">Category</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{form.reporter_full_name}</h4>
                    <p className="text-emerald-600 text-sm font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Verified Resident
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-slate-700 italic text-[15px] leading-relaxed">
                    "{form.description}"
                  </p>
                </div>
              </div>

              {/* Checkbox */}
              <div className="flex items-start gap-4 pt-2 cursor-pointer" onClick={() => update("acknowledged", !form.acknowledged)}>
                <Checkbox
                  id="ack"
                  checked={form.acknowledged}
                  onCheckedChange={(c) => update("acknowledged", !!c)}
                  className="mt-1 w-6 h-6 rounded-lg border-2 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-all"
                />
                <label htmlFor="ack" className="text-[14px] text-slate-600 leading-snug cursor-pointer select-none">
                  I verify that this report is true and accurate. I understand that malicious reporting may lead to penalties.
                </label>
              </div>

            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="animate-in slide-in-from-bottom-2 fade-in duration-300 bg-red-50 text-red-600 p-4 rounded-[1.25rem] text-sm font-bold border border-red-100 flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {step < 4 ? (
            <Button
              onClick={nextStep}
              className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-[1.5rem] shadow-xl shadow-slate-900/10 text-[18px] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Next Step <ChevronRight className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !form.acknowledged}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-[1.5rem] shadow-xl shadow-blue-600/20 text-[18px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                "Sending Report..."
              ) : (
                <>Submit Report <CheckCircle className="w-5 h-5" /></>
              )}
            </Button>
          )}
        </div>

      </main>
    </div>
  )
}
