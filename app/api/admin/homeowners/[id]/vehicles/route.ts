import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { z } from "zod"

const UpsertVehicleSchema = z.object({
  plateNo: z.string().min(1),
  make: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const homeownerId = params.id

    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("homeowner_id", homeownerId)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const items = (data || []).map((row: any) => ({
      id: row.id as string,
      homeownerId: row.homeowner_id as string,
      plateNo: row.plate_no as string,
      make: row.make as string | undefined,
      model: row.model as string | undefined,
      color: row.color as string | undefined,
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
    const parsed = UpsertVehicleSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const v = parsed.data

    const { data, error } = await supabase
      .from("vehicles")
      .upsert({
        homeowner_id: homeownerId,
        plate_no: v.plateNo,
        make: v.make || null,
        model: v.model || null,
        color: v.color || null,
      }, { onConflict: "plate_no" })
      .select("id")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ id: data?.id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
