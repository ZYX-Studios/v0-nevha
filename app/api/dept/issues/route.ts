import { NextResponse } from "next/server"
import { getDeptContext } from "@/lib/dept/auth"
import { createAdminClient } from "@/lib/supabase/server-admin"

function mapPriority(dbPriority: string | null): "P1" | "P2" | "P3" | "P4" {
  switch ((dbPriority || "").toUpperCase()) {
    case "P1":
      return "P1"
    case "P2":
      return "P2"
    case "P3":
      return "P3"
    case "P4":
      return "P4"
    default:
      return "P3"
  }
}

function mapStatus(dbStatus: string | null): "not_started" | "in_progress" | "on_hold" | "resolved" | "closed" {
  switch ((dbStatus || "").toUpperCase()) {
    case "NEW":
    case "TRIAGED":
      return "not_started"
    case "IN_PROGRESS":
      return "in_progress"
    case "NEEDS_INFO":
      return "on_hold"
    case "RESOLVED":
      return "resolved"
    case "CLOSED":
      return "closed"
    default:
      return "not_started"
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await getDeptContext()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = createAdminClient()
    const url = new URL(req.url)
    const statusParam = (url.searchParams.get("status") || "all").toLowerCase()

    const { data, error } = await supabase
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
          "location_text",
          "reporter_block",
          "reporter_lot",
          "reporter_phase",
          "reporter_street",
          "reporter_full_name",
          "reporter_email",
          "issue_departments!inner(department_id)",
        ].join(", ")
      )
      .eq("issue_departments.department_id", ctx.id)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    let items = (data || []).map((row: any) => ({
      id: row.id as string,
      ref_code: row.ref_code as string,
      title: row.title as string,
      description: row.description as string,
      category: row.category as string,
      priority: mapPriority(row.priority),
      status: mapStatus(row.status),
      location: row.location_text as string | null,
      reporterBlock: row.reporter_block as string | null,
      reporterLot: row.reporter_lot as string | null,
      reporterPhase: row.reporter_phase as string | null,
      reporterStreet: row.reporter_street as string | null,
      reporterFullName: row.reporter_full_name as string | null,
      reporterEmail: row.reporter_email as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }))

    if (statusParam !== "all") {
      items = items.filter((i) => i.status === statusParam)
    }

    return NextResponse.json({ items }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
