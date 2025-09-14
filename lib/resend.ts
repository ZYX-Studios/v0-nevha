export type SendEmailParams = {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

/**
 * Minimal Resend email sender using the REST API to avoid adding new deps.
 * Requires RESEND_API_KEY in env. Optionally RESEND_FROM for default sender.
 */
export async function sendEmail({ to, subject, html, from }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set; skipping email send")
    return { skipped: true }
  }
  const payload = {
    from: from || process.env.RESEND_FROM || "Nevha HOA <no-reply@nevha.local>",
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
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
