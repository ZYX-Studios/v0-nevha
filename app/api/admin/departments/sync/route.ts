import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { z } from "zod"

const SyncSchema = z.object({
  categories: z.array(z.string().min(1)).optional(),
})

const DEFAULT_CATEGORIES = [
  "Maintenance",
  "Peace and Order",
  "Sports",
  "Social Media",
  "Grievance",
  "Finance",
  "Membership",
  "Livelihood",
]

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient()
    let cats = DEFAULT_CATEGORIES
    try {
      const json = await req.json().catch(() => ({}))
      const parsed = SyncSchema.safeParse(json)
      if (parsed.success && parsed.data.categories && parsed.data.categories.length > 0) {
        cats = parsed.data.categories
      }
    } catch {}

    // Load existing departments once
    const { data: existing, error: selErr } = await supabase
      .from("departments")
      .select("id,name,email,is_active")

    if (selErr) return NextResponse.json({ error: selErr.message }, { status: 400 })

    const existingNames = new Set((existing || []).map((d: any) => String(d.name || "").toLowerCase()))

    const toInsert = cats
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
      .filter((c) => !existingNames.has(c.toLowerCase()))
      .map((name) => ({ name, email: null, is_active: true }))

    let inserted: any[] = []
    if (toInsert.length > 0) {
      const { data: ins, error: insErr } = await supabase
        .from("departments")
        .insert(toInsert)
        .select("id,name,email,is_active")
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })
      inserted = ins || []
    }

    return NextResponse.json({
      inserted,
      skipped: cats.length - toInsert.length,
      totalAfter: (existing?.length || 0) + toInsert.length,
    }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
