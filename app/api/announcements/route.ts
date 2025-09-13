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
      .eq("is_published", true)
      .order("publish_date", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const now = new Date(nowIso)
    const items = (data || [])
      .filter((row: any) => {
        const pd = row.publish_date ? new Date(row.publish_date) : null
        const ed = row.expiry_date ? new Date(row.expiry_date) : null
        const publishedReached = !pd || pd <= now
        const notExpired = !ed || ed > now
        return publishedReached && notExpired
      })
      .map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      priority: row.priority || "normal",
      isPublished: row.is_published,
      publishDate: row.publish_date,
      expiryDate: row.expiry_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ items }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
