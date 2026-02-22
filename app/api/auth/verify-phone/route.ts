import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"

/**
 * POST /api/auth/verify-phone
 * Body: { email: string, phone_last4: string }
 *
 * Used during registration when an existing homeowner email is detected.
 * Validates that the last 4 digits of the provided phone match the DB record.
 * Returns a masked phone number for display (never the full number).
 *
 * This is intentionally lenient (last 4 only) since it's a UX hint, not a security gate.
 * The actual account linkage still requires admin approval of the registration request.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}))
        const { email, phone_last4 } = body as { email?: string; phone_last4?: string }

        if (!email || !phone_last4) {
            return NextResponse.json({ error: "email and phone_last4 are required" }, { status: 400 })
        }
        if (!/^\d{4}$/.test(phone_last4)) {
            return NextResponse.json({ error: "phone_last4 must be exactly 4 digits" }, { status: 400 })
        }

        const admin = createAdminClient()

        // Look up homeowner by email only
        const { data: homeowner } = await admin
            .from("homeowners")
            .select("id, first_name, contact_number")
            .ilike("email", email.trim())
            .maybeSingle()

        if (!homeowner) {
            // Don't reveal whether the homeowner exists — return a generic mismatch
            return NextResponse.json({ valid: false, message: "Phone number does not match our records" })
        }

        const phone = homeowner.contact_number ?? ""
        // Strip non-digits and compare last 4
        const digits = phone.replace(/\D/g, "")
        const last4 = digits.slice(-4)

        if (last4 !== phone_last4) {
            return NextResponse.json({ valid: false, message: "Phone number does not match our records" })
        }

        // Build masked display: e.g. "+63 9XX XXX XX89"
        const maskedPhone = digits.length >= 4
            ? phone.replace(/\d(?=\d{4})/g, "X")
            : phone

        return NextResponse.json({
            valid: true,
            maskedPhone,
            firstName: homeowner.first_name,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
