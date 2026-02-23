import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { z } from "zod"
import { requireAdminAPI } from "@/lib/supabase/guards"

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
  const authError = await requireAdminAPI()
  if (authError) return authError
  try {
    const supabase = createAdminClient()
    const homeownerId = params.id

    const res1 = await supabase
      .from("stickers")
      .select("id, homeowner_id, vehicle_id, code, status, issued_at, expires_at, amount_paid, notes, vehicles:vehicles(plate_no, make, model, color, category)")
      .eq("homeowner_id", homeownerId)
      .order("issued_at", { ascending: false })

    if (res1.error) {
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
      return NextResponse.json({ error: resAlt.error?.message || res1.error.message }, { status: 400 })
    }

    const items = (res1.data || []).map((row: any) => {
      // Compute effective status (same logic as global stickers API)
      let effectiveStatus = row.status
      if (row.status === "ACTIVE" && row.expires_at) {
        const exp = new Date(row.expires_at)
        if (!isNaN(exp.getTime()) && exp < new Date()) {
          effectiveStatus = "EXPIRED"
        }
      }

      // Derive sticker year from expires_at (sticker expiring Feb 2026 = "2025" sticker)
      let stickerYear: string | null = null
      if (row.expires_at) {
        const exp = new Date(row.expires_at)
        if (!isNaN(exp.getTime())) {
          stickerYear = String(exp.getFullYear() - 1)
        }
      } else if (row.issued_at) {
        const iss = new Date(row.issued_at)
        if (!isNaN(iss.getTime())) {
          stickerYear = String(iss.getFullYear())
        }
      }

      return {
        id: row.id as string,
        homeownerId: row.homeowner_id as string,
        vehicleId: row.vehicle_id as string | null,
        code: row.code as string,
        status: row.status as "ACTIVE" | "EXPIRED" | "REVOKED",
        effectiveStatus: effectiveStatus as "ACTIVE" | "EXPIRED" | "REVOKED",
        stickerYear,
        issuedAt: row.issued_at as string,
        expiresAt: row.expires_at as string | null,
        amountPaid: (row.amount_paid as number | null) ?? null,
        notes: row.notes as string | null,
        vehiclePlateNo: row.vehicles?.plate_no as string | undefined,
        vehicleMake: row.vehicles?.make as string | undefined,
        vehicleModel: row.vehicles?.model as string | undefined,
        vehicleColor: row.vehicles?.color as string | undefined,
        vehicleCategory: row.vehicles?.category as string | undefined,
      }
    })

    return NextResponse.json({ items }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const authError = await requireAdminAPI()
  if (authError) return authError
  try {
    const supabase = createAdminClient()
    const homeownerId = params.id
    const json = await req.json()
    const parsed = UpsertStickerSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const v = parsed.data

    let vehicleId: string | null = null
    if (v.vehiclePlateNo?.trim()) {
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

    // Auto-compute expires_at: Feb 1 of (issued_year + 1) if not provided
    let computedExpiresAt = v.expiresAt || null
    if (!computedExpiresAt) {
      const issuedDate = v.issuedAt ? new Date(v.issuedAt) : new Date()
      const issuedYear = issuedDate.getFullYear()
      computedExpiresAt = `${issuedYear + 1}-02-01T00:00:00Z`
    }

    const { data, error } = await supabase
      .from("stickers")
      .upsert({
        code: v.code.trim(),
        homeowner_id: homeownerId,
        vehicle_id: vehicleId,
        issued_at: v.issuedAt || new Date().toISOString(),
        expires_at: computedExpiresAt,
        amount_paid: (typeof v.amountPaid === "number" ? v.amountPaid : null) as any,
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

const PatchStickerSchema = z.object({
  stickerId: z.string().min(1),
  code: z.string().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "REVOKED"]).optional(),
  amountPaid: z.number().optional().nullable(),
  issuedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  vehiclePlateNo: z.string().optional().nullable(),
  vehicleMake: z.string().optional().nullable(),
  vehicleModel: z.string().optional().nullable(),
  vehicleCategory: z.string().optional().nullable(),
  vehicleColor: z.string().optional().nullable(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const authError = await requireAdminAPI()
  if (authError) return authError
  try {
    const supabase = createAdminClient()
    const homeownerId = params.id
    const json = await req.json()
    const parsed = PatchStickerSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const v = parsed.data

    // Verify sticker belongs to this homeowner
    const { data: existing } = await supabase
      .from("stickers")
      .select("id, vehicle_id")
      .eq("id", v.stickerId)
      .eq("homeowner_id", homeownerId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Sticker not found" }, { status: 404 })
    }

    // Optionally update/create vehicle
    let vehicleId: string | null | undefined = undefined // undefined = don't change
    if (v.vehiclePlateNo !== undefined) {
      if (v.vehiclePlateNo?.trim()) {
        const { data: veh, error: vehErr } = await supabase
          .from("vehicles")
          .upsert({
            homeowner_id: homeownerId,
            plate_no: v.vehiclePlateNo.trim(),
            make: (v.vehicleMake || null) as any,
            model: (v.vehicleModel || null) as any,
            category: (v.vehicleCategory || null) as any,
            color: (v.vehicleColor || null) as any,
          }, { onConflict: "plate_no" })
          .select("id")
          .maybeSingle()
        if (vehErr) return NextResponse.json({ error: vehErr.message }, { status: 400 })
        vehicleId = veh?.id || null
      } else {
        vehicleId = null // unlink vehicle
      }
    }

    // Build update payload
    const update: Record<string, any> = {}
    if (v.code !== undefined) update.code = v.code.trim()
    if (v.status !== undefined) update.status = v.status
    if (v.amountPaid !== undefined) update.amount_paid = v.amountPaid
    if (v.issuedAt !== undefined) update.issued_at = v.issuedAt
    if (v.expiresAt !== undefined) update.expires_at = v.expiresAt
    if (v.notes !== undefined) update.notes = v.notes
    if (vehicleId !== undefined) update.vehicle_id = vehicleId

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const { error } = await supabase
      .from("stickers")
      .update(update)
      .eq("id", v.stickerId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
