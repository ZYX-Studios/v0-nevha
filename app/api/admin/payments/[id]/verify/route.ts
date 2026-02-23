import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { createClient } from "@/lib/supabase/server"
import { requireAdminAPI } from "@/lib/supabase/guards"

/**
 * POST /api/admin/payments/[id]/verify
 * Body: { action: 'verified' | 'rejected', adminNotes?: string, stickerCode?: string }
 *
 * On verify:
 *   - Updates payments.status = 'verified'
 *   - If fee_type = 'annual_dues': upserts hoa_dues row, marking dues as paid
 *   - If fee_type = 'car_sticker': requires stickerCode, resolves vehicle, creates sticker record
 * On reject:
 *   - Updates payments.status = 'rejected' with admin_notes
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const authError = await requireAdminAPI()
    if (authError) return authError

    const paymentId = params.id
    const body = await req.json().catch(() => ({}))
    const { action, adminNotes, stickerCode } = body as {
        action?: string
        adminNotes?: string
        stickerCode?: string
    }

    if (action !== "verified" && action !== "rejected") {
        return NextResponse.json({ error: "action must be 'verified' or 'rejected'" }, { status: 400 })
    }

    try {
        const supabase = createAdminClient()
        const userSupabase = await createClient()
        const { data: { user: adminUser } } = await userSupabase.auth.getUser()

        // Fetch the payment
        const { data: payment, error: paymentErr } = await supabase
            .from("payments")
            .select("*")
            .eq("id", paymentId)
            .single()

        if (paymentErr || !payment) {
            return NextResponse.json({ error: "Payment not found" }, { status: 404 })
        }
        if (payment.status !== "pending") {
            return NextResponse.json({ error: "Payment already processed" }, { status: 409 })
        }

        if (action === "rejected") {
            await supabase
                .from("payments")
                .update({
                    status: "rejected",
                    admin_notes: adminNotes || null,
                    verified_by: adminUser?.id || null,
                    verified_at: new Date().toISOString(),
                })
                .eq("id", paymentId)

            return NextResponse.json({ success: true, action: "rejected" })
        }

        // ── Verify the payment ─────────────────────────────────────────
        const feeType = payment.fee_type
        const homeownerId = payment.homeowner_id
        const feeYear = payment.fee_year || new Date().getFullYear()

        // For car sticker payments, sticker code is required
        if (feeType === "car_sticker" && !stickerCode?.trim()) {
            return NextResponse.json(
                { error: "Sticker code is required when verifying car sticker payments" },
                { status: 400 }
            )
        }

        // Update payment status
        await supabase
            .from("payments")
            .update({
                status: "verified",
                admin_notes: adminNotes || null,
                verified_by: adminUser?.id || null,
                verified_at: new Date().toISOString(),
            })
            .eq("id", paymentId)

        if (feeType === "annual_dues") {
            // Upsert hoa_dues — mark as paid
            await supabase
                .from("hoa_dues")
                .upsert(
                    {
                        homeowner_id: homeownerId,
                        dues_year: feeYear,
                        amount_paid: payment.amount,
                        payment_date: new Date().toISOString().split("T")[0],
                        payment_method: payment.payment_method,
                        payment_id: paymentId,
                        status: "paid",
                    },
                    { onConflict: "homeowner_id,dues_year" }
                )
        } else if (feeType === "car_sticker") {
            // ── Resolve the vehicle ────────────────────────────────────
            let vehicleId: string | null = payment.vehicle_id || null

            // If we have a vehicle_request_id but no vehicle_id, resolve from vehicle_requests
            if (!vehicleId && payment.vehicle_request_id) {
                const { data: vReq } = await supabase
                    .from("vehicle_requests")
                    .select("id, vehicle_type, plate_number")
                    .eq("id", payment.vehicle_request_id)
                    .maybeSingle()

                if (vReq) {
                    // Upsert into vehicles table from the vehicle request
                    const { data: vehicle } = await supabase
                        .from("vehicles")
                        .upsert(
                            {
                                homeowner_id: homeownerId,
                                plate_no: vReq.plate_number,
                                category: vReq.vehicle_type,
                            },
                            { onConflict: "plate_no" }
                        )
                        .select("id")
                        .maybeSingle()

                    vehicleId = vehicle?.id || null

                    // Also update the payment to reference the resolved vehicle_id
                    if (vehicleId) {
                        await supabase
                            .from("payments")
                            .update({ vehicle_id: vehicleId })
                            .eq("id", paymentId)
                    }
                }
            }

            // ── Create the sticker record ──────────────────────────────
            await supabase
                .from("stickers")
                .insert({
                    homeowner_id: homeownerId,
                    vehicle_id: vehicleId,
                    code: stickerCode!.trim(),
                    status: "ACTIVE",
                    issued_at: new Date().toISOString(),
                    amount_paid: payment.amount,
                    released_at: null, // Not yet physically released
                })
        }

        return NextResponse.json({ success: true, action: "verified" })
    } catch (err: any) {
        console.error("[payment-verify]", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
