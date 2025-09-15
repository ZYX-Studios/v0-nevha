import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { createAdminClient } from "@/lib/supabase/server-admin"

const BodySchema = z.object({
  new_password: z.string().min(8, "Password must be at least 8 characters"),
  scope: z.enum(["all", "active"]).optional().default("all"),
})

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const supabase = createAdminClient()

    let targetIds: string[] = []
    if (parsed.data.scope === "active") {
      const { data, error } = await supabase.from("departments").select("id").eq("is_active", true)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      targetIds = (data || []).map((d: any) => d.id as string)
    } else {
      const { data, error } = await supabase.from("departments").select("id")
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      targetIds = (data || []).map((d: any) => d.id as string)
    }

    if (targetIds.length === 0) return NextResponse.json({ updated: 0 }, { status: 200 })

    const hash = bcrypt.hashSync(parsed.data.new_password, 10)

    const { error: updErr } = await supabase
      .from("departments")
      .update({ portal_password_hash: hash, portal_password_updated_at: new Date().toISOString() })
      .in("id", targetIds)

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

    return NextResponse.json({ updated: targetIds.length, scope: parsed.data.scope }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
