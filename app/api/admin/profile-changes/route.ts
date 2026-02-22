import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAdminAPI } from "@/lib/supabase/guards"

export async function GET(req: Request) {
    const authError = await requireAdminAPI()
    if (authError) return authError
    try {
        const supabase = createAdminClient()
        const { searchParams } = new URL(req.url)
        const status = searchParams.get("status") || "pending"

        const { data, error } = await supabase
            .from("profile_change_requests")
            .select("id, homeowner_id, field_name, old_value, new_value, status, doc_file_id, created_at, reviewed_at, homeowners(first_name, last_name, block, lot, phase)")
            .eq("status", status)
            .order("created_at", { ascending: false })

        if (error) return NextResponse.json({ error: error.message }, { status: 400 })

        const items = (data || []).map((r: any) => ({
            id: r.id,
            homeownerId: r.homeowner_id,
            fieldName: r.field_name,
            oldValue: r.old_value,
            newValue: r.new_value,
            status: r.status,
            docFileId: r.doc_file_id,
            createdAt: r.created_at,
            reviewedAt: r.reviewed_at,
            homeowner: r.homeowners ? {
                firstName: r.homeowners.first_name,
                lastName: r.homeowners.last_name,
                block: r.homeowners.block,
                lot: r.homeowners.lot,
                phase: r.homeowners.phase,
            } : null,
        }))

        return NextResponse.json({ items })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
    }
}
