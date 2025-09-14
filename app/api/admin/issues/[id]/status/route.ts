import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server-admin"

const PatchSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  notes: z.string().optional().nullable(),
})

function uiToDbStatus(ui: "open" | "in_progress" | "resolved" | "closed"): "NEW" | "TRIAGED" | "IN_PROGRESS" | "NEEDS_INFO" | "RESOLVED" | "CLOSED" {
  switch (ui) {
    case "in_progress":
      return "IN_PROGRESS"
    case "resolved":
      return "RESOLVED"
    case "closed":
      return "CLOSED"
    case "open":
    default:
      return "TRIAGED"
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: "Missing issue id" }, { status: 400 })

    const json = await req.json().catch(() => ({}))
    console.info("[IssuesStatus] Incoming PATCH", { path: `/api/admin/issues/${id}/status`, body: json })
    const parsed = PatchSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    console.info("[IssuesStatus] Env check", { hasUrl, hasService })
    const supabase = createAdminClient()

    const dbStatus = uiToDbStatus(parsed.data.status)
    console.info("[IssuesStatus] Mapped status", { ui: parsed.data.status, db: dbStatus, notes: !!parsed.data.notes })
    const updates: any = { status: dbStatus }

    const { error } = await supabase
      .from("issues")
      .update(updates)
      .eq("id", id)

    if (error) {
      console.warn("[IssuesStatus] Update failed", { id, error: error.message })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Insert status update line
    try {
      await supabase.from("issue_status_updates").insert({
        issue_id: id,
        status: dbStatus,
        notes: parsed.data.notes || null,
        author_label: "Admin",
      } as any)
    } catch (e) {
      console.warn("[IssuesStatus] Status update insert failed", { id, error: (e as any)?.message || e })
    }

    console.info("[IssuesStatus] Update ok", { id, status: dbStatus })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (e: any) {
    console.error("[IssuesStatus] Server error", { message: e?.message })
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
