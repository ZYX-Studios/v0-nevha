import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function generateRefCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let body = ""
  for (let i = 0; i < 8; i++) body += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `REF-${body}`
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const payload = await req.json().catch(() => ({}))
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

    const title = rawTitle || (category ? `${category} Concern` : "Community Concern")

    const allowedPriorities = ["P1", "P2", "P3", "P4", "low", "normal", "high", "urgent"]
    const finalPriority = allowedPriorities.includes(priority) ? priority : "P3"

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
