import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: "Missing department id" }, { status: 400 })

    const supabase = createAdminClient()

    // Remove links first to satisfy FK constraints
    const { error: linkErr } = await supabase.from("issue_departments").delete().eq("department_id", id)
    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 400 })

    const { error } = await supabase.from("departments").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
