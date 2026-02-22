import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAdminAPI } from "@/lib/supabase/guards"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/stickers?q=&status=&page=&pageSize=
 * Global sticker listing with search (code, plate, homeowner name) and status filter.
 * Joins vehicles + homeowners for display.
 *
 * Search is done server-side: when `q` is present, we skip range pagination,
 * fetch all matching rows, filter in JS, then manually paginate the filtered set.
 */
export async function GET(req: NextRequest) {
    const authError = await requireAdminAPI()
    if (authError) return authError

    try {
        const supabase = createAdminClient()
        const sp = req.nextUrl.searchParams
        const q = sp.get("q")?.trim() || ""
        const status = sp.get("status") || ""
        const page = Math.max(1, parseInt(sp.get("page") || "1", 10))
        const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "25", 10)))

        const selectFields = `id, homeowner_id, vehicle_id, code, status, issued_at, expires_at, amount_paid, notes,
             vehicles:vehicles(plate_no, make, model, color, category),
             homeowners:homeowners(first_name, last_name, block, lot, phase)`

        // When searching, fetch ALL rows (no range) so we can filter across the full dataset
        let query = supabase
            .from("stickers")
            .select(selectFields, { count: "exact" })
            .order("issued_at", { ascending: false })

        // Status filter (applied server-side)
        if (status && ["ACTIVE", "EXPIRED", "REVOKED"].includes(status)) {
            query = query.eq("status", status)
        }

        // Only apply range pagination when NOT searching
        if (!q) {
            const from = (page - 1) * pageSize
            query = query.range(from, from + pageSize - 1)
        }

        const { data, error, count } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        // Map rows to API shape
        let items = (data || []).map((row: any) => ({
            id: row.id,
            homeownerId: row.homeowner_id,
            code: row.code,
            status: row.status,
            issuedAt: row.issued_at,
            expiresAt: row.expires_at,
            amountPaid: row.amount_paid,
            notes: row.notes,
            vehiclePlateNo: row.vehicles?.plate_no || null,
            vehicleMake: row.vehicles?.make || null,
            vehicleModel: row.vehicles?.model || null,
            vehicleCategory: row.vehicles?.category || null,
            homeownerName: row.homeowners
                ? `${row.homeowners.first_name || ""} ${row.homeowners.last_name || ""}`.trim()
                : null,
            homeownerAddress: row.homeowners
                ? [
                    row.homeowners.block ? `Blk ${row.homeowners.block}` : "",
                    row.homeowners.lot ? `Lot ${row.homeowners.lot}` : "",
                    row.homeowners.phase ? `Ph ${row.homeowners.phase}` : "",
                ].filter(Boolean).join(" ")
                : null,
        }))

        // Server-side search filtering across code, plate, and homeowner name
        if (q) {
            const lower = q.toLowerCase()
            items = items.filter(i =>
                i.code?.toLowerCase().includes(lower) ||
                i.vehiclePlateNo?.toLowerCase().includes(lower) ||
                i.homeownerName?.toLowerCase().includes(lower)
            )
        }

        // When searching, manually paginate the filtered result set
        const filteredTotal = items.length
        if (q) {
            const from = (page - 1) * pageSize
            items = items.slice(from, from + pageSize)
        }

        return NextResponse.json({
            items,
            total: q ? filteredTotal : (count ?? items.length),
            page,
            pageSize,
        })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
    }
}

/**
 * PATCH /api/admin/stickers
 * Body: { id, status }
 * Update a sticker's status (ACTIVE / EXPIRED / REVOKED).
 */
export async function PATCH(req: NextRequest) {
    const authError = await requireAdminAPI()
    if (authError) return authError

    try {
        const supabase = createAdminClient()
        const body = await req.json()
        const { id, status } = body

        if (!id || !["ACTIVE", "EXPIRED", "REVOKED"].includes(status)) {
            return NextResponse.json({ error: "Invalid id or status" }, { status: 400 })
        }

        const { error } = await supabase
            .from("stickers")
            .update({ status })
            .eq("id", id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
    }
}
