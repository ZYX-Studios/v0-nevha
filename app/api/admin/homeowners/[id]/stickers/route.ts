import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { z } from "zod"

const UpsertStickerSchema = z.object({
  code: z.string().min(1),
  vehiclePlateNo: z.string().optional().nullable(),
  vehicleMake: z.string().optional().nullable(),
  vehicleModel: z.string().optional().nullable(),
  vehicleCategory: z.string().optional().nullable(),
  issuedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  amountPaid: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "EXPIRED", "REVOKED"]).optional().nullable(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const homeownerId = params.id

    // Try PRD stickers table first
    const res1 = await supabase
      .from("stickers")
      .select("id, homeowner_id, vehicle_id, code, status, issued_at, expires_at, amount_paid, notes, vehicles:vehicles(plate_no, make, model, color, category)")
      .eq("homeowner_id", homeownerId)
      .order("issued_at", { ascending: false })

    if (res1.error) {
      // Try minimal PRD query without order in case of column-specific errors
      const resAlt = await supabase
        .from("stickers")
        .select("id, homeowner_id, vehicle_id, code, status, issued_at, expires_at, amount_paid, notes")
        .eq("homeowner_id", homeownerId)
      if (!resAlt.error) {
        const items = (resAlt.data || []).map((row: any) => ({
          id: row.id as string,
          homeownerId: row.homeowner_id as string,
          vehicleId: row.vehicle_id as string | null,
          code: row.code as string,
          status: row.status as "ACTIVE" | "EXPIRED" | "REVOKED",
          issuedAt: row.issued_at as string,
          expiresAt: row.expires_at as string | null,
          amountPaid: (row.amount_paid as number | null) ?? null,
          notes: row.notes as string | null,
        }))
        return NextResponse.json({ items }, { status: 200 })
      }
      const msg = String(resAlt.error?.message || res1.error.message || "")
      // Fallback to legacy car_stickers if PRD stickers doesn't exist in this environment or has incompatible schema
      if (/relation .*stickers.* does not exist/i.test(msg) || /table .*stickers.* does not exist/i.test(msg) || /column .*created_at.* does not exist/i.test(msg)) {
        const res2 = await supabase
          .from("car_stickers")
          .select("*")
          .eq("homeowner_id", homeownerId)
          .order("issue_date", { ascending: false })
        if (res2.error) return NextResponse.json({ error: res2.error.message }, { status: 400 })

        const items = (res2.data || []).map((row: any) => ({
          id: row.id as string,
          homeownerId: row.homeowner_id as string,
          vehicleId: null as string | null,
          code: row.sticker_number as string,
          status: (row.is_active ? "ACTIVE" : "EXPIRED") as "ACTIVE" | "EXPIRED" | "REVOKED",
          issuedAt: row.issue_date as string,
          expiresAt: row.expiry_date as string | null,
          vehiclePlateNo: row.license_plate as string | undefined,
          vehicleMake: row.vehicle_make as string | undefined,
          vehicleModel: row.vehicle_model as string | undefined,
          vehicleColor: row.vehicle_color as string | undefined,
        }))
        return NextResponse.json({ items }, { status: 200 })
      }
      return NextResponse.json({ error: resAlt.error?.message || res1.error.message }, { status: 400 })
    }

    const items = (res1.data || []).map((row: any) => ({
      id: row.id as string,
      homeownerId: row.homeowner_id as string,
      vehicleId: row.vehicle_id as string | null,
      code: row.code as string,
      status: row.status as "ACTIVE" | "EXPIRED" | "REVOKED",
      issuedAt: row.issued_at as string,
      expiresAt: row.expires_at as string | null,
      amountPaid: (row.amount_paid as number | null) ?? null,
      notes: row.notes as string | null,
      vehiclePlateNo: row.vehicles?.plate_no as string | undefined,
      vehicleMake: row.vehicles?.make as string | undefined,
      vehicleModel: row.vehicles?.model as string | undefined,
      vehicleColor: row.vehicles?.color as string | undefined,
      vehicleCategory: row.vehicles?.category as string | undefined,
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
          make: (v.vehicleMake || null) as any,
          model: (v.vehicleModel || null) as any,
          category: (v.vehicleCategory || null) as any,
        }, { onConflict: "plate_no" })
        .select("id")
        .maybeSingle()
      if (vehErr) return NextResponse.json({ error: vehErr.message }, { status: 400 })
      vehicleId = veh?.id || null
    }

    const res1 = await supabase
      .from("stickers")
      .upsert({
        code: v.code.trim(),
        homeowner_id: homeownerId,
        vehicle_id: vehicleId,
        issued_at: v.issuedAt || null,
        expires_at: v.expiresAt || null,
        amount_paid: (typeof v.amountPaid === 'number' ? v.amountPaid : null) as any,
        notes: v.notes || null,
        status: (v.status as any) || "ACTIVE",
      }, { onConflict: "code" })
      .select("id")
      .maybeSingle()

    if (res1.error) {
      const msg = String(res1.error.message || "")
      if (/relation .*stickers.* does not exist/i.test(msg) || /table .*stickers.* does not exist/i.test(msg)) {
        // Fallback to legacy car_stickers
        const isActive = (v.status ?? "ACTIVE") === "ACTIVE"
        const res2 = await supabase
          .from("car_stickers")
          .upsert({
            homeowner_id: homeownerId,
            sticker_number: v.code.trim(),
            license_plate: v.vehiclePlateNo || null,
            issue_date: v.issuedAt || null,
            expiry_date: v.expiresAt || null,
            is_active: isActive,
          }, { onConflict: "sticker_number" })
          .select("id")
          .maybeSingle()
        if (res2.error) return NextResponse.json({ error: res2.error.message }, { status: 400 })
        return NextResponse.json({ id: res2.data?.id }, { status: 201 })
      }
      return NextResponse.json({ error: res1.error.message }, { status: 400 })
    }

    return NextResponse.json({ id: res1.data?.id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
