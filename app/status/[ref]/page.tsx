import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function StatusPage({ params }: { params: { ref: string } }) {
  const supabase = await createClient()
  const ref = decodeURIComponent(params.ref)

  const { data, error } = await supabase.rpc("get_issue_status", { ref })

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
              <Badge variant="outline" className="capitalize">{issue.status?.toLowerCase().replace("_", " ")}</Badge>
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
      </div>
    </div>
  )
}
