import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAdminAPI } from "@/lib/supabase/guards"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/payments?q=&status=&fee_type=&page=&pageSize=
 * List all payments with homeowner name join, search, filter, pagination.
 */
export async function GET(req: NextRequest) {
    const authError = await requireAdminAPI()
    if (authError) return authError

    try {
        const supabase = createAdminClient()
        const sp = req.nextUrl.searchParams
        const q = sp.get("q")?.trim() || ""
        const status = sp.get("status") || ""
        const feeType = sp.get("fee_type") || ""
        const page = Math.max(1, parseInt(sp.get("page") || "1", 10))
        const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "25", 10)))

        const selectFields = `id, homeowner_id, fee_type, fee_year, amount, payment_method,
            proof_url, proof_drive_file_id, status, admin_notes, verified_by, verified_at,
            created_at, updated_at, vehicle_request_id,
            homeowners:homeowners(first_name, last_name, block, lot, phase)`

        let query = supabase
            .from("payments")
            .select(selectFields, { count: "exact" })
            .order("created_at", { ascending: false })

        if (status && ["pending", "verified", "rejected"].includes(status)) {
            query = query.eq("status", status)
        }
        if (feeType && ["annual_dues", "car_sticker"].includes(feeType)) {
            query = query.eq("fee_type", feeType)
        }

        if (!q) {
            const from = (page - 1) * pageSize
            query = query.range(from, from + pageSize - 1)
        }

        const { data, error, count } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        let items = (data || []).map((row: any) => ({
            id: row.id,
            homeownerId: row.homeowner_id,
            feeType: row.fee_type,
            feeYear: row.fee_year,
            amount: row.amount,
            paymentMethod: row.payment_method,
            proofUrl: row.proof_url,
            proofDriveFileId: row.proof_drive_file_id,
            status: row.status,
            adminNotes: row.admin_notes,
            verifiedBy: row.verified_by,
            verifiedAt: row.verified_at,
            createdAt: row.created_at,
            vehicleRequestId: row.vehicle_request_id,
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

        if (q) {
            const lower = q.toLowerCase()
            items = items.filter(i =>
                i.homeownerName?.toLowerCase().includes(lower) ||
                i.homeownerAddress?.toLowerCase().includes(lower) ||
                i.feeType?.toLowerCase().includes(lower)
            )
        }

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
 * Line item shape for the multi-item POST.
 */
interface LineItemInput {
    feeType: string
    feeYear: number
    amount: number
    paymentMethod: string
    // Car sticker fields (only when feeType = 'car_sticker')
    stickerCode?: string
    plateNo?: string
    make?: string
    model?: string
    category?: string
}

/**
 * POST /api/admin/payments
 * Create payment record(s) for walk-in office payments.
 * Accepts either:
 *   - Legacy single item: { homeownerId, feeType, feeYear, amount, paymentMethod, notes? }
 *   - Multi-line items: { homeownerId, items: LineItemInput[], notes? }
 *
 * For car_sticker items with stickerCode: also creates/upserts vehicle + sticker.
 */
export async function POST(req: NextRequest) {
    const authError = await requireAdminAPI()
    if (authError) return authError

    try {
        const supabase = createAdminClient()
        const body = await req.json()
        const { homeownerId, notes } = body

        if (!homeownerId) {
            return NextResponse.json({ error: "homeownerId is required" }, { status: 400 })
        }

        // Support both single-item (legacy) and multi-item formats
        let lineItems: LineItemInput[]
        if (body.items && Array.isArray(body.items)) {
            lineItems = body.items
        } else {
            // Legacy single-item shape
            lineItems = [{
                feeType: body.feeType,
                feeYear: body.feeYear,
                amount: body.amount,
                paymentMethod: body.paymentMethod,
                stickerCode: body.stickerCode,
                plateNo: body.plateNo,
                make: body.make,
                model: body.model,
                category: body.category,
            }]
        }

        if (lineItems.length === 0) {
            return NextResponse.json({ error: "At least one line item is required" }, { status: 400 })
        }

        // Get current admin user
        const { data: { user: adminUser } } = await supabase.auth.getUser()
        const now = new Date().toISOString()
        const createdIds: string[] = []

        for (const item of lineItems) {
            // Validate each line item
            if (!item.feeType || !["annual_dues", "car_sticker"].includes(item.feeType)) {
                return NextResponse.json({ error: `Invalid fee_type: ${item.feeType}` }, { status: 400 })
            }
            if (!item.feeYear || item.feeYear < 2024) {
                return NextResponse.json({ error: `Invalid fee_year: ${item.feeYear}` }, { status: 400 })
            }
            if (!item.amount || item.amount <= 0) {
                return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
            }
            if (!item.paymentMethod || !["cash", "gcash", "bank_transfer", "check"].includes(item.paymentMethod)) {
                return NextResponse.json({ error: `Invalid payment_method: ${item.paymentMethod}` }, { status: 400 })
            }

            // 1. Create payment row
            const { data: paymentData, error: paymentError } = await supabase
                .from("payments")
                .insert({
                    homeowner_id: homeownerId,
                    fee_type: item.feeType,
                    fee_year: item.feeYear,
                    amount: item.amount,
                    payment_method: item.paymentMethod,
                    status: "verified",
                    admin_notes: notes || "Walk-in payment recorded",
                    verified_by: adminUser?.id || null,
                    verified_at: now,
                })
                .select("id")
                .single()

            if (paymentError) {
                return NextResponse.json({ error: paymentError.message }, { status: 400 })
            }
            createdIds.push(paymentData.id)

            // 2. For car stickers: also create vehicle + sticker
            if (item.feeType === "car_sticker" && item.stickerCode?.trim()) {
                let vehicleId: string | null = null

                // Upsert vehicle if plate provided
                if (item.plateNo?.trim()) {
                    const { data: veh, error: vehErr } = await supabase
                        .from("vehicles")
                        .upsert({
                            homeowner_id: homeownerId,
                            plate_no: item.plateNo.trim(),
                            make: item.make?.trim() || null,
                            model: item.model?.trim() || null,
                            category: item.category || null,
                        }, { onConflict: "plate_no" })
                        .select("id")
                        .maybeSingle()

                    if (!vehErr && veh) vehicleId = veh.id
                }

                // Compute expiry: Feb 1 of (current year + 1)
                const expiresAt = `${item.feeYear + 1}-02-01T00:00:00Z`

                // Upsert sticker
                await supabase
                    .from("stickers")
                    .upsert({
                        code: item.stickerCode.trim(),
                        homeowner_id: homeownerId,
                        vehicle_id: vehicleId,
                        issued_at: now,
                        expires_at: expiresAt,
                        amount_paid: item.amount,
                        status: "ACTIVE",
                    }, { onConflict: "code" })
            }

            // 3. For annual dues: upsert hoa_dues to mark dues as paid
            if (item.feeType === "annual_dues") {
                // Get annual_amount from config for the year
                const { data: config } = await supabase
                    .from("hoa_dues_config")
                    .select("annual_amount")
                    .eq("dues_year", item.feeYear)
                    .eq("is_active", true)
                    .maybeSingle()

                const annualAmount = config?.annual_amount ? Number(config.annual_amount) : item.amount

                // Check existing dues row for this homeowner + year
                const { data: existingDues } = await supabase
                    .from("hoa_dues")
                    .select("id, amount_paid")
                    .eq("homeowner_id", homeownerId)
                    .eq("dues_year", item.feeYear)
                    .maybeSingle()

                const prevPaid = existingDues?.amount_paid ? Number(existingDues.amount_paid) : 0
                const newPaid = prevPaid + item.amount
                const isPaidInFull = newPaid >= annualAmount

                await supabase
                    .from("hoa_dues")
                    .upsert({
                        homeowner_id: homeownerId,
                        dues_year: item.feeYear,
                        annual_amount: annualAmount,
                        amount_paid: newPaid,
                        payment_date: now.split("T")[0],
                        payment_method: item.paymentMethod,
                        receipt_number: notes || null,
                        payment_id: paymentData.id,
                        status: isPaidInFull ? "paid" : "partial",
                    }, { onConflict: "homeowner_id,dues_year" })
            }
        }

        return NextResponse.json({
            success: true,
            ids: createdIds,
            count: createdIds.length,
        }, { status: 201 })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
    }
}
