import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { z } from "zod"
import { requireAdminAPI } from "@/lib/supabase/guards"
const CreateHomeownerSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  propertyAddress: z.string().optional().nullable(),
  unitNumber: z.string().optional().nullable(),
  moveInDate: z.string().optional().nullable(),
  isOwner: z.boolean().optional().default(true),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // PRD-aligned optional details
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  middleInitial: z.string().optional().nullable(),
  suffix: z.string().optional().nullable(),
  phase: z.string().optional().nullable(),
  block: z.string().optional().nullable(),
  lot: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  facebookProfile: z.string().optional().nullable(),
  lengthOfResidency: z.coerce.number().optional().nullable(),
  datePaid: z.string().optional().nullable(),
  amountPaid: z.coerce.number().optional().nullable(),
})

export async function GET(req: Request) {
  const authError = await requireAdminAPI()
  if (authError) return authError

  try {
    const denied = await requireAdminAPI()
    if (denied) return denied
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") || "").trim()
    const owner = (searchParams.get("owner") || "all").toLowerCase() // all | owner | renter
    const phase = (searchParams.get("phase") || "").trim()
    const block = (searchParams.get("block") || "").trim()
    const lot = (searchParams.get("lot") || "").trim()
    const street = (searchParams.get("street") || "").trim()
    const moveInFrom = (searchParams.get("moveInFrom") || "").trim()
    const moveInTo = (searchParams.get("moveInTo") || "").trim()
    const hasEmailParam = searchParams.get("hasEmail")
    const hasEmail = hasEmailParam === "true" ? true : hasEmailParam === "false" ? false : undefined
    const hasPhoneParam = searchParams.get("hasPhone")
    const hasPhone = hasPhoneParam === "true" ? true : hasPhoneParam === "false" ? false : undefined
    // removed: paidFrom/paidTo, amountMin/amountMax
    const lengthMinRaw = searchParams.get("lengthMin")
    const lengthMaxRaw = searchParams.get("lengthMax")
    const lengthMin = lengthMinRaw != null && lengthMinRaw !== "" ? Number(lengthMinRaw) : undefined
    const lengthMax = lengthMaxRaw != null && lengthMaxRaw !== "" ? Number(lengthMaxRaw) : undefined
    const sortParam = (searchParams.get("sort") || "created_at").toLowerCase()
    const orderParam = (searchParams.get("order") || "desc").toLowerCase()
    const ascending = orderParam === "asc"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10) || 25))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("homeowners")
      .select("*", { count: "exact" })

    // Text search across common fields
    if (q) {
      const like = `%${q}%`
      query = query.or([
        `property_address.ilike.${like}`,
        `unit_number.ilike.${like}`,
        `notes.ilike.${like}`,
        `first_name.ilike.${like}`,
        `last_name.ilike.${like}`,
        `full_name.ilike.${like}`,
        `email.ilike.${like}`,
      ].join(",")) as typeof query
    }

    // Ownership filter
    if (owner === "owner") query = query.eq("is_owner", true) as typeof query
    if (owner === "renter") query = query.eq("is_owner", false) as typeof query

    // Attribute filters
    if (phase) query = query.ilike("phase", `%${phase}%`) as typeof query
    if (block) query = query.ilike("block", `%${block}%`) as typeof query
    if (lot) query = query.ilike("lot", `%${lot}%`) as typeof query
    if (street) query = query.ilike("street", `%${street}%`) as typeof query
    if (moveInFrom) query = query.gte("move_in_date", moveInFrom) as typeof query
    if (moveInTo) query = query.lte("move_in_date", moveInTo) as typeof query
    if (hasEmail === true) query = query.not("email", "is", null) as typeof query
    if (hasEmail === false) query = query.is("email", null) as typeof query
    if (hasPhone === true) query = query.not("contact_number", "is", null) as typeof query
    if (hasPhone === false) query = query.is("contact_number", null) as typeof query
    // Dynamic length filtering via residency_start_date boundaries
    if (typeof lengthMin === "number" && !Number.isNaN(lengthMin)) {
      const d = new Date()
      d.setFullYear(d.getFullYear() - lengthMin)
      const iso = d.toISOString().slice(0, 10)
      // length >= min  => start_date <= today - min years
      query = query.lte("residency_start_date", iso) as typeof query
    }
    if (typeof lengthMax === "number" && !Number.isNaN(lengthMax)) {
      const d = new Date()
      d.setFullYear(d.getFullYear() - lengthMax)
      const iso = d.toISOString().slice(0, 10)
      // length <= max  => start_date >= today - max years
      query = query.gte("residency_start_date", iso) as typeof query
    }

    // Sorting
    switch (sortParam) {
      case "name":
        query = query.order("first_name", { ascending }) as typeof query
        query = query.order("last_name", { ascending }) as typeof query
        break
      case "address":
        query = query.order("property_address", { ascending }) as typeof query
        break
      case "move_in_date":
        query = query.order("move_in_date", { ascending }) as typeof query
        break
      case "created_at":
      default:
        query = query.order("created_at", { ascending }) as typeof query
        break
    }

    // Pagination
    query = query.range(from, to) as typeof query

    const { data, error, count } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const items = (data || []).map((row: any) => {
      // Compute dynamic years from residency_start_date if present
      let dynYears: number | null = null
      if (row.residency_start_date) {
        const start = new Date(row.residency_start_date as string)
        const now = new Date()
        let years = now.getFullYear() - start.getFullYear()
        const hadAnniversary = (now.getMonth() > start.getMonth()) || (now.getMonth() === start.getMonth() && now.getDate() >= start.getDate())
        if (!hadAnniversary) years -= 1
        dynYears = Math.max(0, years)
      }
      return {
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
        suffix: row.suffix as string | null,
        fullName: row.full_name as string | null,
        email: row.email as string | null,
        contactNumber: row.contact_number as string | null,
        residencyStartDate: row.residency_start_date as string | null,
        lengthOfResidency: dynYears ?? ((row.length_of_residency as number | null) ?? null),
        datePaid: row.date_paid as string | null,
        amountPaid: (row.amount_paid as number | null) ?? null,
        phase: row.phase as string | null,
        block: row.block as string | null,
        lot: row.lot as string | null,
        street: row.street as string | null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      }
    })

    return NextResponse.json({ items, page, pageSize, total: count ?? 0 }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const authError = await requireAdminAPI()
  if (authError) return authError

  try {
    const denied = await requireAdminAPI()
    if (denied) return denied
    const supabase = createAdminClient()
    const json = await req.json()
    const parsed = CreateHomeownerSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const v = parsed.data

    // Compose property address if not explicitly provided
    // Sanitize NA-like street values
    const naLike = (s?: string | null) => {
      if (!s) return false
      const t = s.trim().toLowerCase()
      return t === 'na' || t === 'n/a' || t === 'n.a.' || t === '-' || t === 'none'
    }
    const sanitizedStreet = v.street && !naLike(v.street) ? v.street.trim() : null

    const composedParts: string[] = []
    if (v.block && v.block.trim()) composedParts.push(`Block ${v.block.trim()}`)
    if (v.lot && v.lot.trim()) composedParts.push(`Lot ${v.lot.trim()}`)
    if (v.phase && v.phase.trim()) composedParts.push(`Phase ${v.phase.trim()}`)
    if (sanitizedStreet) composedParts.push(sanitizedStreet)
    const computedAddress = (v.propertyAddress?.trim() || "") || composedParts.join(", ")
    if (!computedAddress) {
      return NextResponse.json({ error: "Address required. Provide phase/block/lot/street." }, { status: 400 })
    }

    // Determine residency_start_date from moveInDate or lengthOfResidency
    let residencyStartDate: string | null = null
    if (v.moveInDate && String(v.moveInDate).trim()) {
      residencyStartDate = String(v.moveInDate).slice(0, 10)
    } else if (typeof v.lengthOfResidency === 'number' && !Number.isNaN(v.lengthOfResidency)) {
      const d = new Date()
      d.setFullYear(d.getFullYear() - v.lengthOfResidency)
      residencyStartDate = d.toISOString().slice(0, 10)
    }

    // Compose full_name if possible
    const first = (v.firstName || '').trim()
    const last = (v.lastName || '').trim()
    const rawSuffix = (v.suffix || '').trim()
    const baseName = [first, last].filter(Boolean).join(' ')
    const fullName = baseName ? [baseName, rawSuffix].filter(Boolean).join(' ') : null

    const { error } = await supabase.from("homeowners").insert({
      user_id: v.userId || null,
      property_address: computedAddress,
      unit_number: v.unitNumber || null,
      move_in_date: v.moveInDate || null,
      is_owner: v.isOwner ?? true,
      emergency_contact_name: v.emergencyContactName || null,
      emergency_contact_phone: v.emergencyContactPhone || null,
      notes: v.notes || null,
      first_name: v.firstName || null,
      last_name: v.lastName || null,
      middle_initial: v.middleInitial || null,
      suffix: v.suffix || null,
      full_name: fullName,
      phase: v.phase || null,
      block: v.block || null,
      lot: v.lot || null,
      street: sanitizedStreet,
      contact_number: v.contactNumber || null,
      email: v.email || null,
      facebook_profile: v.facebookProfile || null,
      length_of_residency: v.lengthOfResidency ?? null,
      date_paid: v.datePaid || null,
      amount_paid: v.amountPaid ?? null,
      residency_start_date: residencyStartDate,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
