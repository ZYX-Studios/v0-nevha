import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { createHmac } from "crypto"

// Simple base64url helpers
function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function getSecret() {
  const s = process.env.ADMIN_ACCESS_KEY || process.env.RESIDENT_VERIFICATION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error("Missing ADMIN_ACCESS_KEY")
  return s
}

function signResidentToken(payload: any) {
  const header = { v: 1 }
  const body = { ...payload }
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(body))}`
  const mac = createHmac("sha256", getSecret()).update(unsigned).digest()
  const sig = b64url(mac)
  return `v1.${unsigned}.${sig}`
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") || "").trim()

    if (q.length < 3) {
      return NextResponse.json({ items: [] }, { status: 200 })
    }

    const supabase = createAdminClient()

    // Query homeowners by full_name or first/last
    const like = `%${q}%`
    const { data: homeowners, error: e1 } = await supabase
      .from("homeowners")
      .select("id, full_name, first_name, last_name")
      .or([
        `full_name.ilike.${like}`,
        `first_name.ilike.${like}`,
        `last_name.ilike.${like}`,
      ].join(","))
      .order("full_name", { ascending: true })
      .limit(10)
    if (e1) return NextResponse.json({ error: e1.message }, { status: 400 })

    type Candidate = { name: string; type: "homeowner"; id: string }
    const results: Candidate[] = []

    for (const row of homeowners || []) {
      const name = (row as any).full_name || [((row as any).first_name || ""), ((row as any).last_name || "")].filter(Boolean).join(" ")
      if (!name) continue
      results.push({ name, type: "homeowner", id: (row as any).id })
    }

    // Deduplicate by name (keep first occurrence)
    const seen = new Set<string>()
    const unique: Candidate[] = []
    for (const r of results) {
      const key = r.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(r)
    }

    // Build signed tokens, limit to 8 items max
    const now = Date.now()
    const expMs = now + 24 * 60 * 60 * 1000 // 24h to tolerate offline queue
    const items = unique.slice(0, 8).map((r) => {
      const token = signResidentToken({ t: r.type, id: r.id, n: r.name, iat: now, exp: expMs })
      return { name: r.name, token }
    })

    return NextResponse.json({ items }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
