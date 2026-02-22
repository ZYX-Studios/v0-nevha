import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/resend"

/**
 * POST /api/email/vehicle-approved
 * Called fire-and-forget from the vehicle approve endpoint.
 */
export async function POST(req: NextRequest) {
    try {
        const { email, firstName, plateNumber, stickerCode } = await req.json()

        if (!email || !firstName || !plateNumber || !stickerCode) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

        await sendEmail({
            to: email,
            subject: `🚗 Vehicle Registration Approved — Sticker Code: ${stickerCode}`,
            html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;line-height:1.6">
          <div style="background:#1e3a5f;padding:32px 40px;border-radius:12px 12px 0 0">
            <h1 style="color:#fff;margin:0;font-size:24px">Vehicle Registration Approved</h1>
            <p style="color:#a8c4e0;margin:8px 0 0;font-size:15px">Northfields Executive Village Homeowners' Association</p>
          </div>
          <div style="background:#fff;padding:32px 40px;border:1px solid #e5e7eb;border-top:none">
            <p style="font-size:16px;color:#1f2937">Hi <strong>${firstName}</strong>,</p>
            <p style="color:#374151">Your vehicle registration has been <strong style="color:#16a34a">approved</strong>. Below are your sticker details.</p>
            
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:24px;margin:24px 0;text-align:center">
              <p style="margin:0;color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Your CAR STICKER CODE</p>
              <p style="margin:12px 0;color:#1e3a5f;font-size:32px;font-weight:800;letter-spacing:0.15em;font-family:monospace">${stickerCode}</p>
              <p style="margin:0;color:#6b7280;font-size:13px">Plate Number: <strong>${plateNumber}</strong></p>
            </div>

            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0">
              <p style="margin:0;color:#92400e;font-size:14px"><strong>⚠️ Next Steps:</strong></p>
              <ol style="color:#78350f;padding-left:20px;margin:8px 0 0">
                <li>Complete payment of the car sticker fee through the app under <strong>Bills</strong></li>
                <li>Visit the HOA office with this code to receive your physical sticker</li>
                <li>Affix the sticker to your vehicle's windshield (bottom-left corner)</li>
              </ol>
            </div>

            <div style="text-align:center;margin:32px 0">
              <a href="${siteUrl}/bills" style="background:#1e3a5f;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block">Pay Sticker Fee</a>
            </div>

            <p style="color:#374151">Regards,<br><strong>NEVHA Administration</strong></p>
          </div>
          <div style="background:#f9fafb;padding:16px 40px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
            <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center">Northfields Executive Village HOA • Sticker code: ${stickerCode}</p>
          </div>
        </div>
      `,
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error("[email/vehicle-approved]", err?.message)
        return NextResponse.json({ error: err?.message }, { status: 500 })
    }
}
