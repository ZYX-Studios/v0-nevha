import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAdminAPI } from "@/lib/supabase/guards"

export async function POST(_req: Request, { params }: { params: { id: string } }) {
    const authError = await requireAdminAPI()
    if (authError) return authError
    try {
        const supabase = createAdminClient()
        const { id } = params

        const { error } = await supabase
            .from("profile_change_requests")
            .update({ status: "rejected", reviewed_at: new Date().toISOString() })
            .eq("id", id)
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })

        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
    }
}
