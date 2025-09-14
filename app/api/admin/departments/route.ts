import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { z } from "zod"

const CreateDepartmentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  is_active: z.boolean().optional().default(true),
})

const UpdateDepartmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  is_active: z.boolean().optional(),
})

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

    const { data, error } = await supabase.from("departments").insert({
      name: v.name.trim(),
      email: v.email || null,
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
    if (typeof v.email !== "undefined") updates.email = v.email || null
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
