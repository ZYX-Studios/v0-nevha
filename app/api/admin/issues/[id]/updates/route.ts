import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server-admin"

const PostSchema = z.object({
  status: z.enum(["not_started", "in_progress", "on_hold", "resolved", "closed"]).optional(),
  notes: z.string().optional().nullable(),
  author_label: z.string().optional().nullable(),
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

function dbToUiStatus(db: string | null): "not_started" | "in_progress" | "on_hold" | "resolved" | "closed" {
  switch ((db || "").toUpperCase()) {
    case "IN_PROGRESS":
      return "in_progress"
    case "NEEDS_INFO":
      return "on_hold"
    case "RESOLVED":
      return "resolved"
    case "CLOSED":
      return "closed"
    case "NEW":
    case "TRIAGED":
    default:
      return "not_started"
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const issueId = params.id
    if (!issueId) return NextResponse.json({ error: "Missing issue id" }, { status: 400 })

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("issue_status_updates")
      .select("id, status, notes, author_label, created_at")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const items = (data || []).map((r: any) => ({
      id: r.id as string,
      status: dbToUiStatus(r.status as string | null),
      notes: (r.notes as string | null) ?? null,
      authorLabel: (r.author_label as string | null) ?? null,
      createdAt: r.created_at as string,
    }))

    return NextResponse.json({ items }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const issueId = params.id
    if (!issueId) return NextResponse.json({ error: "Missing issue id" }, { status: 400 })

    const json = await req.json().catch(() => ({}))
    const parsed = PostSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const supabase = createAdminClient()

    const uiStatus = (parsed.data.status as any) || "in_progress"
    const dbStatus = uiToDbStatus(uiStatus)
    // 1) Update current issue status
    const { error: updateErr } = await supabase.from("issues").update({ status: dbStatus }).eq("id", issueId)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

    // 2) Insert status update line
    const { error } = await supabase.from("issue_status_updates").insert({
      issue_id: issueId,
      status: dbStatus,
      notes: parsed.data.notes || null,
      author_label: parsed.data.author_label || "Admin",
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
