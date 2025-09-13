import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { z } from "zod"

const UpsertStickerSchema = z.object({
  code: z.string().min(1),
  vehiclePlateNo: z.string().optional().nullable(),
  issuedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "EXPIRED", "REVOKED"]).optional().nullable(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const homeownerId = params.id

    const { data, error } = await supabase
      .from("stickers")
      .select("*")
      .eq("homeowner_id", homeownerId)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const items = (data || []).map((row: any) => ({
      id: row.id as string,
      homeownerId: row.homeowner_id as string,
      vehicleId: row.vehicle_id as string | null,
      code: row.code as string,
      status: row.status as "ACTIVE" | "EXPIRED" | "REVOKED",
      issuedAt: row.issued_at as string,
      expiresAt: row.expires_at as string | null,
      notes: row.notes as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
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
    const parsed = UpsertStickerSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const v = parsed.data

    // Optionally upsert/get vehicle by plate
    let vehicleId: string | null = null
    if (v.vehiclePlateNo && v.vehiclePlateNo.trim()) {
      const { data: veh, error: vehErr } = await supabase
        .from("vehicles")
        .upsert({
          homeowner_id: homeownerId,
          plate_no: v.vehiclePlateNo.trim(),
        }, { onConflict: "plate_no" })
        .select("id")
        .maybeSingle()
      if (vehErr) return NextResponse.json({ error: vehErr.message }, { status: 400 })
      vehicleId = veh?.id || null
    }

    const { data, error } = await supabase
      .from("stickers")
      .upsert({
        code: v.code.trim(),
        homeowner_id: homeownerId,
        vehicle_id: vehicleId,
        issued_at: v.issuedAt || null,
        expires_at: v.expiresAt || null,
        notes: v.notes || null,
        status: (v.status as any) || "ACTIVE",
      }, { onConflict: "code" })
      .select("id")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ id: data?.id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
