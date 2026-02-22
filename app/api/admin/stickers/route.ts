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

        // Supabase caps at 1000 rows per query. Batch-fetch all rows.
        let allData: any[] = []
        const batchSize = 1000
        let offset = 0
        let keepFetching = true

        while (keepFetching) {
            const { data: batch, error } = await supabase
                .from("stickers")
                .select(selectFields)
                .order("issued_at", { ascending: false })
                .range(offset, offset + batchSize - 1)

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 400 })
            }

            allData = allData.concat(batch || [])
            if (!batch || batch.length < batchSize) {
                keepFetching = false
            } else {
                offset += batchSize
            }
        }

        // Map rows to API shape + compute effectiveStatus
        let items = allData.map((row: any) => {
            let effectiveStatus = row.status
            if (row.status === "ACTIVE" && row.expires_at) {
                const exp = new Date(row.expires_at)
                if (!isNaN(exp.getTime()) && exp < new Date()) {
                    effectiveStatus = "EXPIRED"
                }
            }

            let parsedNotes: Record<string, string> | null = null
            if (row.notes && row.notes.includes("|")) {
                parsedNotes = {}
                for (const part of row.notes.split("|")) {
                    const [key, ...valParts] = part.split(":")
                    if (key && valParts.length) {
                        parsedNotes[key.trim()] = valParts.join(":").trim()
                    }
                }
            }

            return {
                id: row.id,
                homeownerId: row.homeowner_id,
                code: row.code,
                status: row.status,
                effectiveStatus,
                issuedAt: row.issued_at,
                expiresAt: row.expires_at,
                amountPaid: row.amount_paid ? Number(row.amount_paid) : null,
                notes: row.notes,
                parsedNotes,
                vehiclePlateNo: row.vehicles?.plate_no || null,
                vehicleMake: row.vehicles?.make || null,
                vehicleModel: row.vehicles?.model || null,
                vehicleColor: row.vehicles?.color || null,
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
            }
        })

        // Search filter (text-based)
        if (q) {
            const lower = q.toLowerCase()
            items = items.filter(i =>
                i.code?.toLowerCase().includes(lower) ||
                i.vehiclePlateNo?.toLowerCase().includes(lower) ||
                i.homeownerName?.toLowerCase().includes(lower)
            )
        }

        // Summary counts for the full (pre-pagination) result set
        // Summary counts from ALL items (before status filter)
        const summary = {
            active: items.filter(i => i.effectiveStatus === "ACTIVE").length,
            expired: items.filter(i => i.effectiveStatus === "EXPIRED").length,
            revoked: items.filter(i => i.effectiveStatus === "REVOKED").length,
            paid: items.filter(i => typeof i.amountPaid === "number" && i.amountPaid > 0).length,
            unpaid: items.filter(i => !i.amountPaid || i.amountPaid <= 0).length,
        }

        // Status filter — uses effectiveStatus so auto-expired stickers are filterable
        if (status && ["ACTIVE", "EXPIRED", "REVOKED"].includes(status)) {
            items = items.filter(i => i.effectiveStatus === status)
        }

        // Paginate in JS
        const filteredTotal = items.length
        const from = (page - 1) * pageSize
        items = items.slice(from, from + pageSize)

        return NextResponse.json({
            items,
            total: filteredTotal,
            page,
            pageSize,
            summary,
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
