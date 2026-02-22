import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAdminAPI } from "@/lib/supabase/guards"
export async function GET(req: Request) {
  const authError = await requireAdminAPI()
  if (authError) return authError

  try {
    const denied = await requireAdminAPI()
    if (denied) return denied
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const raw = (searchParams.get("plate") || "").trim()

    if (!raw) return NextResponse.json({ error: "Missing plate query parameter" }, { status: 400 })

    // Normalize a bit (trim spaces); use ILIKE for case-insensitive contains match
    const plate = raw.replace(/\s+/g, " ")

    const { data: vehicles, error: vErr } = await supabase
      .from("vehicles")
      .select("id, homeowner_id, plate_no, make, model, color")
      .ilike("plate_no", `%${plate}%`)
      .order("created_at", { ascending: false })
      .limit(1)

    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 400 })

    const vehicle = Array.isArray(vehicles) && vehicles.length > 0 ? vehicles[0] : null
    if (!vehicle) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    let homeowner: any = null
    if (vehicle.homeowner_id) {
      const { data: h, error: hErr } = await supabase
        .from("homeowners")
        .select("id, full_name, property_address, contact_number, email, phase, block, lot, street")
        .eq("id", vehicle.homeowner_id as string)
        .maybeSingle()

      if (hErr) return NextResponse.json({ error: hErr.message }, { status: 400 })

      homeowner = h
    }

    const payload = {
      vehicle: {
        id: vehicle.id as string,
        plateNo: vehicle.plate_no as string,
        make: (vehicle.make as string | null) ?? null,
        model: (vehicle.model as string | null) ?? null,
        color: (vehicle.color as string | null) ?? null,
      },
      homeowner: homeowner
        ? {
            id: homeowner.id as string,
            fullName: homeowner.full_name as string | null,
            propertyAddress: homeowner.property_address as string | null,
            contactNumber: homeowner.contact_number as string | null,
            email: homeowner.email as string | null,
            phase: homeowner.phase as string | null,
            block: homeowner.block as string | null,
            lot: homeowner.lot as string | null,
            street: homeowner.street as string | null,
          }
        : null,
    }

    return NextResponse.json(payload, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
