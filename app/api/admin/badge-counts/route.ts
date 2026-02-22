import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAdminAPI } from "@/lib/supabase/guards"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/badge-counts
 * Lightweight endpoint returning only sidebar badge counts.
 * Runs 3 parallel count queries — much faster than the full /api/admin/stats.
 */
export async function GET() {
    const authError = await requireAdminAPI()
    if (authError) return authError

    try {
        const supabase = createAdminClient()

        const [regRes, payRes, vehRes, nameRes] = await Promise.all([
            supabase.from("registration_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("vehicle_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("profile_change_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        ])

        const pendingRegistrations = regRes.count || 0
        const pendingPayments = payRes.count || 0
        const pendingVehicleRequests = vehRes.count || 0
        const pendingNameChanges = nameRes.count || 0

        return NextResponse.json({
            pendingRegistrations,
            pendingVerifications: pendingPayments + pendingVehicleRequests,
            pendingNameChanges,
        })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
    }
}
