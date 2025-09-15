import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server-admin"
import bcrypt from "bcryptjs"

const BodySchema = z.object({
  new_password: z.string().min(8, "Password must be at least 8 characters"),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: "Missing department id" }, { status: 400 })

    const json = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const supabase = createAdminClient()
    // Ensure department exists and is active
    const { data: dep, error: depErr } = await supabase
      .from("departments")
      .select("id,name,is_active")
      .eq("id", id)
      .maybeSingle()
    if (depErr) return NextResponse.json({ error: depErr.message }, { status: 400 })
    if (!dep) return NextResponse.json({ error: "Department not found" }, { status: 404 })

    const hash = bcrypt.hashSync(parsed.data.new_password, 10)

    const { error: updErr } = await supabase
      .from("departments")
      .update({ portal_password_hash: hash, portal_password_updated_at: new Date().toISOString() })
      .eq("id", id)

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
