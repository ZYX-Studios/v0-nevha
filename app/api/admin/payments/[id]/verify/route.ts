import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { createClient } from "@/lib/supabase/server"
import { requireAdminAPI } from "@/lib/supabase/guards"

/**
 * POST /api/admin/payments/[id]/verify
 * Body: { action: 'verified' | 'rejected', adminNotes?: string }
 *
 * On verify:
 *   - Updates payments.status = 'verified'
 *   - If fee_type = 'annual_dues': upserts hoa_dues row, marking dues as paid
 *   - If fee_type = 'car_sticker': updates sticker amount_paid
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
    const { action, adminNotes } = body as { action?: string; adminNotes?: string }

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

        // ── Verify the payment ─────────────────────────────────────────────────────
        await supabase
            .from("payments")
            .update({
                status: "verified",
                admin_notes: adminNotes || null,
                verified_by: adminUser?.id || null,
                verified_at: new Date().toISOString(),
            })
            .eq("id", paymentId)

        const feeType = payment.fee_type
        const feeYear = payment.fee_year || new Date().getFullYear()
        const homeownerId = payment.homeowner_id

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
            // Update the sticker's amount_paid for this homeowner
            // Find the most recent sticker for this homeowner
            const { data: sticker } = await supabase
                .from("stickers")
                .select("id")
                .eq("homeowner_id", homeownerId)
                .order("issued_at", { ascending: false })
                .limit(1)
                .maybeSingle()

            if (sticker) {
                await supabase
                    .from("stickers")
                    .update({ amount_paid: payment.amount })
                    .eq("id", sticker.id)
            }
        }

        return NextResponse.json({ success: true, action: "verified" })
    } catch (err: any) {
        console.error("[payment-verify]", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
