export type SendEmailParams = {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

/**
 * Minimal Resend email sender using the REST API to avoid adding new deps.
 * Requires RESEND_API_KEY in env. Optionally RESEND_FROM for default sender.
 */
export async function sendEmail({ to, subject, html, from, replyTo }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set; skipping email send")
    return { skipped: true }
  }
  const originalTo = Array.isArray(to) ? to : [to]
  const redirectTo = (process.env.EMAIL_REDIRECT_TO || "").trim()
  const finalTo = redirectTo ? [redirectTo] : originalTo

  const annotatedHtml = redirectTo
    ? `
      <div style="padding:12px;border:1px dashed #888;margin-bottom:12px;color:#444;font-size:12px;">
        <strong>Test Redirect:</strong> EMAIL_REDIRECT_TO is set, so this email was redirected for safety.<br />
        <strong>Original recipients:</strong> ${originalTo.map((r) => String(r)).join(", ")}
      </div>
      ${html}
    `
    : html

  const payload: Record<string, any> = {
    from: from || process.env.RESEND_FROM || "Nevha HOA <onboarding@resend.dev>",
    to: finalTo,
    subject,
    html: annotatedHtml,
  }
  const fallbackReplyTo = (process.env.RESEND_REPLY_TO || process.env.REPLY_TO || "").trim()
  if (replyTo || fallbackReplyTo) {
    payload.reply_to = replyTo || fallbackReplyTo
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.warn("Resend sendEmail failed:", res.status, text)
    return { ok: false, status: res.status, body: text }
  }
  const data = await res.json().catch(() => ({}))
  return { ok: true, data }
}
