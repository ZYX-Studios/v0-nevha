import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { createClient } from "@/lib/supabase/server"
import { requireAdminAPI } from "@/lib/supabase/guards"

/**
 * POST /api/admin/registrations/[id]/reject
 * Body: { reason: string }
 *
 * Rejects a pending registration request and sends a rejection email.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const authError = await requireAdminAPI()
    if (authError) return authError

    const requestId = params.id
    const body = await req.json().catch(() => ({}))
    const { reason } = body as { reason?: string }

    if (!reason?.trim()) {
        return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 })
    }

    try {
        const supabase = createAdminClient()
        const userSupabase = await createClient()
        const { data: { user: adminUser } } = await userSupabase.auth.getUser()

        // Fetch request
        const { data: regReq, error: fetchErr } = await supabase
            .from("registration_requests")
            .select("user_id, email, first_name, status")
            .eq("id", requestId)
            .single()

        if (fetchErr || !regReq) {
            return NextResponse.json({ error: "Registration request not found" }, { status: 404 })
        }
        if (regReq.status !== "pending") {
            return NextResponse.json({ error: "Request is already processed" }, { status: 409 })
        }

        // Update status
        const { error: updateErr } = await supabase
            .from("registration_requests")
            .update({
                status: "rejected",
                admin_notes: reason.trim(),
                reviewed_by: adminUser?.id ?? null,
                reviewed_at: new Date().toISOString(),
            })
            .eq("id", requestId)

        if (updateErr) {
            return NextResponse.json({ error: updateErr.message }, { status: 500 })
        }

        // Send rejection email
        await sendRejectionEmail(regReq.email, regReq.first_name, reason.trim())

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error("[reject-registration]", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

async function sendRejectionEmail(email: string, firstName: string, reason: string) {
    try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        await fetch(`${siteUrl}/api/email/registration-rejected`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, firstName, reason }),
        })
    } catch (e) {
        console.error("[reject-registration] Email send failed:", e)
    }
}
