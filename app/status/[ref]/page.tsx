import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle, Clock, AlertCircle, ArrowLeft, MapPin } from "lucide-react"
import { BottomNav } from "@/components/ui/bottom-nav"

export default async function StatusPage({ params }: { params: { ref: string } }) {
  const supabase = await createClient()
  const ref = decodeURIComponent(params.ref)

  const { data, error } = await supabase.rpc("get_issue_status", { ref })
  const { data: updatesData, error: updatesError } = await supabase.rpc("get_issue_status_updates", { ref })

  if (error) {
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

        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="w-full max-w-lg rounded-xl border-0 shadow-md bg-white overflow-hidden border border-gray-100">
            <CardHeader>
              <CardTitle className="text-gray-900 text-base">Status Lookup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4 text-sm">We couldn't look up that reference code.</p>
              <p className="text-sm text-red-600">{error.message}</p>
              <div className="mt-6 flex gap-3">
                <Link href="/">
                  <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50">Back to Home</Button>
                </Link>
                <Link href="/report">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">Submit a new report</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const issue = Array.isArray(data) ? data[0] : null
  const updates = Array.isArray(updatesData) ? updatesData : []

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

  if (!issue) {
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

        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="w-full max-w-lg rounded-xl border-0 shadow-md bg-white overflow-hidden border border-gray-100">
            <CardHeader>
              <CardTitle className="text-gray-900 text-base">Status Lookup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">No issue found for reference code:</p>
              <p className="font-mono mt-2 text-gray-900 text-sm">{ref}</p>
              <div className="mt-6 flex gap-3">
                <Link href="/">
                  <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50">Back to Home</Button>
                </Link>
                <Link href="/report">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">Report a Concern</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const created = issue.created_at ? new Date(issue.created_at).toLocaleString() : ""
  const updatesSorted = [...updates].sort((a: any, b: any) => {
    const ta = a?.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b?.created_at ? new Date(b.created_at).getTime() : 0
    return tb - ta
  })
  const currentStatus = updatesSorted.length > 0 ? dbToUiStatus(updatesSorted[0]?.status || null) : dbToUiStatus(issue.status)

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
            <Button asChild variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Issue Status</h2>
              <p className="text-sm text-gray-600">Reference: <span className="font-mono">{issue.ref_code}</span></p>
            </div>
          </div>
        </div>

        <Card className="rounded-xl border-0 shadow-md bg-white overflow-hidden border border-gray-100 mb-4">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-gray-900 text-base">{issue.title}</CardTitle>
              <Badge variant="outline" className="capitalize border-blue-200 text-blue-600 text-xs">
                {currentStatus.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Priority</p>
                <Badge variant="secondary" className="capitalize text-xs">{issue.priority}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Description</p>
                <p className="text-gray-900 whitespace-pre-wrap text-sm">{issue.description}</p>
              </div>
              {issue.location_text && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Location</p>
                  <p className="text-gray-900 text-sm">{issue.location_text}</p>
                </div>
              )}
              <div className="text-sm text-gray-600">Submitted: {created}</div>
            </div>
            <div className="mt-6 flex gap-3">
              <Link href="/">
                <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50">Back to Home</Button>
              </Link>
              <Link href="/report">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">Report a Concern</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 shadow-md bg-white overflow-hidden border border-gray-100">
          <CardHeader>
            <CardTitle className="text-gray-900 text-base">Status Updates {updatesSorted.length ? `(${updatesSorted.length})` : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            {updatesSorted.length === 0 ? (
              <div className="text-sm text-gray-600">No status updates yet.</div>
            ) : (
              <ul className="rounded-lg border border-gray-100 divide-y divide-gray-100 overflow-hidden bg-gray-50">
                {updatesSorted.map((u: any) => {
                  const dateStr = u.created_at ? new Date(u.created_at).toLocaleString() : ""
                  const s = dbToUiStatus(u.status)
                  const label = s.replace(/_/g, " ")
                  const icon =
                    s === "resolved" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : s === "in_progress" ? (
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                    ) : s === "closed" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-gray-500" />
                    ) : s === "on_hold" ? (
                      <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-gray-500" />
                    )
                  return (
                    <li key={u.id || `${u.created_at}-${u.status}`} className="p-3 bg-white">
                      {u.notes && <div className="text-gray-900 text-sm whitespace-pre-wrap mb-2">{u.notes}</div>}
                      <div className="text-xs text-gray-600 flex flex-wrap items-center gap-1.5">
                        <span>{dateStr}</span>
                        <span>— set to</span>
                        <span className="capitalize inline-flex items-center gap-1">
                          {icon}
                          <span>{label}</span>
                        </span>
                        {u.author_label ? <span>by {u.author_label || "NEVHA Staff"}</span> : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
