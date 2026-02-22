import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { createClient } from "@/lib/supabase/server"
import { requireAdminAPI } from "@/lib/supabase/guards"

/**
 * Auto-generates a NEVHA sticker code: NVH-YY-XXXXXX
 * e.g., NVH-25-A3B7Z1
 */
function generateStickerCode(): string {
    const year = new Date().getFullYear().toString().slice(-2)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // exclude ambiguous chars
    let random = ""
    for (let i = 0; i < 6; i++) {
        random += chars[Math.floor(Math.random() * chars.length)]
    }
    return `NVH-${year}-${random}`
}

/**
 * POST /api/admin/vehicles/[id]/approve
 * Body: { stickerCode?: string }
 *
 * 1. Get the vehicle_request
 * 2. Get the homeowner linked to the requesting user
 * 3. Upsert a vehicles record (plate_no, category)
 * 4. Create a stickers record (auto-code or admin override)
 * 5. Update vehicle_request.status = 'approved'
 * 6. Send approval email
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const authError = await requireAdminAPI()
    if (authError) return authError

    const vehicleRequestId = params.id
    const body = await req.json().catch(() => ({}))
    const { stickerCode: adminStickerCode } = body as { stickerCode?: string }

    try {
        const supabase = createAdminClient()
        const userSupabase = await createClient()
        const { data: { user: adminUser } } = await userSupabase.auth.getUser()

        // 1. Fetch vehicle request
        const { data: vReq, error: fetchErr } = await supabase
            .from("vehicle_requests")
            .select("*")
            .eq("id", vehicleRequestId)
            .single()

        if (fetchErr || !vReq) {
            return NextResponse.json({ error: "Vehicle request not found" }, { status: 404 })
        }
        if (vReq.status !== "pending") {
            return NextResponse.json({ error: "Request already processed" }, { status: 409 })
        }

        // 2. Get homeowner record for this user
        const { data: homeowner, error: homeownerErr } = await supabase
            .from("homeowners")
            .select("id, first_name, last_name, email")
            .eq("user_id", vReq.user_id)
            .maybeSingle()

        if (homeownerErr || !homeowner) {
            return NextResponse.json(
                { error: "Could not find homeowner record for this user. Ensure their registration is approved first." },
                { status: 422 }
            )
        }

        // 3. Create vehicle record
        const { data: vehicle, error: vehicleErr } = await supabase
            .from("vehicles")
            .insert({
                homeowner_id: homeowner.id,
                plate_no: vReq.plate_number,
                category: vReq.vehicle_type,
            })
            .select("id")
            .single()

        if (vehicleErr || !vehicle) {
            return NextResponse.json(
                { error: `Failed to create vehicle record: ${vehicleErr?.message}` },
                { status: 500 }
            )
        }

        // 4. Generate or use provided sticker code (ensure uniqueness)
        let stickerCode = adminStickerCode?.trim() || generateStickerCode()

        // Ensure uniqueness — regenerate up to 5 times if collision
        for (let attempt = 0; attempt < 5; attempt++) {
            const { data: existing } = await supabase
                .from("stickers")
                .select("id")
                .eq("code", stickerCode)
                .maybeSingle()

            if (!existing) break
            stickerCode = generateStickerCode() // collision, retry
        }

        // 5. Create sticker record
        const currentYear = new Date().getFullYear()
        const expiresAt = new Date(`${currentYear + 1}-12-31T23:59:59Z`).toISOString()

        const { error: stickerErr } = await supabase
            .from("stickers")
            .insert({
                homeowner_id: homeowner.id,
                vehicle_id: vehicle.id,
                code: stickerCode,
                status: "ACTIVE",
                issued_at: new Date().toISOString(),
                expires_at: expiresAt,
                notes: `Auto-issued on vehicle registration for ${vReq.plate_number}`,
            })

        if (stickerErr) {
            // Rollback vehicle record
            await supabase.from("vehicles").delete().eq("id", vehicle.id)
            return NextResponse.json(
                { error: `Failed to create sticker: ${stickerErr.message}` },
                { status: 500 }
            )
        }

        // 6. Update vehicle request status
        await supabase
            .from("vehicle_requests")
            .update({
                status: "approved",
                updated_at: new Date().toISOString(),
            })
            .eq("id", vehicleRequestId)

        // 7. Send approval email
        await sendVehicleApprovalEmail(homeowner.email, homeowner.first_name, vReq.plate_number, stickerCode)

        return NextResponse.json({
            success: true,
            vehicleId: vehicle.id,
            stickerCode,
        })
    } catch (err: any) {
        console.error("[vehicle-approve]", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

async function sendVehicleApprovalEmail(
    email: string,
    firstName: string,
    plateNumber: string,
    stickerCode: string
) {
    try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        await fetch(`${siteUrl}/api/email/vehicle-approved`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, firstName, plateNumber, stickerCode }),
        })
    } catch (e) {
        console.error("[vehicle-approve] Email send failed:", e)
    }
}
