import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/resend"

interface RegistrationApprovedPayload {
    email: string
    firstName: string
    block: string
    lot: string
    phase: string
    homeownerId?: string
}

/**
 * POST /api/email/registration-approved
 * Called internally by the approve endpoint (fire-and-forget).
 * No auth guard — this is an internal server-to-server call.
 */
export async function POST(req: NextRequest) {
    try {
        const { email, firstName, block, lot, phase } =
            (await req.json()) as RegistrationApprovedPayload

        if (!email || !firstName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

        await sendEmail({
            to: email,
            subject: "🏡 Your NEVHA Registration Has Been Approved",
            html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;line-height:1.6">
          <div style="background:#1e3a5f;padding:32px 40px;border-radius:12px 12px 0 0">
            <h1 style="color:#fff;margin:0;font-size:24px">Welcome to NEVHA!</h1>
            <p style="color:#a8c4e0;margin:8px 0 0;font-size:15px">Northfields Executive Village Homeowners' Association</p>
          </div>
          <div style="background:#fff;padding:32px 40px;border:1px solid #e5e7eb;border-top:none">
            <p style="font-size:16px;color:#1f2937">Hi <strong>${firstName}</strong>,</p>
            <p style="color:#374151">Your registration has been <strong style="color:#16a34a">approved</strong> by our team. You are now a verified member of the Northfields Executive Village HOA.</p>
            
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0">
              <p style="margin:0;color:#374151;font-size:14px"><strong>Your property:</strong></p>
              <p style="margin:8px 0 0;color:#166534;font-size:18px;font-weight:700">Block ${block}, Lot ${lot}, Phase ${phase}</p>
            </div>
            
            <p style="color:#374151">You can now:</p>
            <ul style="color:#374151;padding-left:20px">
              <li>Pay your annual HOA dues online</li>
              <li>Register your vehicles and get car stickers</li>
              <li>Report community issues</li>
              <li>View announcements and updates</li>
            </ul>

            <div style="text-align:center;margin:32px 0">
              <a href="${siteUrl}" style="background:#1e3a5f;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block">Login to Your Account</a>
            </div>

            <p style="color:#374151">If you have any questions, please contact the HOA office.</p>
            <p style="color:#374151">Warm regards,<br><strong>NEVHA Administration</strong></p>
          </div>
          <div style="background:#f9fafb;padding:16px 40px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
            <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center">Northfields Executive Village HOA • This is an automated message.</p>
          </div>
        </div>
      `,
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error("[email/registration-approved]", err?.message)
        return NextResponse.json({ error: err?.message }, { status: 500 })
    }
}
