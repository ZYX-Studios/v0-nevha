import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { CheckCircle, Clock, AlertCircle } from "lucide-react"

export default async function StatusPage({ params }: { params: { ref: string } }) {
  const supabase = await createClient()
  const ref = decodeURIComponent(params.ref)

  const { data, error } = await supabase.rpc("get_issue_status", { ref })
  const { data: updatesData, error: updatesError } = await supabase.rpc("get_issue_status_updates", { ref })

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground">Status Lookup</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">We couldn't look up that reference code.</p>
            <p className="text-sm text-destructive">{error.message}</p>
            <div className="mt-6">
              <Link href="/report">
                <Button variant="outline">Submit a new report</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const issue = Array.isArray(data) ? data[0] : null
  const updates = Array.isArray(updatesData) ? updatesData : []

  function dbToUiStatus(db: string | null): "open" | "in_progress" | "resolved" | "closed" {
    switch ((db || "").toUpperCase()) {
      case "IN_PROGRESS":
        return "in_progress"
      case "RESOLVED":
        return "resolved"
      case "CLOSED":
        return "closed"
      case "NEW":
      case "TRIAGED":
      case "NEEDS_INFO":
      default:
        return "open"
    }
  }

  if (!issue) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground">Status Lookup</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No issue found for reference code:</p>
            <p className="font-mono mt-2">{ref}</p>
            <div className="mt-6 flex gap-3">
              <Link href="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
              <Link href="/report">
                <Button>Report a Concern</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const created = issue.created_at ? new Date(issue.created_at).toLocaleString() : ""
  const currentStatus = updates.length > 0 ? dbToUiStatus(updates[0]?.status || null) : dbToUiStatus(issue.status)

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Issue Status</h1>
          <p className="text-muted-foreground">Reference code: <span className="font-mono">{issue.ref_code}</span></p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">{issue.title}</CardTitle>
              <Badge variant="outline" className="capitalize">{currentStatus.replace("_", " ")}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Priority</p>
                <Badge variant="secondary">{issue.priority}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-foreground whitespace-pre-wrap">{issue.description}</p>
              </div>
              <div className="text-sm text-muted-foreground">Submitted: {created}</div>
            </div>
            <div className="mt-6">
              <Link href="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-foreground">Status Updates {updates.length ? `(${updates.length})` : ""}</CardTitle>
            </CardHeader>
            <CardContent>
              {updates.length === 0 ? (
                <div className="text-sm text-muted-foreground">No status updates yet.</div>
              ) : (
                <ul className="rounded-md border border-border divide-y divide-border overflow-hidden">
                  {updates.map((u: any) => {
                    const dateStr = u.created_at ? new Date(u.created_at).toLocaleString() : ""
                    const s = dbToUiStatus(u.status)
                    const label = s.replace("_", " ")
                    const icon =
                      s === "resolved" ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      ) : s === "in_progress" ? (
                        <Clock className="h-3.5 w-3.5 text-blue-600" />
                      ) : s === "closed" ? (
                        <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                      )
                    return (
                      <li key={u.id || `${u.created_at}-${u.status}`} className="p-3">
                        {u.notes && <div className="text-foreground text-sm whitespace-pre-wrap">{u.notes}</div>}
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <span>{dateStr}</span>
                          <span>— set to</span>
                          <span className="capitalize inline-flex items-center gap-1">
                            {icon}
                            <span>{label}</span>
                          </span>
                          {u.author_label ? <span>by NEVHA Staff</span> : null}
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
