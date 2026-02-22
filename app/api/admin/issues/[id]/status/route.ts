import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAdminAPI } from "@/lib/supabase/guards"

const PatchSchema = z.object({
  status: z.enum(["not_started", "in_progress", "on_hold", "resolved", "closed"]),
  notes: z.string().optional().nullable(),
})

function uiToDbStatus(ui: "not_started" | "in_progress" | "on_hold" | "resolved" | "closed") {
  switch (ui) {
    case "not_started": return "TRIAGED"
    case "in_progress": return "IN_PROGRESS"
    case "on_hold": return "NEEDS_INFO"
    case "resolved": return "RESOLVED"
    case "closed": return "CLOSED"
    default: return "TRIAGED"
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const authError = await requireAdminAPI()
  if (authError) return authError
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: "Missing issue id" }, { status: 400 })

    const json = await req.json().catch(() => ({}))
    const parsed = PatchSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const supabase = createAdminClient()
    const dbStatus = uiToDbStatus(parsed.data.status)

    const { error } = await supabase.from("issues").update({ status: dbStatus }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    try {
      await supabase.from("issue_status_updates").insert({
        issue_id: id,
        status: dbStatus,
        notes: parsed.data.notes || null,
        author_label: "Admin",
      } as any)
    } catch { /* non-fatal */ }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
