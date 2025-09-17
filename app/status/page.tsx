"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Search, AlertCircle, CheckCircle, Clock, MapPin, Hash, Mail, Loader2 } from "lucide-react"
import { BottomNav } from "@/components/ui/bottom-nav"

export default function StatusIndexPage() {
  const router = useRouter()

  const [ref, setRef] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  function dbToUiStatus(db: string | null): "not_started" | "in_progress" | "resolved" | "closed" | "on_hold" {
    switch ((db || "").toUpperCase()) {
      case "IN_PROGRESS":
        return "in_progress"
      case "RESOLVED":
        return "resolved"
      case "CLOSED":
        return "closed"
      case "NEEDS_INFO":
      case "NEED_INFO":
        return "on_hold"
      case "NEW":
      case "OPEN":
      case "TRIAGED":
      default:
        return "not_started"
    }
  }

  const handleRefSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const code = ref.trim()
    if (!code) {
      setError("Please enter your reference code.")
      return
    }
    router.push(`/status/${encodeURIComponent(code)}`)
  }

  const handleEmailSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setResults([])
    const value = email.trim()
    if (!value) {
      setError("Please enter an email address.")
      return
    }
    try {
      setLoading(true)
      const res = await fetch(`/api/status/by-email?email=${encodeURIComponent(value)}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to search by email")
      setResults(Array.isArray(json.items) ? json.items : [])
    } catch (err: any) {
      setError(err?.message || "Failed to search by email")
    } finally {
      setHasSearched(true)
      setLoading(false)
    }
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
          <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-500">
            <MapPin className="w-3 h-3" />
            <span>Portal</span>
          </div>
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
              <h2 className="text-lg font-bold text-gray-900">Check Issue Status</h2>
              <p className="text-sm text-gray-600">Use your reference code or search by email</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-xl border-0 shadow-md bg-white overflow-hidden border border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-900 text-base">By Reference Code</CardTitle>
              <CardDescription className="text-gray-600 text-sm">Looks like REF-ABCD1234 from your confirmation</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRefSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ref" className="text-gray-700 text-sm">Reference Code</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="ref"
                      placeholder="REF-XXXXXXX"
                      value={ref}
                      onChange={(e) => setRef(e.target.value)}
                      className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pl-9 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  View Status
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-0 shadow-md bg-white overflow-hidden border border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-900 text-base">By Email</CardTitle>
              <CardDescription className="text-gray-600 text-sm">Find all reports submitted with your email</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pl-9 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {loading ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Searching</span>
                  ) : (
                    <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Search</span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {results.length > 0 && (
          <div className="mt-6">
            <Card className="rounded-xl border-0 shadow-md bg-white overflow-hidden border border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-gray-900 text-base">Your Reports</CardTitle>
                <CardDescription className="text-gray-600 text-sm">Click any item to view details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-100">
                  {results.map((item) => {
                    const created = item.created_at ? new Date(item.created_at).toLocaleString() : ""
                    const ui = dbToUiStatus(String(item.status || ""))
                    const status = ui.replace(/_/g, " ")
                    return (
                      <div key={item.ref_code} className="py-3 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-gray-900 font-medium text-sm">{item.title || "Untitled"}</div>
                            <Badge variant="outline" className="shrink-0 capitalize text-xs border-blue-200 text-blue-600">{status}</Badge>
                          </div>
                          <div className="mt-1 text-xs text-gray-600 truncate">
                            <span className="font-mono">{item.ref_code}</span>
                            <span className="mx-2">•</span>
                            <span>Priority {item.priority}</span>
                            {created && (<>
                              <span className="mx-2">•</span>
                              <span>Submitted {created}</span>
                            </>)}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/status/${encodeURIComponent(item.ref_code)}`)} className="border-gray-200 text-gray-600 hover:bg-gray-50 text-xs">
                            View
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && email.trim() && (
          <div className="mt-6 text-center text-gray-600 text-sm">No reports found for that email.</div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
