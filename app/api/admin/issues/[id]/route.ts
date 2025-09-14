import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"

function mapPriority(dbPriority: string | null): "low" | "normal" | "high" | "urgent" {
  switch ((dbPriority || "").toUpperCase()) {
    case "P1":
      return "urgent"
    case "P2":
      return "high"
    case "P3":
      return "normal"
    case "P4":
      return "low"
    default:
      return "normal"
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
    const id = params.id
    if (!id) return NextResponse.json({ error: "Missing issue id" }, { status: 400 })

    const supabase = createAdminClient()

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
        ].join(", ")
      )
      .eq("id", id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const r: any = row

    // Try to load first linked department name
    let departmentName: string | null = null
    const { data: link } = await supabase
      .from("issue_departments")
      .select("department_id")
      .eq("issue_id", id)
      .limit(1)

    const depId = Array.isArray(link) && link.length > 0 ? link[0].department_id : null
    if (depId) {
      const { data: dep } = await supabase
        .from("departments")
        .select("name")
        .eq("id", depId as string)
        .maybeSingle()
      departmentName = dep?.name ?? null
    }

    const item = {
      id: r.id as string,
      ref_code: r.ref_code as string,
      title: r.title as string,
      description: r.description as string,
      category: r.category as string,
      priority: mapPriority(r.priority as string | null),
      status: mapStatus(r.status as string | null),
      location: r.location_text as string | null,
      assignedTo: r.assigned_to as string | null,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      resolvedAt: r.resolved_at as string | null,
      resolutionNotes: r.resolution_notes as string | null,
      reporterFullName: r.reporter_full_name as string | null,
      reporterEmail: r.reporter_email as string | null,
      reporterPhone: r.reporter_phone as string | null,
      departmentName,
    }

    return NextResponse.json({ item }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
