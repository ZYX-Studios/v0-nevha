import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const id = params.id

    const { data, error } = await supabase
      .from("homeowners")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Compute dynamic residency years if residency_start_date is present
    let dynYears: number | null = null
    if (data.residency_start_date) {
      const start = new Date(data.residency_start_date as string)
      const now = new Date()
      let years = now.getFullYear() - start.getFullYear()
      const hadAnniversary = (now.getMonth() > start.getMonth()) || (now.getMonth() === start.getMonth() && now.getDate() >= start.getDate())
      if (!hadAnniversary) years -= 1
      dynYears = Math.max(0, years)
    }

    const item = {
      id: data.id as string,
      userId: data.user_id as string | null,
      propertyAddress: data.property_address as string,
      unitNumber: data.unit_number as string | null,
      moveInDate: data.move_in_date as string | null,
      isOwner: Boolean(data.is_owner),
      emergencyContactName: data.emergency_contact_name as string | null,
      emergencyContactPhone: data.emergency_contact_phone as string | null,
      notes: data.notes as string | null,
      // enriched fields
      firstName: data.first_name as string | null,
      lastName: data.last_name as string | null,
      middleInitial: data.middle_initial as string | null,
      suffix: data.suffix as string | null,
      fullName: data.full_name as string | null,
      residencyStartDate: data.residency_start_date as string | null,
      block: data.block as string | null,
      lot: data.lot as string | null,
      phase: data.phase as string | null,
      street: data.street as string | null,
      contactNumber: data.contact_number as string | null,
      lengthOfResidency: dynYears ?? (data.length_of_residency as number | null),
      email: data.email as string | null,
      facebookProfile: data.facebook_profile as string | null,
      datePaid: data.date_paid as string | null,
      amountPaid: data.amount_paid as number | null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    }

    return NextResponse.json({ item }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const id = params.id
    const body = await req.json()

    // Map frontend fields to DB columns
    const updates: any = {}
    if (body.firstName !== undefined) updates.first_name = body.firstName
    if (body.lastName !== undefined) updates.last_name = body.lastName
    if (body.middleInitial !== undefined) updates.middle_initial = body.middleInitial
    if (body.suffix !== undefined) updates.suffix = body.suffix

    if (body.block !== undefined) updates.block = body.block
    if (body.lot !== undefined) updates.lot = body.lot
    if (body.phase !== undefined) updates.phase = body.phase
    if (body.street !== undefined) updates.street = body.street
    if (body.unitNumber !== undefined) updates.unit_number = body.unitNumber

    if (body.contactNumber !== undefined) updates.contact_number = body.contactNumber
    if (body.email !== undefined) updates.email = body.email
    if (body.facebookProfile !== undefined) updates.facebook_profile = body.facebookProfile
    if (body.isOwner !== undefined) updates.is_owner = body.isOwner

    if (body.moveInDate !== undefined) updates.move_in_date = body.moveInDate
    if (body.residencyStartDate !== undefined) updates.residency_start_date = body.residencyStartDate
    if (body.lengthOfResidency !== undefined) {
      if (body.lengthOfResidency === "") {
        updates.length_of_residency = null
      } else {
        updates.length_of_residency = Number(body.lengthOfResidency)
      }
    }

    if (body.emergencyContactName !== undefined) updates.emergency_contact_name = body.emergencyContactName
    if (body.emergencyContactPhone !== undefined) updates.emergency_contact_phone = body.emergencyContactPhone
    if (body.notes !== undefined) updates.notes = body.notes

    updates.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from("homeowners")
      .update(updates)
      .eq("id", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
