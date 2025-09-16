import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { CheckCircle, Clock, AlertCircle, ArrowLeft } from "lucide-react"

export default async function StatusPage({ params }: { params: { ref: string } }) {
  const supabase = await createClient()
  const ref = decodeURIComponent(params.ref)

  const { data, error } = await supabase.rpc("get_issue_status", { ref })
  const { data: updatesData, error: updatesError } = await supabase.rpc("get_issue_status_updates", { ref })

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border border-gray-700/30 shadow-2xl bg-gray-900/95 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Status Lookup</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">We couldn't look up that reference code.</p>
            <p className="text-sm text-red-400">{error.message}</p>
            <div className="mt-6 flex gap-2">
              <Link href="/">
                <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">Back to Home</Button>
              </Link>
              <Link href="/report">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">Submit a new report</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border border-gray-700/30 shadow-2xl bg-gray-900/95 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Status Lookup</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">No issue found for reference code:</p>
            <p className="font-mono mt-2 text-white">{ref}</p>
            <div className="mt-6 flex gap-3">
              <Link href="/">
                <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">Back to Home</Button>
              </Link>
              <Link href="/report">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">Report a Concern</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      <header className="border-b border-gray-700/30 bg-gray-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-800">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                <span className="ml-2">Back</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white">Issue Status</h1>
              <p className="text-sm text-gray-400">Reference code: <span className="font-mono">{issue.ref_code}</span></p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 md:px-4 py-8 md:py-10 max-w-3xl">
        <Card className="rounded-2xl border border-gray-700/30 shadow-2xl bg-gray-900/95 supports-[backdrop-filter]:backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-white">{issue.title}</CardTitle>
              <Badge variant="outline" className="capitalize border-gray-600 text-gray-300">
                {currentStatus.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div>
                <p className="text-sm text-gray-400 mb-1">Priority</p>
                <Badge variant="secondary" className="capitalize">{issue.priority}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Description</p>
                <p className="text-gray-200 whitespace-pre-wrap">{issue.description}</p>
              </div>
              <div className="text-sm text-gray-400">Submitted: {created}</div>
            </div>
            <div className="mt-6 flex gap-2">
              <Link href="/">
                <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">Back to Home</Button>
              </Link>
              <Link href="/report">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">Report a Concern</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Card className="rounded-2xl border border-gray-700/30 shadow-2xl bg-gray-900/95 supports-[backdrop-filter]:backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Status Updates {updatesSorted.length ? `(${updatesSorted.length})` : ""}</CardTitle>
            </CardHeader>
            <CardContent>
              {updatesSorted.length === 0 ? (
                <div className="text-sm text-gray-400">No status updates yet.</div>
              ) : (
                <ul className="rounded-xl border border-gray-700/30 divide-y divide-gray-700/30 overflow-hidden bg-gray-900/50">
                  {updatesSorted.map((u: any) => {
                    const dateStr = u.created_at ? new Date(u.created_at).toLocaleString() : ""
                    const s = dbToUiStatus(u.status)
                    const label = s.replace(/_/g, " ")
                    const icon =
                      s === "resolved" ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                      ) : s === "in_progress" ? (
                        <Clock className="h-3.5 w-3.5 text-blue-400" />
                      ) : s === "closed" ? (
                        <CheckCircle className="h-3.5 w-3.5 text-gray-400" />
                      ) : s === "on_hold" ? (
                        <AlertCircle className="h-3.5 w-3.5 text-orange-400" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                      )
                    return (
                      <li key={u.id || `${u.created_at}-${u.status}`} className="p-3">
                        {u.notes && <div className="text-gray-200 text-sm whitespace-pre-wrap">{u.notes}</div>}
                        <div className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-1.5">
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
      </div>
    </div>
  )
}
