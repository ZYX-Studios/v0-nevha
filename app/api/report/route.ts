import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/resend"
import { createHmac, timingSafeEqual } from "crypto"

function generateRefCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let body = ""
  for (let i = 0; i < 8; i++) body += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `REF-${body}`
}

// --- Verification helpers (must match app/api/residents/search/route.ts) ---
function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}
function fromB64url(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4))
  const str = input.replace(/-/g, "+").replace(/_/g, "/") + pad
  return Buffer.from(str, "base64")
}
function getSecret() {
  const s = process.env.ADMIN_ACCESS_KEY || process.env.RESIDENT_VERIFICATION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error("Missing ADMIN_ACCESS_KEY")
  return s
}
function constantTimeEqStr(a: string, b: string) {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}
function verifyResidentToken(token: string): { t: string; id: string; n: string; iat: number; exp: number } {
  if (!token || typeof token !== "string") throw new Error("missing")
  const parts = token.split(".")
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("format")
  const [, h, p, sig] = parts
  const unsigned = `${h}.${p}`
  const mac = createHmac("sha256", getSecret()).update(unsigned).digest()
  const expected = b64url(mac)
  const ok = constantTimeEqStr(sig, expected)
  if (!ok) throw new Error("bad_sig")
  const payloadRaw = fromB64url(p).toString("utf8")
  const payload = JSON.parse(payloadRaw)
  if (!payload || typeof payload.exp !== "number" || Date.now() > payload.exp) throw new Error("expired")
  return payload
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const payload = await req.json().catch(() => ({}))
    const verifiedToken = String(payload?.verified_resident_token || "").trim()
    const rawTitle = (payload?.title || "").trim()
    const description = (payload?.description || "").trim()
    const category = (payload?.category || "").trim()
    const priority = payload?.priority || "P3"
    const location_text = (payload?.location_text || payload?.location || "").trim() || null
    // New reporter fields from public form
    const reporter_full_name = (payload?.reporter_full_name || "").trim() || null
    const reporter_phone = (payload?.reporter_phone || "").trim() || null
    const reporter_email = (payload?.reporter_email || "").trim() || null
    const reporter_block = (payload?.reporter_block || "").trim() || null
    const reporter_lot = (payload?.reporter_lot || "").trim() || null
    const reporter_phase = (payload?.reporter_phase || "").trim() || null
    const reporter_street = (payload?.reporter_street || "").trim() || null
    const suggested_solution = (payload?.suggested_solution || "").trim() || null
    const acknowledged = Boolean(payload?.acknowledged)

    if (!description || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    if (!acknowledged) {
      return NextResponse.json({ error: "Please acknowledge the terms before submitting." }, { status: 400 })
    }

    // Enforce verified resident token
    if (!verifiedToken) {
      return NextResponse.json({ error: "Resident verification required" }, { status: 403 })
    }
    let proof
    try {
      proof = verifyResidentToken(verifiedToken)
    } catch (e) {
      return NextResponse.json({ error: "Invalid or expired verification" }, { status: 403 })
    }
    const submittedName = (reporter_full_name || "").trim()
    const tokenName = String(proof.n || "").trim()
    if (!submittedName || submittedName.toLowerCase() !== tokenName.toLowerCase()) {
      return NextResponse.json({ error: "Verified name does not match submission" }, { status: 403 })
    }

    const title = rawTitle || (category ? `${category} Concern` : "Community Concern")

    const priorityMap: Record<string, "P1"|"P2"|"P3"|"P4"> = {
      p1: "P1",
      p2: "P2",
      p3: "P3",
      p4: "P4",
      urgent: "P1",
      high: "P2",
      normal: "P3",
      low: "P4",
    }
    const finalPriority = priorityMap[String(priority).toLowerCase()] || "P3"

    // Attempt insert with a unique ref_code; retry a few times if collision occurs
    let ref_code = generateRefCode()
    let attempt = 0
    const maxAttempts = 3
    let lastError: string | null = null

    while (attempt < maxAttempts) {
      const { error } = await supabase.from("issues").insert({
        title,
        description,
        category,
        priority: finalPriority,
        status: "NEW",
        location_text,
        ref_code,
        reporter_id: null,
        assigned_to: null,
        reporter_full_name,
        reporter_phone,
        reporter_email,
        reporter_block,
        reporter_lot,
        reporter_phase,
        reporter_street,
        suggested_solution,
        acknowledged,
      })

      if (!error) {
        // Attempt to link issue to department (category -> departments.name), skipping when "Others"
        try {
          const { data: depts } = await supabase
            .from("departments")
            .select("id,name,email,is_active")
            .eq("is_active", true)
          const dept = (depts || []).find((d: any) => String(d.name || "").toLowerCase() === category.toLowerCase())

          if (dept && category.toLowerCase() !== "others") {
            const { data: issueRow } = await supabase
              .from("issues")
              .select("id")
              .eq("ref_code", ref_code)
              .maybeSingle()
            if (issueRow?.id) {
              await supabase
                .from("issue_departments")
                .upsert({ issue_id: issueRow.id as string, department_id: dept.id as string }, { onConflict: "issue_id,department_id" })
            }
          }

          // Attempt to email the mapped department (support multiple recipients via comma/semicolon-separated list)
          if (dept?.email) {
            const recipients = String(dept.email)
              .split(/[;,]/)
              .map((s) => s.trim())
              .filter((s) => !!s)
            const uniqueRecipients = Array.from(new Set(recipients))
            const html = `
              <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.5;">
                <h2 style="margin:0 0 8px;">New Issue Reported</h2>
                <p style="margin:0 0 12px;">Reference Code: <strong>${ref_code}</strong></p>
                <p style="margin:0 0 6px;"><strong>Title:</strong> ${title}</p>
                <p style="margin:0 0 6px;"><strong>Category:</strong> ${category}</p>
                <p style="margin:0 0 6px;"><strong>Priority:</strong> ${finalPriority}</p>
                <p style="margin:12px 0 6px;"><strong>Description</strong></p>
                <div style="white-space:pre-wrap;">${description.replace(/</g, "&lt;")}</div>
                <hr style="margin:16px 0;border:none;border-top:1px solid #eee;" />
                <p style="margin:0 0 4px;"><strong>Reporter:</strong> ${reporter_full_name || "N/A"}</p>
                <p style="margin:0 0 4px;"><strong>Phone:</strong> ${reporter_phone || "N/A"}</p>
                <p style="margin:0 0 4px;"><strong>Email:</strong> ${reporter_email || "N/A"}</p>
                <p style="margin:12px 0 0;">Open in Admin: <a href="${process.env.NEXT_PUBLIC_SITE_URL || ""}/admin/issues" target="_blank" rel="noopener noreferrer">Issues</a></p>
              </div>
            `
            if (uniqueRecipients.length > 0) {
              await sendEmail({
                to: uniqueRecipients,
                subject: `New Issue Reported: ${title} (${ref_code})`,
                html,
                replyTo: reporter_email || undefined,
              })
            }
          }
        } catch (e) {
          // Non-fatal: logging only
          console.warn("Post-insert side effects failed:", (e as any)?.message || e)
        }

        return NextResponse.json({ ref_code }, { status: 201 })
      }

      // If unique violation on ref_code, try again, otherwise fail
      lastError = error.message
      if (error.message?.toLowerCase().includes("unique")) {
        ref_code = generateRefCode()
        attempt++
        continue
      }

      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: lastError || "Failed to create issue" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
