"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Hash, Mail, Search, Loader2 } from "lucide-react"

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
              <h1 className="text-lg font-bold text-white">Check Issue Status</h1>
              <p className="text-sm text-gray-400">Use your reference code or search by your email</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 max-w-3xl">
        {error && (
          <div className="mb-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="rounded-2xl p-[1.5px] bg-gradient-to-b from-orange-500/30 via-orange-500/10 to-transparent">
            <Card className="rounded-2xl border border-gray-700/30 shadow-2xl bg-gray-900/95 supports-[backdrop-filter]:backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-white">By Reference Code</CardTitle>
                <CardDescription className="text-gray-400">Looks like REF-ABCD1234 from your confirmation</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRefSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ref" className="text-gray-300">Reference Code</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="ref"
                        placeholder="REF-XXXXXXX"
                        value={ref}
                        onChange={(e) => setRef(e.target.value)}
                        className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 pl-9"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    View Status
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-2xl p-[1.5px] bg-gradient-to-b from-orange-500/30 via-orange-500/10 to-transparent">
            <Card className="rounded-2xl border border-gray-700/30 shadow-2xl bg-gray-900/95 supports-[backdrop-filter]:backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-white">By Email</CardTitle>
                <CardDescription className="text-gray-400">Find all reports submitted with your email</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailSearch} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 pl-9"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
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
        </div>

        {results.length > 0 && (
          <div className="mt-6 rounded-2xl p-[1.5px] bg-gradient-to-b from-orange-500/30 via-orange-500/10 to-transparent">
            <Card className="rounded-2xl border border-gray-700/30 shadow-2xl bg-gray-900/95 supports-[backdrop-filter]:backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-white">Your Reports</CardTitle>
                <CardDescription className="text-gray-400">Click any item to view details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-800">
                  {results.map((item) => {
                    const created = item.created_at ? new Date(item.created_at).toLocaleString() : ""
                    const ui = dbToUiStatus(String(item.status || ""))
                    const status = ui.replace(/_/g, " ")
                    return (
                      <div key={item.ref_code} className="py-3 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-white font-medium">{item.title || "Untitled"}</div>
                            <Badge variant="outline" className="shrink-0 capitalize">{status}</Badge>
                          </div>
                          <div className="mt-1 text-sm text-gray-400 truncate">
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
                          <Button variant="outline" onClick={() => router.push(`/status/${encodeURIComponent(item.ref_code)}`)} className="border-gray-600 text-gray-300 hover:bg-gray-800">
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
          <div className="mt-6 text-center text-gray-400">No reports found for that email.</div>
        )}
      </div>
    </div>
  )
}
