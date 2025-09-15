import { NextResponse } from "next/server"
import { getDeptContext } from "@/lib/dept/auth"
import { createAdminClient } from "@/lib/supabase/server-admin"

function mapPriority(dbPriority: string | null): "low" | "normal" | "high" | "urgent" {
  switch ((dbPriority || "").toUpperCase()) {
    case "P1": return "urgent"
    case "P2": return "high"
    case "P3": return "normal"
    case "P4": return "low"
    default: return "normal"
  }
}

function mapStatus(dbStatus: string | null): "open" | "in_progress" | "resolved" | "closed" {
  switch ((dbStatus || "").toUpperCase()) {
    case "NEW":
    case "TRIAGED":
    case "NEEDS_INFO":
      return "open"
    case "IN_PROGRESS":
      return "in_progress"
    case "RESOLVED":
      return "resolved"
    case "CLOSED":
      return "closed"
    default:
      return "open"
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await getDeptContext()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const id = params.id
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const supabase = createAdminClient()

    // Verify scoping by department
    const { data: link, error: linkErr } = await supabase
      .from("issue_departments")
      .select("issue_id")
      .eq("issue_id", id)
      .eq("department_id", ctx.id)
      .limit(1)

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 400 })
    if (!Array.isArray(link) || link.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const { data: row, error } = await supabase
      .from("issues")
      .select(
        [
          "id",
          "ref_code",
          "title",
          "description",
          "category",
          "priority",
          "status",
          "created_at",
          "updated_at",
          "resolved_at",
          "resolution_notes",
          "location_text",
          "assigned_to",
          "reporter_full_name",
          "reporter_email",
          "reporter_phone",
          "reporter_block",
          "reporter_lot",
          "reporter_phase",
          "reporter_street",
        ].join(", ")
      )
      .eq("id", id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const item = {
      id: row.id as string,
      ref_code: row.ref_code as string,
      title: row.title as string,
      description: row.description as string,
      category: row.category as string,
      priority: mapPriority(row.priority as string | null),
      status: mapStatus(row.status as string | null),
      location: row.location_text as string | null,
      assignedTo: row.assigned_to as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      resolvedAt: row.resolved_at as string | null,
      resolutionNotes: row.resolution_notes as string | null,
      reporterFullName: row.reporter_full_name as string | null,
      reporterEmail: row.reporter_email as string | null,
      reporterPhone: row.reporter_phone as string | null,
      reporterBlock: row.reporter_block as string | null,
      reporterLot: row.reporter_lot as string | null,
      reporterPhase: row.reporter_phase as string | null,
      reporterStreet: row.reporter_street as string | null,
    }

    return NextResponse.json({ item }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
