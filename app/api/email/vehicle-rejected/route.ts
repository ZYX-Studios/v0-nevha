import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/resend"

/**
 * POST /api/email/vehicle-rejected
 * Called fire-and-forget from the vehicle reject endpoint.
 */
export async function POST(req: NextRequest) {
    try {
        const { email, firstName, plateNumber, reason } = await req.json()

        if (!email || !firstName || !plateNumber || !reason) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

        await sendEmail({
            to: email,
            subject: `Vehicle Registration Update — Plate ${plateNumber}`,
            html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;line-height:1.6">
          <div style="background:#1e3a5f;padding:32px 40px;border-radius:12px 12px 0 0">
            <h1 style="color:#fff;margin:0;font-size:24px">Vehicle Registration Update</h1>
            <p style="color:#a8c4e0;margin:8px 0 0;font-size:15px">Northfields Executive Village Homeowners' Association</p>
          </div>
          <div style="background:#fff;padding:32px 40px;border:1px solid #e5e7eb;border-top:none">
            <p style="font-size:16px;color:#1f2937">Hi <strong>${firstName}</strong>,</p>
            <p style="color:#374151">Your vehicle registration request for plate <strong>${plateNumber}</strong> could not be approved at this time.</p>

            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin:20px 0">
              <p style="margin:0;color:#991b1b;font-size:14px;font-weight:600">Reason:</p>
              <p style="margin:8px 0 0;color:#7f1d1d;font-size:15px">${reason}</p>
            </div>

            <p style="color:#374151">If you believe this is an error or would like to resubmit with the correct documents, please use the app or visit the HOA office.</p>

            <div style="text-align:center;margin:32px 0">
              <a href="${siteUrl}/vehicles" style="background:#1e3a5f;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block">Resubmit Registration</a>
            </div>

            <p style="color:#374151">Regards,<br><strong>NEVHA Administration</strong></p>
          </div>
          <div style="background:#f9fafb;padding:16px 40px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
            <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center">Northfields Executive Village HOA • This is an automated message.</p>
          </div>
        </div>
      `,
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error("[email/vehicle-rejected]", err?.message)
        return NextResponse.json({ error: err?.message }, { status: 500 })
    }
}
