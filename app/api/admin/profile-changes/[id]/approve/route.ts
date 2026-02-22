import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAdminAPI } from "@/lib/supabase/guards"

export async function POST(_req: Request, { params }: { params: { id: string } }) {
    const authError = await requireAdminAPI()
    if (authError) return authError
    try {
        const supabase = createAdminClient()
        const { id } = params

        const { data: req, error: reqErr } = await supabase
            .from("profile_change_requests")
            .select("*")
            .eq("id", id)
            .single()
        if (reqErr || !req) return NextResponse.json({ error: "Request not found" }, { status: 404 })

        // Apply the change to homeowners
        const updateField: Record<string, string> = {}
        if (req.field_name === "first_name") updateField.first_name = req.new_value
        if (req.field_name === "last_name") updateField.last_name = req.new_value
        if (req.field_name === "middle_initial") updateField.middle_initial = req.new_value
        if (req.field_name === "suffix") updateField.suffix = req.new_value

        if (Object.keys(updateField).length > 0) {
            await supabase.from("homeowners").update(updateField).eq("id", req.homeowner_id)
        }

        // Mark request as approved
        const { error: updateErr } = await supabase
            .from("profile_change_requests")
            .update({ status: "approved", reviewed_at: new Date().toISOString() })
            .eq("id", id)
        if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
    }
}
