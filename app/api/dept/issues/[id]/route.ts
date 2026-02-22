import { NextResponse } from "next/server"
import { getDeptContext } from "@/lib/dept/auth"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireDeptSessionAPI } from "@/lib/supabase/guards"

type IssueDbRow = {
  id: string; ref_code: string; title: string; description: string; category: string
  priority: string | null; status: string | null; created_at: string; updated_at: string
  resolved_at: string | null; resolution_notes: string | null; location_text: string | null
  assigned_to: string | null; reporter_full_name: string | null; reporter_email: string | null
  reporter_phone: string | null; reporter_block: string | null; reporter_lot: string | null
  reporter_phase: string | null; reporter_street: string | null
}

function mapPriority(dbPriority: string | null): "P1" | "P2" | "P3" | "P4" {
  switch ((dbPriority || "").toUpperCase()) {
    case "P1": return "P1"; case "P2": return "P2"; case "P3": return "P3"; case "P4": return "P4"
    default: return "P3"
  }
}

function mapStatus(dbStatus: string | null): "not_started" | "in_progress" | "on_hold" | "resolved" | "closed" {
  switch ((dbStatus || "").toUpperCase()) {
    case "NEW": case "TRIAGED": return "not_started"
    case "IN_PROGRESS": return "in_progress"
    case "NEEDS_INFO": return "on_hold"
    case "RESOLVED": return "resolved"
    case "CLOSED": return "closed"
    default: return "not_started"
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const authError = await requireDeptSessionAPI()
  if (authError) return authError
  try {
    const ctx = await getDeptContext()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const id = params.id
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const supabase = createAdminClient()

    const { data: link, error: linkErr } = await supabase
      .from("issue_departments").select("issue_id").eq("issue_id", id).eq("department_id", ctx.id).limit(1)
    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 400 })
    if (!Array.isArray(link) || link.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const { data, error } = await supabase.from("issues").select("*").eq("id", id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const row = data as IssueDbRow

    return NextResponse.json({
      item: {
        id: row.id, ref_code: row.ref_code, title: row.title, description: row.description, category: row.category,
        priority: mapPriority(row.priority), status: mapStatus(row.status),
        location: row.location_text, assignedTo: row.assigned_to,
        createdAt: row.created_at, updatedAt: row.updated_at, resolvedAt: row.resolved_at,
        resolutionNotes: row.resolution_notes, reporterFullName: row.reporter_full_name,
        reporterEmail: row.reporter_email, reporterPhone: row.reporter_phone,
        reporterBlock: row.reporter_block, reporterLot: row.reporter_lot,
        reporterPhase: row.reporter_phase, reporterStreet: row.reporter_street,
      }
    }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const authError = await requireDeptSessionAPI()
  if (authError) return authError
  try {
    const ctx = await getDeptContext()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const id = params.id
    if (!id) return NextResponse.json({ error: "Missing issue id" }, { status: 400 })

    const body = await req.json()
    const { priority } = body
    if (!priority) return NextResponse.json({ error: "Priority is required" }, { status: 400 })
    if (!["P1", "P2", "P3", "P4"].includes(priority)) return NextResponse.json({ error: "Invalid priority" }, { status: 400 })

    const supabase = createAdminClient()

    const { data: link, error: linkErr } = await supabase
      .from("issue_departments").select("issue_id").eq("issue_id", id).eq("department_id", ctx.id).limit(1)
    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 400 })
    if (!Array.isArray(link) || link.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const { data, error } = await supabase
      .from("issues").update({ priority, updated_at: new Date().toISOString() }).eq("id", id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ message: "Priority updated", issue: { id: data.id, priority: data.priority } }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
