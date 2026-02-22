import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/resend"
import { requireAdminAPI } from "@/lib/supabase/guards"

export async function GET(req: Request) {


  try {
    const url = new URL(req.url)
    const key = url.searchParams.get("key")
    const requiredKey = process.env.ADMIN_ACCESS_KEY
    if (requiredKey && key !== requiredKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const to = (url.searchParams.get("to") || process.env.EMAIL_REDIRECT_TO || "").trim()
    const subject = (url.searchParams.get("subject") || "Nevha Email Test").trim()
    const body = (url.searchParams.get("body") || "This is a test email from Nevha.").trim()

    if (!to && !process.env.EMAIL_REDIRECT_TO) {
      return NextResponse.json({ error: "Provide ?to= or set EMAIL_REDIRECT_TO" }, { status: 400 })
    }

    const result = await sendEmail({
      to: to || "placeholder@resend.dev",
      subject,
      html: `<div style="font-family:system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.5">
        <h2 style="margin:0 0 8px;">Nevha Email Test</h2>
        <p style="margin:0 0 12px;">${body}</p>
        <p style="margin-top:12px;color:#666;font-size:12px;">If EMAIL_REDIRECT_TO is set, this email was redirected for safe testing.</p>
      </div>`,
    })

    return NextResponse.json({ ok: true, redirectedTo: !!process.env.EMAIL_REDIRECT_TO, result }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {


  try {
    const url = new URL(req.url)
    const key = url.searchParams.get("key")
    const requiredKey = process.env.ADMIN_ACCESS_KEY
    if (requiredKey && key !== requiredKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await req.json().catch(() => ({}))
    const to = (payload?.to || process.env.EMAIL_REDIRECT_TO || "").trim()
    const subject = (payload?.subject || "Nevha Email Test").trim()
    const html = (payload?.html || "<p>This is a test email from Nevha.</p>").trim()

    if (!to && !process.env.EMAIL_REDIRECT_TO) {
      return NextResponse.json({ error: "Provide 'to' in body or set EMAIL_REDIRECT_TO" }, { status: 400 })
    }

    const result = await sendEmail({ to: to || "placeholder@resend.dev", subject, html })
    return NextResponse.json({ ok: true, redirectedTo: !!process.env.EMAIL_REDIRECT_TO, result }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
