"use client"

import { useEffect, useState } from "react"
import type { Metadata } from "next"
import { CacheManager } from "@/lib/cache-manager"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "NEVHA App — Refresh",
  description: "Force refresh to clear outdated cache and load the latest NEVHA App.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function RefreshPage() {
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    // Slight delay to render UI before clearing
    const t = setTimeout(() => {
      CacheManager.forceRefresh()
    }, 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <RefreshCw className={`h-6 w-6 text-blue-600 ${busy ? 'animate-spin' : ''}`} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Refreshing NEVHA App</h1>
        <p className="text-sm text-gray-600 mb-6">
          We are clearing outdated cache and reloading the latest version. This usually takes a few seconds.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => CacheManager.forceRefresh()} className="bg-blue-600 hover:bg-blue-700">
            Refresh now
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Go Home
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-6">
          If the app still looks outdated after refresh, fully close the app and reopen it.
        </p>
      </div>
    </div>
  )
}
