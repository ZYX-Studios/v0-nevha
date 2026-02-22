import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAuthAPI } from "@/lib/supabase/guards"
import { z } from "zod"

/** Freely-editable homeowner fields — no admin approval required */
const PatchSchema = z.object({
    contact_number: z.string().max(30).optional(),
    facebook_profile: z.string().url().optional().or(z.literal("")),
}).strict()

/**
 * GET /api/profile
 * Returns the authenticated user's homeowner record.
 * Also accessible via /api/profile/me (aliased in Next.js rewrite if needed).
 */
export async function GET(_req: NextRequest) {
    const authError = await requireAuthAPI()
    if (authError) return authError

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: homeowner, error } = await adminClient
        .from("homeowners")
        .select("id, first_name, last_name, email, contact_number, phase, block, lot, property_address, profile_photo_url")
        .eq("user_id", user.id)
        .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!homeowner) {
        // Fall back to the users table for basic identity (admin/staff/unapproved users)
        const { data: dbUser } = await adminClient
            .from("users")
            .select("first_name, last_name, email")
            .eq("id", user.id)
            .maybeSingle()

        return NextResponse.json({
            homeowner: {
                id: null,
                firstName: dbUser?.first_name ?? null,
                lastName: dbUser?.last_name ?? null,
                email: dbUser?.email ?? user.email,
                contactNumber: null,
                phase: null,
                block: null,
                lot: null,
                propertyAddress: null,
                profilePhotoUrl: null,
            }
        })
    }

    return NextResponse.json({
        homeowner: {
            id: homeowner.id,
            firstName: homeowner.first_name,
            lastName: homeowner.last_name,
            email: homeowner.email,
            contactNumber: homeowner.contact_number,
            phase: homeowner.phase,
            block: homeowner.block,
            lot: homeowner.lot,
            propertyAddress: homeowner.property_address,
            profilePhotoUrl: homeowner.profile_photo_url,
        }
    })
}

/**
 * PATCH /api/profile
 * Updates freely-editable homeowner fields for the authenticated user.
 */
export async function PATCH(req: NextRequest) {
    const authError = await requireAuthAPI()
    if (authError) return authError

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const updates = parsed.data
    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { error: updateErr } = await adminClient
        .from("homeowners")
        .update(updates)
        .eq("user_id", user.id)

    if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
