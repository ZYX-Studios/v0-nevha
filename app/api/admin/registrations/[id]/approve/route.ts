import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { createClient } from "@/lib/supabase/server"
import { requireAdminAPI } from "@/lib/supabase/guards"

/**
 * POST /api/admin/registrations/[id]/approve
 * Body: { matchedHomeownerId?: string }
 *
 * Approves a registration request:
 * 1. If matchedHomeownerId: links existing homeowner to the user
 * 2. If not: creates a new homeowner record from registration data
 * 3. Sets user role to HOMEOWNER
 * 4. Updates request status to 'approved'
 * 5. Sends approval email
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const authError = await requireAdminAPI()
    if (authError) return authError

    const requestId = params.id
    const body = await req.json().catch(() => ({}))
    const { matchedHomeownerId } = body as { matchedHomeownerId?: string }

    try {
        const supabase = createAdminClient()
        const userSupabase = await createClient()

        // Get the admin's own user id for audit
        const { data: { user: adminUser } } = await userSupabase.auth.getUser()

        // 1. Fetch the registration request
        const { data: req_, error: reqError } = await supabase
            .from("registration_requests")
            .select("*")
            .eq("id", requestId)
            .single()

        if (reqError || !req_) {
            return NextResponse.json({ error: "Registration request not found" }, { status: 404 })
        }
        if (req_.status !== "pending") {
            return NextResponse.json({ error: "Request is already processed" }, { status: 409 })
        }

        let homeownerId: string

        // ── Duplicate-address guard (runs for ALL approval paths) ──────────
        const claimedPhase = req_.claimed_phase?.trim() || null
        const claimedBlock = req_.claimed_block?.trim() || null
        const claimedLot = req_.claimed_lot?.trim() || null

        if (claimedPhase || claimedBlock || claimedLot) {
            let query = supabase
                .from("homeowners")
                .select("id, first_name, last_name")
                .not("user_id", "is", null)

            if (claimedPhase) query = query.eq("phase", claimedPhase)
            if (claimedBlock) query = query.eq("block", claimedBlock)
            if (claimedLot) query = query.eq("lot", claimedLot)

            const { data: existingAtAddress } = await query.maybeSingle()

            // Skip warning only if the admin explicitly selected this same homeowner
            if (existingAtAddress && existingAtAddress.id !== matchedHomeownerId) {
                const addrLabel = [
                    claimedPhase ? `Phase ${claimedPhase}` : null,
                    claimedBlock ? `Block ${claimedBlock}` : null,
                    claimedLot ? `Lot ${claimedLot}` : null,
                ].filter(Boolean).join(", ")

                return NextResponse.json(
                    {
                        error: "duplicate_address",
                        message: `Address ${addrLabel} is already linked to ${existingAtAddress.first_name} ${existingAtAddress.last_name}. Link to an existing record instead.`,
                        existingHomeownerName: `${existingAtAddress.first_name} ${existingAtAddress.last_name}`,
                    },
                    { status: 409 }
                )
            }
        }

        if (matchedHomeownerId) {
            // 2a. Link existing homeowner to user
            const { error: linkError } = await supabase
                .from("homeowners")
                .update({ user_id: req_.user_id })
                .eq("id", matchedHomeownerId)
                .is("user_id", null) // Safety: only link unlinked records

            if (linkError) {
                return NextResponse.json(
                    { error: `Failed to link homeowner: ${linkError.message}` },
                    { status: 500 }
                )
            }
            homeownerId = matchedHomeownerId
        } else {
            // 2b. Create new homeowner record from registration data.
            // Compute property_address from phase/block/lot (NOT NULL column)
            const computedAddress = [
                claimedPhase ? `Phase ${claimedPhase}` : null,
                claimedBlock ? `Block ${claimedBlock}` : null,
                claimedLot ? `Lot ${claimedLot}` : null,
            ]
                .filter(Boolean)
                .join(", ")

            const { data: newHomeowner, error: createError } = await supabase
                .from("homeowners")
                .insert({
                    user_id: req_.user_id,
                    first_name: req_.first_name,
                    last_name: req_.last_name,
                    email: req_.email,
                    contact_number: req_.phone,
                    block: req_.claimed_block,
                    lot: req_.claimed_lot,
                    phase: req_.claimed_phase,
                    property_address: computedAddress,
                })
                .select("id")
                .single()

            if (createError || !newHomeowner) {
                return NextResponse.json(
                    { error: `Failed to create homeowner: ${createError?.message}` },
                    { status: 500 }
                )
            }
            homeownerId = newHomeowner.id
        }

        // 3. Upgrade user role to HOMEOWNER — but never downgrade ADMIN or STAFF
        const { data: currentUser } = await supabase
            .from("users")
            .select("role")
            .eq("id", req_.user_id)
            .single()

        if (currentUser && !["ADMIN", "STAFF"].includes(currentUser.role)) {
            await supabase
                .from("users")
                .update({ role: "HOMEOWNER" })
                .eq("id", req_.user_id)
        }

        // 4. Update registration request status
        const { error: updateError } = await supabase
            .from("registration_requests")
            .update({
                status: "approved",
                reviewed_by: adminUser?.id ?? null,
                reviewed_at: new Date().toISOString(),
            })
            .eq("id", requestId)

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        // 5. Send approval email
        await sendApprovalEmail(req_.email, req_.first_name)

        return NextResponse.json({
            success: true,
            homeownerId,
            action: matchedHomeownerId ? "linked" : "created",
        })
    } catch (err: any) {
        console.error("[approve-registration]", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

async function sendApprovalEmail(email: string, firstName: string) {
    try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        await fetch(`${siteUrl}/api/email/registration-approved`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, firstName }),
        })
    } catch (e) {
        console.error("[approve-registration] Email send failed:", e)
        // Don't fail the approval if email fails
    }
}
