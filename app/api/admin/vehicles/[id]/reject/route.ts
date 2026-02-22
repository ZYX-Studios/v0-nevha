import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAdminAPI } from "@/lib/supabase/guards"

/**
 * POST /api/admin/vehicles/[id]/reject
 * Body: { reason: string }
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const authError = await requireAdminAPI()
    if (authError) return authError

    const vehicleRequestId = params.id
    const body = await req.json().catch(() => ({}))
    const { reason } = body as { reason?: string }

    if (!reason?.trim()) {
        return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 })
    }

    try {
        const supabase = createAdminClient()

        const { data: vReq, error: fetchErr } = await supabase
            .from("vehicle_requests")
            .select("user_id, plate_number, status")
            .eq("id", vehicleRequestId)
            .single()

        if (fetchErr || !vReq) {
            return NextResponse.json({ error: "Vehicle request not found" }, { status: 404 })
        }
        if (vReq.status !== "pending") {
            return NextResponse.json({ error: "Request already processed" }, { status: 409 })
        }

        // Get homeowner email
        const { data: homeowner } = await supabase
            .from("homeowners")
            .select("email, first_name")
            .eq("user_id", vReq.user_id)
            .maybeSingle()

        await supabase
            .from("vehicle_requests")
            .update({ status: "rejected", updated_at: new Date().toISOString() })
            .eq("id", vehicleRequestId)

        // Send rejection email
        if (homeowner?.email) {
            try {
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
                await fetch(`${siteUrl}/api/email/vehicle-rejected`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: homeowner.email,
                        firstName: homeowner.first_name,
                        plateNumber: vReq.plate_number,
                        reason: reason.trim(),
                    }),
                })
            } catch (e) {
                console.error("[vehicle-reject] Email send failed:", e)
            }
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error("[vehicle-reject]", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
