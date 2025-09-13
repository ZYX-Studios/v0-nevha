import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { z } from "zod"

const CreateHomeownerSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  propertyAddress: z.string().min(1),
  unitNumber: z.string().optional().nullable(),
  moveInDate: z.string().optional().nullable(),
  isOwner: z.boolean().optional().default(true),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") || "").trim()

    let query = supabase.from("homeowners").select("*").order("created_at", { ascending: false })

    if (q) {
      // OR filter across address, unit, and notes
      const like = `%${q}%`
      query = query.or(
        `property_address.ilike.${like},unit_number.ilike.${like},notes.ilike.${like},first_name.ilike.${like},last_name.ilike.${like}`,
      ) as typeof query
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const items = (data || []).map((row: any) => ({
      id: row.id as string,
      userId: row.user_id as string | null,
      propertyAddress: row.property_address as string,
      unitNumber: row.unit_number as string | null,
      moveInDate: row.move_in_date as string | null,
      isOwner: Boolean(row.is_owner),
      emergencyContactName: row.emergency_contact_name as string | null,
      emergencyContactPhone: row.emergency_contact_phone as string | null,
      notes: row.notes as string | null,
      firstName: row.first_name as string | null,
      lastName: row.last_name as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }))

    return NextResponse.json({ items }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient()
    const json = await req.json()
    const parsed = CreateHomeownerSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const v = parsed.data

    const { error } = await supabase.from("homeowners").insert({
      user_id: v.userId || null,
      property_address: v.propertyAddress,
      unit_number: v.unitNumber || null,
      move_in_date: v.moveInDate || null,
      is_owner: v.isOwner ?? true,
      emergency_contact_name: v.emergencyContactName || null,
      emergency_contact_phone: v.emergencyContactPhone || null,
      notes: v.notes || null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
