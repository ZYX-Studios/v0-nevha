import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server-admin"

const PatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["not_started", "in_progress", "on_hold", "resolved", "closed"]),
  notes: z.string().optional().nullable(),
})

function uiToDbStatus(ui: "not_started" | "in_progress" | "on_hold" | "resolved" | "closed"): "NEW" | "TRIAGED" | "IN_PROGRESS" | "NEEDS_INFO" | "RESOLVED" | "CLOSED" {
  switch (ui) {
    case "not_started":
      return "TRIAGED"
    case "in_progress":
      return "IN_PROGRESS"
    case "on_hold":
      return "NEEDS_INFO"
    case "resolved":
      return "RESOLVED"
    case "closed":
      return "CLOSED"
    default:
      return "TRIAGED"
  }
}

export async function PATCH(req: Request) {
  try {
    const json = await req.json().catch(() => ({}))
    console.info("[IssuesStatusFallback] Incoming PATCH", { path: "/api/admin/issues/status", body: json })
    const parsed = PatchSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { id, status, notes } = parsed.data

    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    console.info("[IssuesStatusFallback] Env check", { hasUrl, hasService })

    const supabase = createAdminClient()

    const dbStatus = uiToDbStatus(status)
    console.info("[IssuesStatusFallback] Mapped status", { ui: status, db: dbStatus, notes: !!notes })

    const updates: any = { status: dbStatus }

    const { error } = await supabase.from("issues").update(updates).eq("id", id)

    if (error) {
      console.warn("[IssuesStatusFallback] Update failed", { id, error: error.message })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    try {
      await supabase.from("issue_status_updates").insert({
        issue_id: id,
        status: dbStatus,
        notes: notes || null,
        author_label: "Admin",
      } as any)
    } catch (e) {
      console.warn("[IssuesStatusFallback] Status update insert failed", { id, error: (e as any)?.message || e })
    }

    console.info("[IssuesStatusFallback] Update ok", { id, status: dbStatus })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (e: any) {
    console.error("[IssuesStatusFallback] Server error", { message: e?.message })
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
