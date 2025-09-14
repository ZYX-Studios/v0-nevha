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
