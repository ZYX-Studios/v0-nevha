import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAdminAPI } from "@/lib/supabase/guards"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/homeowners/:id/payments
 * Returns all payments for a specific homeowner, ordered by created_at desc.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
    const authError = await requireAdminAPI()
    if (authError) return authError

    try {
        const supabase = createAdminClient()
        const homeownerId = params.id

        const { data, error } = await supabase
            .from("payments")
            .select("*")
            .eq("homeowner_id", homeownerId)
            .order("created_at", { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ items: data ?? [] }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
    }
}
