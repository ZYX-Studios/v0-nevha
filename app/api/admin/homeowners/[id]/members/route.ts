import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { z } from "zod"

const CreateMemberSchema = z.object({
  fullName: z.string().min(1),
  relation: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const homeownerId = params.id

    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("homeowner_id", homeownerId)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const items = (data || []).map((row: any) => ({
      id: row.id as string,
      homeownerId: row.homeowner_id as string,
      fullName: row.full_name as string,
      relation: row.relation as string | undefined,
      phone: row.phone as string | undefined,
      email: row.email as string | undefined,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at as string,
    }))

    return NextResponse.json({ items }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const homeownerId = params.id
    const json = await req.json()
    const parsed = CreateMemberSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const v = parsed.data

    const { error } = await supabase.from("members").insert({
      homeowner_id: homeownerId,
      full_name: v.fullName,
      relation: v.relation || null,
      phone: v.phone || null,
      email: v.email || null,
      is_active: true,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
