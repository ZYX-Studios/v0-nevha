import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: "Missing issue id" }, { status: 400 })

    const supabase = createAdminClient()
    console.info("[IssueActivity] Fetch", { id })
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, action, diff_json, created_at")
      .eq("entity", "issue")
      .eq("entity_id", id)
      .order("created_at", { ascending: true })

    if (error) {
      console.warn("[IssueActivity] Query error", { id, error: error.message })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const items = (data || []).map((r: any) => ({
      id: r.id as string,
      action: r.action as string,
      createdAt: r.created_at as string,
      diff: r.diff_json as Record<string, any> | null,
    }))

    console.info("[IssueActivity] Result", { id, count: items.length })

    return NextResponse.json({ items }, { status: 200 })
  } catch (e: any) {
    console.error("[IssueActivity] Server error", { message: e?.message })
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
