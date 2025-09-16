import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const nowIso = new Date().toISOString()

    // Fetch published announcements; apply date windows in JS to avoid chained or() limitations
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      // Do not pre-filter by is_published so we can include PRD-style published_at-only rows
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("publish_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const now = new Date(nowIso)
    const items = (data || [])
      .filter((row: any) => {
        const pd = row.publish_date ? new Date(row.publish_date) : null
        const pad = row.published_at ? new Date(row.published_at) : null
        const ed = row.expiry_date ? new Date(row.expiry_date) : null
        const publishedReached = (row.is_published && (!pd || pd <= now)) || (!!pad && pad <= now)
        const notExpired = !ed || ed > now
        return publishedReached && notExpired
      })
      .map((row: any) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        priority: row.priority || "normal",
        isPublished: row.is_published || !!row.published_at,
        publishDate: row.publish_date || row.published_at,
        expiryDate: row.expiry_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))

    return NextResponse.json({ items }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
