import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAdminAPI } from "@/lib/supabase/guards"

const LinkSchema = z.object({
  issue_id: z.string().uuid().optional(),
  ref_code: z.string().min(1).optional(),
}).refine((v) => !!v.issue_id || !!v.ref_code, {
  message: "Provide issue_id or ref_code",
  path: ["issue_id"],
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const authError = await requireAdminAPI()
  if (authError) return authError
  try {
    const depId = params.id
    if (!depId) return NextResponse.json({ error: "Missing department id" }, { status: 400 })

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("issues")
      .select(["id", "ref_code", "title", "status", "priority", "category", "created_at", "issue_departments!inner(department_id)"].join(", "))
      .eq("issue_departments.department_id", depId)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const items = (data || []).map((r: any) => ({
      id: r.id as string,
      ref_code: r.ref_code as string,
      title: r.title as string,
      status: (r.status as string) || null,
      priority: (r.priority as string) || null,
      category: (r.category as string) || null,
      createdAt: r.created_at as string,
    }))

    return NextResponse.json({ items }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const authError = await requireAdminAPI()
  if (authError) return authError
  try {
    const depId = params.id
    if (!depId) return NextResponse.json({ error: "Missing department id" }, { status: 400 })

    const json = await req.json().catch(() => ({}))
    const parsed = LinkSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const supabase = createAdminClient()

    let issueId = parsed.data.issue_id as string | undefined
    if (!issueId && parsed.data.ref_code) {
      const { data: issueRow, error: issueErr } = await supabase
        .from("issues").select("id").eq("ref_code", parsed.data.ref_code).maybeSingle()
      if (issueErr) return NextResponse.json({ error: issueErr.message }, { status: 400 })
      if (!issueRow) return NextResponse.json({ error: "Issue not found for ref_code" }, { status: 404 })
      issueId = issueRow.id as string
    }
    if (!issueId) return NextResponse.json({ error: "Missing issue_id" }, { status: 400 })

    const { error } = await supabase
      .from("issue_departments")
      .upsert({ issue_id: issueId, department_id: depId }, { onConflict: "issue_id,department_id" })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const authError = await requireAdminAPI()
  if (authError) return authError
  try {
    const depId = params.id
    if (!depId) return NextResponse.json({ error: "Missing department id" }, { status: 400 })

    const url = new URL(req.url)
    const issueId = url.searchParams.get("issue_id")
    const ref = url.searchParams.get("ref_code")

    const supabase = createAdminClient()

    let resolvedIssueId = issueId || ""
    if (!resolvedIssueId && ref) {
      const { data: issueRow, error: issueErr } = await supabase
        .from("issues").select("id").eq("ref_code", ref).maybeSingle()
      if (issueErr) return NextResponse.json({ error: issueErr.message }, { status: 400 })
      if (!issueRow) return NextResponse.json({ error: "Issue not found for ref_code" }, { status: 404 })
      resolvedIssueId = issueRow.id as string
    }
    if (!resolvedIssueId) return NextResponse.json({ error: "Missing issue_id or ref_code" }, { status: 400 })

    const { error } = await supabase
      .from("issue_departments")
      .delete()
      .match({ issue_id: resolvedIssueId, department_id: depId })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
