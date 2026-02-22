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
import { ArrowLeft, Search, AlertCircle, CheckCircle, Clock, MapPin, Hash, Mail, Loader2, ArrowRight } from "lucide-react"
import { useRef, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"
import { BottomNav } from "@/components/ui/bottom-nav"

export default function StatusIndexPage() {
  const router = useRouter()

  const [ref, setRef] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (results.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [results])

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
    const isValidEmail = (email: string) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    if (!value) {
      setError("Please enter an email address.")
      return
    }
    if (!isValidEmail(value)) {
      setError("Please enter a valid email address.")
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
      <div className="px-4 py-4 pb-32 max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Check Status</h2>
              <p className="text-sm text-gray-500">Track your reported concerns</p>
            </div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert variant="destructive" className="rounded-xl border-red-100 bg-red-50 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <Tabs defaultValue="ref" className="w-full">
          <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100/80 backdrop-blur-md rounded-xl mb-6">
            <TabsTrigger value="ref" className="rounded-lg py-2.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
              <Hash className="w-4 h-4 mr-2" />
              By Code
            </TabsTrigger>
            <TabsTrigger value="email" className="rounded-lg py-2.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
              <Mail className="w-4 h-4 mr-2" />
              By Email
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="ref">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/70 backdrop-blur-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-gray-900 text-lg">Reference Code</CardTitle>
                    <CardDescription className="text-gray-500 text-sm italic">Example: REF-12345678</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRefSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="ref" className="text-gray-600 text-xs font-bold uppercase tracking-wider ml-1">Your Code</Label>
                        <div className="relative group">
                          <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          <Input
                            id="ref"
                            placeholder="REF-XXXXXXX"
                            value={ref}
                            onChange={(e) => setRef(e.target.value)}
                            className="bg-gray-50/50 border-gray-200 h-12 rounded-xl text-gray-900 placeholder:text-gray-400 pl-10 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all font-semibold">
                        View Details
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="email">
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/70 backdrop-blur-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-gray-900 text-lg">Email Address</CardTitle>
                    <CardDescription className="text-gray-500 text-sm">Find all reports linked to your email</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleEmailSearch} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-600 text-xs font-bold uppercase tracking-wider ml-1">Registered Email</Label>
                        <div className="relative group">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-gray-50/50 border-gray-200 h-12 rounded-xl text-gray-900 placeholder:text-gray-400 pl-10 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                          />
                        </div>
                      </div>
                      <Button type="submit" disabled={loading} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all font-semibold">
                        {loading ? (
                          <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Searching...</span>
                        ) : (
                          <span className="inline-flex items-center gap-2">Search Reports <Search className="h-4 w-4 ml-1" /></span>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>

        {results.length > 0 && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-lg font-bold text-gray-900">Search Results</h3>
              <Badge variant="secondary" className="rounded-full bg-blue-50 text-blue-600 border-blue-100 px-3 py-1">
                {results.length} found
              </Badge>
            </div>

            <div className="space-y-3">
              {results.map((item, idx) => {
                const created = item.created_at ? new Date(item.created_at).toLocaleDateString() : ""
                const ui = dbToUiStatus(String(item.status || ""))
                const statusLabel = ui.replace(/_/g, " ")

                return (
                  <motion.div
                    key={item.ref_code}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => router.push(`/status/${encodeURIComponent(item.ref_code)}`)}
                    className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl shrink-0 ${ui === 'resolved' ? 'bg-green-50 text-green-600' :
                        ui === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                        {ui === 'resolved' ? <CheckCircle className="w-5 h-5" /> :
                          ui === 'in_progress' ? <Clock className="w-5 h-5" /> :
                            <AlertCircle className="w-5 h-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors uppercase text-sm tracking-tight tracking-wide">
                            {item.title || "Untitled Concern"}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-500 font-medium tracking-tight">
                          <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">{item.ref_code}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Area {item.area_name || 'N/A'}</span>
                          <span>{created}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {!loading && hasSearched && results.length === 0 && email.trim() && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 text-center"
          >
            <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h4 className="text-gray-900 font-bold">No records found</h4>
            <p className="text-gray-500 text-sm mt-1">We couldn't find any reports matching that email.</p>
            <Button variant="outline" onClick={() => { setResults([]); setHasSearched(false); setEmail("") }} className="mt-4 rounded-xl border-gray-200">
              Try Another Search
            </Button>
          </motion.div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
