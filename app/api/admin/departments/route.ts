import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { z } from "zod"

const CreateDepartmentSchema = z.object({
  name: z.string().min(1),
  // Accept a raw string (may contain comma/semicolon-separated emails) or null
  email: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
})

const UpdateDepartmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  // Accept a raw string (may contain comma/semicolon-separated emails) or null
  email: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmailList(raw: string | null | undefined) {
  if (!raw) return { cleaned: null, invalid: [] as string[] }
  const parts = String(raw)
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 0) return { cleaned: null, invalid: [] as string[] }
  const invalid = parts.filter((e) => !emailRegex.test(e))
  const cleaned = Array.from(new Set(parts)).join(", ")
  return { cleaned, invalid }
}

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("departments")
      .select("id,name,email,is_active,created_at,updated_at")
      .order("name", { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ items: data ?? [] }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient()
    const json = await req.json()
    const parsed = CreateDepartmentSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const v = parsed.data
    const { cleaned, invalid } = normalizeEmailList(v.email ?? null)
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Invalid email(s): ${invalid.join(", ")}` }, { status: 400 })
    }

    const { data, error } = await supabase.from("departments").insert({
      name: v.name.trim(),
      email: cleaned,
      is_active: v.is_active ?? true,
    }).select("id,name,email,is_active,created_at,updated_at").single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ item: data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createAdminClient()
    const json = await req.json()
    const parsed = UpdateDepartmentSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const v = parsed.data

    const updates: any = {}
    if (typeof v.name !== "undefined") updates.name = v.name.trim()
    if (typeof v.email !== "undefined") {
      const { cleaned, invalid } = normalizeEmailList(v.email ?? null)
      if (invalid.length > 0) {
        return NextResponse.json({ error: `Invalid email(s): ${invalid.join(", ")}` }, { status: 400 })
      }
      updates.email = cleaned
    }
    if (typeof v.is_active !== "undefined") updates.is_active = !!v.is_active

    const { data, error } = await supabase
      .from("departments")
      .update(updates)
      .eq("id", v.id)
      .select("id,name,email,is_active,created_at,updated_at")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ item: data }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
