import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAdminAPI } from "@/lib/supabase/guards"

/**
 * GET /api/admin/registrations/match-homeowner
 * Query params: block, lot, phase, firstName, lastName
 *
 * Searches for existing unlinked homeowner records that could match
 * a registration request. Returns ranked suggestions for the admin to review.
 */
export async function GET(req: NextRequest) {
    const authError = await requireAdminAPI()
    if (authError) return authError

    const { searchParams } = new URL(req.url)
    const block = searchParams.get("block")?.trim()
    const lot = searchParams.get("lot")?.trim()
    const phase = searchParams.get("phase")?.trim()
    const firstName = searchParams.get("firstName")?.trim()
    const lastName = searchParams.get("lastName")?.trim()

    if (!block && !lot && !firstName && !lastName) {
        return NextResponse.json({ error: "Provide at least block/lot or name" }, { status: 400 })
    }

    try {
        const supabase = createAdminClient()

        // Find unlinked homeowners (no user_id set)
        let query = supabase
            .from("homeowners")
            .select("id, first_name, last_name, block, lot, phase, email, contact_number")
            .is("user_id", null)
            .limit(10)

        // If block and lot given — this is an exact address match (highest confidence)
        if (block && lot) {
            query = query.eq("block", block).eq("lot", lot)
        } else if (firstName && lastName) {
            // Name-only match
            query = query
                .ilike("first_name", `%${firstName}%`)
                .ilike("last_name", `%${lastName}%`)
        }

        const { data: addressMatches, error } = await query

        if (error) throw error

        // Score and rank matches
        const scored = (addressMatches || []).map((h) => {
            let score = 0
            const reasons: string[] = []

            if (block && h.block === block) { score += 40; reasons.push("Same block") }
            if (lot && h.lot === lot) { score += 40; reasons.push("Same lot") }
            if (phase && h.phase === phase) { score += 10; reasons.push("Same phase") }
            if (firstName && h.first_name?.toLowerCase().includes(firstName.toLowerCase())) {
                score += 5; reasons.push("Name match")
            }
            if (lastName && h.last_name?.toLowerCase().includes(lastName.toLowerCase())) {
                score += 5; reasons.push("Name match")
            }

            return { ...h, matchScore: score, matchReasons: reasons }
        })

        // Sort by score descending
        scored.sort((a, b) => b.matchScore - a.matchScore)

        return NextResponse.json({ suggestions: scored })
    } catch (err: any) {
        console.error("[match-homeowner]", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
